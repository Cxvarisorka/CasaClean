// Invoice domain service
// ----------------------
// Owns the whole lifecycle of a customer invoice: turning a paid booking into
// an immutable numbered document, rendering it as a PDF, and emailing it.
//
// Two rules shape everything here:
//
//   1. ISSUING IS IDEMPOTENT. A payment can be promoted twice (the client's
//      finalize call races Stripe's webhook), so `issueInvoiceForBooking` must
//      be safe to call repeatedly — the unique `booking` index is the guarantee,
//      and a duplicate-key collision resolves to the existing invoice rather
//      than erroring.
//
//   2. INVOICING NEVER BREAKS A PAID BOOKING. By the time any of this runs the
//      money has moved and the reservation exists. A failure to number, render
//      or send must therefore be contained: `issueAndDeliverInvoice` falls all
//      the way back to the plain booking-confirmation email, so the worst case
//      is the customer getting exactly the email they got before this feature
//      existed — never no email, and never a failed webhook.

const Sentry = require('@sentry/node');

const Booking = require('../models/booking.model');
const Counter = require('../models/counter.model');
const Invoice = require('../models/invoice.model');

const AppError = require('../utils/appError.util');
const sendEmail = require('../utils/email.util');
const {
  getSeller,
  getVatRate,
  getNumberPrefix,
  roundMoney,
  splitVatInclusive,
  formatInvoiceNumber,
  formatEuro,
  formatDateLong
} = require('../utils/invoice.util');
const { renderInvoicePdf, invoiceFileName } = require('../utils/invoicePdf.util');
// Durations are total minutes; formatDuration keeps raw minute counts out of
// the document, and durationInMinutes reads legacy `hours` records too.
const { formatDuration, durationInMinutes } = require('../utils/duration.util');
const { renderBookingConfirmationEmail } = require('./booking.service');

// Escape user-provided values before interpolating them into the HTML email so
// a name or address can never inject markup.
const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/* ------------------------------------------------------------- issuing ---- */

/** Load a booking with everything an invoice snapshot needs, in one round trip. */
const loadBookingForInvoice = (bookingId) =>
  Booking.findById(bookingId)
    .populate('serviceId', 'name')
    .populate('cityId', 'name')
    .populate('specialRequests', 'name price')
    .populate('cleaningTools', 'name price')
    .populate('user', 'fullname email phone')
    .lean();

/**
 * The tax figures an invoice is built from.
 *
 * `netAmount` is the discriminator: it has no schema default, so its absence
 * means a booking priced before VAT handling existed. A priced booking carries
 * its own snapshot — what the customer was actually charged — and is never
 * re-read from the configured rate, which may have changed since. A legacy one
 * has only the total that was charged, so its net is derived out of it (the
 * pre-VAT behaviour), and its catalogue line prices have to be divided down to
 * match, since today's catalogue prices are net.
 */
const invoiceTaxFigures = (booking) => {
  const priced = booking.tax?.netAmount !== undefined && booking.tax?.netAmount !== null;

  if (priced) {
    return {
      net: roundMoney(booking.tax.netAmount),
      vat: roundMoney(booking.tax.vatAmount || 0),
      gross: roundMoney(booking.totalAmount),
      vatRate: booking.tax.vatRate || 0,
      // Catalogue prices are net and the invoice states its items net, so a
      // priced booking's lines are printed exactly as the catalogue holds them.
      lineDivisor: 1
    };
  }

  const vatRate = getVatRate();
  return {
    ...splitVatInclusive(booking.totalAmount, vatRate),
    vatRate,
    lineDivisor: vatRate > 0 ? 1 + vatRate / 100 : 1
  };
};

/**
 * Turn a booking into priced invoice lines.
 *
 * The add-on prices come from the catalogue documents, but the base service
 * charge is derived by SUBTRACTION (net subtotal − add-ons) rather than by
 * re-reading the service's current price. The booking's own figures are what the
 * customer was actually charged, and re-pricing here would let a service price
 * edit produce an invoice that disagrees with the payment.
 *
 * Lines are stated NET, because that is what the invoice's subtotal reads and
 * VAT is added under it — items that summed to the gross would leave the
 * document not adding up.
 *
 * If the arithmetic can't be reconciled (corrupt/legacy data where the add-ons
 * exceed the subtotal), fall back to a single line for the whole amount — an
 * invoice that adds up is worth more than an itemised one that doesn't.
 */
const buildLineItems = (booking, figures = invoiceTaxFigures(booking)) => {
  const total = roundMoney(figures.net);

  const divisor = figures.lineDivisor || 1;
  const linePrice = (price) => roundMoney((Number(price) || 0) / divisor);

  const addOns = [
    ...(booking.specialRequests || []).map((item) => ({
      description: item?.name || 'Special request',
      detail: 'Special request',
      quantity: 1,
      unitPrice: linePrice(item?.price),
      amount: linePrice(item?.price)
    })),
    ...(booking.cleaningTools || []).map((item) => ({
      description: item?.name || 'Cleaning tool',
      detail: 'Cleaning tool',
      quantity: 1,
      unitPrice: linePrice(item?.price),
      amount: linePrice(item?.price)
    }))
  ];

  const addOnTotal = roundMoney(addOns.reduce((sum, item) => sum + item.amount, 0));
  const base = roundMoney(total - addOnTotal);
  const minutes = durationInMinutes(booking);

  if (!(base >= 0) || !(minutes > 0)) {
    return [
      {
        description: booking.serviceId?.name || 'Cleaning service',
        detail: '',
        quantity: 1,
        unitPrice: total,
        amount: total
      }
    ];
  }

  const cleaners = Number(booking.cleaners);
  return [
    {
      description: booking.serviceId?.name || 'Cleaning service',
      detail: `${formatDuration(minutes)} × ${cleaners} cleaner${cleaners === 1 ? '' : 's'}`,
      // One unit, priced at the whole labour charge. A duration is an exact
      // number of minutes, so cleaner-HOURS is no longer a whole quantity (1 h
      // 25 min × 1 cleaner is 1.4166…) and a qty/unit-price pair built from it
      // would print a rounded unit that doesn't multiply back to the amount.
      // The length and crew that produced the figure are stated in `detail`
      // instead, where they can be exact.
      quantity: 1,
      unitPrice: base,
      amount: base
    },
    ...addOns
  ];
};

/** Reserve the next number in this year's series. */
const nextInvoiceNumber = async (issuedAt) => {
  const series = String(issuedAt.getUTCFullYear());
  const sequence = await Counter.next(`invoice:${series}`);
  return { number: formatInvoiceNumber(getNumberPrefix(), series, sequence), series, sequence };
};

/** Build the full (unsaved) invoice snapshot for a loaded booking. */
const buildInvoiceSnapshot = (booking, { number, series, sequence, issuedAt }) => {
  // One set of figures for the totals block and the lines, so the items can
  // never sum to something other than the subtotal they sit above.
  const figures = invoiceTaxFigures(booking);
  const { net, vat, gross, vatRate } = figures;
  const lineItems = buildLineItems(booking, figures);

  const reverseCharge = booking.tax?.treatment === 'reverse-charge';
  const address = [booking.streetName, booking.houseNumber].filter(Boolean).join(' ');
  const refunded = booking.paymentStatus === 'refunded';

  return {
    number,
    series,
    sequence,
    booking: booking._id,
    subscription: booking.subscriptionId || undefined,
    user: booking.user?._id || booking.user || undefined,
    status: refunded ? 'refunded' : 'issued',
    issuedAt,
    refundedAt: refunded ? booking.refundedAt || new Date() : undefined,
    seller: getSeller(),
    customer: {
      // A business invoice is addressed to the registered company; the contact's
      // own name stays on the booking, not on the tax document.
      name:
        booking.tax?.companyName ||
        booking.customerName ||
        booking.user?.fullname ||
        '',
      email: booking.customerEmail || booking.user?.email || '',
      phone: booking.customerPhone || booking.user?.phone || '',
      addressLines: [address, booking.cityId?.name].filter(Boolean),
      // Printed under the reverse charge — both parties' VAT numbers have to
      // appear on the document for the relief to be substantiated.
      vatNumber: booking.tax?.vatNumber || ''
    },
    service: {
      name: booking.serviceId?.name || 'Cleaning service',
      city: booking.cityId?.name || '',
      date: booking.bookingDate || '',
      time: booking.bookingTime || '',
      durationMinutes: durationInMinutes(booking),
      cleaners: booking.cleaners
    },
    lineItems,
    currency: booking.currency || 'eur',
    reverseCharge,
    subtotal: net,
    vatRate,
    vatAmount: vat,
    total: gross,
    paymentMethod: booking.paymentMethod || 'card',
    paymentIntentId: booking.paymentIntentId || '',
    paidAt: booking.paidAt || undefined
  };
};

/**
 * Issue (or return the already-issued) invoice for a booking.
 *
 * @param {string|Object} bookingId
 * @returns {Promise<Object>} the Invoice document
 * @throws {AppError} when the booking doesn't exist or was never paid
 */
const issueInvoiceForBooking = async (bookingId) => {
  const existing = await Invoice.findOne({ booking: bookingId });
  if (existing) return existing;

  const booking = await loadBookingForInvoice(bookingId);
  if (!booking) throw new AppError('Booking not found.', 404);

  // 'unpaid' is the only state with nothing to invoice. 'manual' covers an
  // offline/cash booking an admin entered, and 'refunded' is invoiced too so a
  // historical booking can still be documented — with the refund on its face.
  // 'partially-refunded' (a late cancellation that kept the one-hour fee) is
  // invoiced as issued: money was charged and kept, so the document stands.
  if (!['paid', 'manual', 'refunded', 'partially-refunded'].includes(booking.paymentStatus)) {
    throw new AppError('This booking has not been paid, so it cannot be invoiced.', 400);
  }

  const issuedAt = new Date();
  const numbering = await nextInvoiceNumber(issuedAt);

  try {
    return await Invoice.create(buildInvoiceSnapshot(booking, { ...numbering, issuedAt }));
  } catch (err) {
    // Concurrent issue (finalize + webhook race): the unique `booking` index
    // rejects the loser. Resolve to the winner — a booking has one invoice.
    if (err.code === 11000) {
      const winner = await Invoice.findOne({ booking: bookingId });
      if (winner) return winner;
    }
    throw err;
  }
};

/**
 * Stamp an invoice as refunded when its booking's charge is reversed. Scoped to
 * `status: 'issued'` so re-delivered refund events are no-ops.
 */
const markInvoiceRefunded = async (bookingId, refundedAt = new Date()) =>
  Invoice.findOneAndUpdate(
    { booking: bookingId, status: 'issued' },
    { $set: { status: 'refunded', refundedAt } },
    { returnDocument: 'after' }
  );

/* ------------------------------------------------------ email rendering ---- */

const detailRow = (label, value) => `
        <tr>
          <td style="padding:9px 0;color:#64748b;font-size:13.5px;">${escapeHtml(label)}</td>
          <td style="padding:9px 0;color:#0f172a;font-size:13.5px;font-weight:600;text-align:right;">${escapeHtml(value)}</td>
        </tr>`;

const lineItemRow = (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
            <div style="color:#0f172a;font-size:13.5px;font-weight:600;">${escapeHtml(item.description)}</div>
            ${item.detail ? `<div style="color:#94a3b8;font-size:12px;margin-top:2px;">${escapeHtml(item.detail)}</div>` : ''}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13.5px;text-align:right;white-space:nowrap;">${escapeHtml(formatEuro(item.amount))}</td>
        </tr>`;

/**
 * The single email a customer receives after a successful payment: the booking
 * confirmation AND the invoice, with the PDF attached. Deliberately one email
 * rather than two — a confirmation followed by a near-identical receipt reads
 * as a system glitch.
 */
const renderInvoiceEmail = (invoice) => {
  const recurring = Boolean(invoice.subscription);
  const refunded = invoice.status === 'refunded';
  const name = invoice.customer?.name || 'there';
  const service = invoice.service || {};
  const address = (invoice.customer?.addressLines || []).join(', ');
  const total = formatEuro(invoice.total);

  const subject = refunded
    ? `CasaClean — Invoice ${invoice.number} (refunded)`
    : `CasaClean — Invoice ${invoice.number} · your booking is confirmed`;

  const details = [
    ['Invoice number', invoice.number],
    ['Issue date', formatDateLong(invoice.issuedAt)],
    ['Service', service.name || 'Cleaning service'],
    ['Date', service.date ? formatDateLong(service.date) : '—'],
    ['Time', service.time || '—'],
    ['Duration', `${formatDuration(durationInMinutes(service))} · ${service.cleaners ?? '—'} cleaner(s)`],
    ['Address', address || '—'],
    ...(recurring ? [['Plan', 'Recurring service']] : [])
  ];

  const totalsRows = [
    ...(invoice.vatRate > 0
      ? [
          ['Subtotal (net)', formatEuro(invoice.subtotal)],
          [`VAT ${invoice.vatRate}%`, formatEuro(invoice.vatAmount)]
        ]
      : invoice.reverseCharge
        ? [
            ['Subtotal (net)', formatEuro(invoice.subtotal)],
            ['VAT — reverse charge', formatEuro(0)]
          ]
        : []),
    [refunded ? 'Total refunded' : 'Total paid', total]
  ];

  // The statutory B2B wording. It belongs in the email body too — a customer who
  // never opens the attachment still needs to see why there is no VAT.
  const reverseChargeNote = invoice.reverseCharge
    ? 'No VAT has been charged. VAT is to be accounted for by the recipient under the reverse charge procedure (Article 196, Council Directive 2006/112/EC).'
    : '';

  const totalsHtml = totalsRows
    .map(([label, value], index) => {
      const last = index === totalsRows.length - 1;
      return `
        <tr>
          <td style="padding:${last ? '14px 0 0' : '6px 0'};color:${last ? '#0f766e' : '#64748b'};font-size:${last ? '15px' : '13.5px'};font-weight:${last ? '700' : '400'};">${escapeHtml(label)}</td>
          <td style="padding:${last ? '14px 0 0' : '6px 0'};color:${last ? '#0f766e' : '#0f172a'};font-size:${last ? '19px' : '13.5px'};font-weight:${last ? '700' : '600'};text-align:right;">${escapeHtml(value)}</td>
        </tr>`;
    })
    .join('');

  const intro = refunded
    ? 'This invoice has been refunded. The amount below has been returned to your original payment method.'
    : recurring
      ? 'Your recurring cleaning has been charged and the next visit is confirmed. The invoice is attached to this email as a PDF.'
      : 'Your payment has been received and your booking is confirmed. The invoice is attached to this email as a PDF.';

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.08);">
            <tr>
              <td style="background-color:#0f766e;padding:30px 40px;text-align:center;">
                <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">CasaClean</div>
                <div style="color:#99f6e4;font-size:14px;margin-top:4px;">Invoice ${escapeHtml(invoice.number)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 40px 6px;text-align:center;">
                <div style="width:54px;height:54px;line-height:54px;border-radius:27px;background-color:${refunded ? '#fef2f2' : '#ecfdf5'};color:${refunded ? '#dc2626' : '#0d9488'};font-size:26px;margin:0 auto;">${refunded ? '&#8617;' : '&#10003;'}</div>
                <h1 style="margin:18px 0 6px;color:#0f172a;font-size:22px;font-weight:700;">Thank you, ${escapeHtml(name)}!</h1>
                <p style="margin:0;color:#64748b;font-size:15px;line-height:1.6;">${escapeHtml(intro)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 40px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
                  ${details.map(([label, value]) => detailRow(label, value)).join('')}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 0;">
                <div style="color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:1.2px;">ITEMS</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                  ${(invoice.lineItems || []).map(lineItemRow).join('')}
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">
                  ${totalsHtml}
                </table>
                ${
                  reverseChargeNote
                    ? `<p style="margin:16px 0 0;padding:12px 14px;background-color:#f0fdfa;border-radius:10px;color:#0f766e;font-size:12px;line-height:1.6;">
                  ${escapeHtml(reverseChargeNote)}${invoice.customer?.vatNumber ? ` Customer VAT number ${escapeHtml(invoice.customer.vatNumber)}.` : ''}
                </p>`
                    : ''
                }
              </td>
            </tr>
            <tr>
              <td style="padding:26px 40px 34px;text-align:center;">
                <p style="margin:0 0 10px;color:#64748b;font-size:13px;line-height:1.6;">
                  A PDF copy of invoice <strong>${escapeHtml(invoice.number)}</strong> is attached for your records.
                </p>
                <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                  Need to make a change? Just reply to this email and our team will help.<br />
                  &copy; ${new Date().getFullYear()} ${escapeHtml(invoice.seller?.name || 'CasaClean')}. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text =
    `Hello ${name},\n\n` +
    `${intro}\n\n` +
    details.map(([label, value]) => `${label.padEnd(16)}${value}`).join('\n') +
    `\n\n` +
    (invoice.lineItems || [])
      .map((item) => `  ${item.description}${item.detail ? ` (${item.detail})` : ''}  ${formatEuro(item.amount)}`)
      .join('\n') +
    `\n\n` +
    totalsRows.map(([label, value]) => `${label.padEnd(22)}${value}`).join('\n') +
    (reverseChargeNote ? `\n\n${reverseChargeNote}` : '') +
    `\n\nA PDF copy of invoice ${invoice.number} is attached.\n\n— ${invoice.seller?.name || 'CasaClean'}`;

  return { subject, html, text };
};

/* ---------------------------------------------------------- delivery ------ */

/**
 * Render an invoice and email it to the customer with the PDF attached.
 * Records the send on the invoice so the panel can show delivery state.
 *
 * Throws on failure — callers decide whether that matters (the automatic path
 * swallows it, the admin "resend" endpoint surfaces it).
 *
 * @param {Object} invoice  Invoice document
 * @param {string} [to]     override recipient (defaults to the snapshot's email)
 */
const deliverInvoiceEmail = async (invoice, to = null) => {
  const recipient = to || invoice.customer?.email;
  if (!recipient) throw new AppError('This invoice has no customer email address.', 400);

  const pdf = await renderInvoicePdf(invoice);
  const { subject, html, text } = renderInvoiceEmail(invoice);

  await sendEmail({
    email: recipient,
    subject,
    html,
    text,
    attachments: [
      {
        filename: invoiceFileName(invoice),
        content: pdf,
        contentType: 'application/pdf'
      }
    ]
  });

  // findOneAndUpdate rather than updateOne so the stamped document comes back
  // from the same round trip. Callers that report delivery to an admin need the
  // fresh emailedAt/emailCount, and they used to get it with a second
  // Invoice.findById immediately after this call.
  const stamped = await Invoice.findOneAndUpdate(
    { _id: invoice._id },
    { $set: { emailedTo: recipient, emailedAt: new Date() }, $inc: { emailCount: 1 } },
    { returnDocument: 'after' }
  ).catch((err) => {
    // The customer has the invoice; failing to record that fact is a reporting
    // problem, not a delivery one.
    console.error('Invoice delivery stamp error:', err.message);
    return null;
  });

  // Fall back to the un-stamped input when the stamp itself failed — delivery
  // still succeeded, so this must not throw.
  return stamped || invoice;
};

/**
 * The automatic post-payment path: issue the invoice, email it with the PDF
 * attached, and never let any of it disturb the paid booking.
 *
 * On failure it falls back to the plain booking-confirmation email, so a
 * customer always hears that their booking is confirmed even if numbering,
 * rendering or the attachment failed. Fire-and-forget by design — this runs
 * inside the Stripe webhook and the finalize request, and a slow SMTP host must
 * not delay either response.
 *
 * @param {Object} booking  the freshly-paid Booking document
 * @param {Object} [fallback]  { customerName, serviceName, ... } for the plain
 *                             confirmation email if invoicing fails
 * @returns {Promise<Object|null>} the invoice, or null when the fallback ran
 */
const issueAndDeliverInvoice = async (booking, fallback = null) => {
  try {
    const invoice = await issueInvoiceForBooking(booking._id);
    await deliverInvoiceEmail(invoice);
    return invoice;
  } catch (err) {
    console.error(`Invoice delivery failed for booking ${booking?._id}:`, err.message);
    Sentry.captureException(err, {
      extra: { stage: 'issueAndDeliverInvoice', bookingId: String(booking?._id) }
    });

    // Degrade to the pre-invoice behaviour rather than leaving the customer
    // with no email at all.
    try {
      const source = fallback || booking;
      const { subject, html, text } = renderBookingConfirmationEmail({
        customerName: source.customerName,
        serviceName: source.serviceName,
        bookingDate: source.bookingDate,
        bookingTime: source.bookingTime,
        durationMinutes: source.durationMinutes,
        hours: source.hours,
        cleaners: source.cleaners,
        streetName: source.streetName,
        houseNumber: source.houseNumber,
        totalAmount: source.totalAmount,
        recurring: Boolean(booking?.subscriptionId)
      });
      await sendEmail({ email: source.customerEmail || booking.customerEmail, subject, html, text });
    } catch (fallbackErr) {
      console.error('Confirmation fallback email failed:', fallbackErr.message);
    }
    return null;
  }
};

module.exports = {
  invoiceTaxFigures,
  buildLineItems,
  buildInvoiceSnapshot,
  issueInvoiceForBooking,
  markInvoiceRefunded,
  renderInvoiceEmail,
  deliverInvoiceEmail,
  issueAndDeliverInvoice,
  loadBookingForInvoice
};
