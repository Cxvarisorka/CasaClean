// Invoice PDF renderer (pdfkit)
// -----------------------------
// Renders an Invoice document to a PDF buffer. This is the ONLY place an
// invoice becomes a printable document: the same buffer is attached to the
// customer's email and streamed to the admin panel's download button, so the
// copy in the customer's inbox and the copy the admin exports are byte-for-byte
// identical. There is no second renderer to drift out of sync.
//
// Everything drawn comes from the Invoice snapshot — this module never reads a
// Booking, a Service or the environment for content, only for fonts.
//
// Layout is a single A4 page with an explicit cursor (no reliance on pdfkit's
// flow position), because a financial document needs deterministic placement.

const fs = require('fs');
const PDFDocument = require('pdfkit');

const { formatEuro, formatDateLong } = require('./invoice.util');

/* ------------------------------------------------------------------ design */

// Mirrors the website/email palette (client/src/styles/globals.css and
// utils/emailTemplates.util.js) so a printed invoice is recognisably the same
// brand as the email it arrived in.
const C = {
  brand: '#0e8b81',
  brandDark: '#0f6f68',
  brandWash: '#e8f6f4',
  accent: '#f59e0b',
  ink: '#0e1424',
  inkSoft: '#3b4460',
  muted: '#737c96',
  ghost: '#c2c9d6',
  border: '#e6e9ef',
  canvas: '#f7f8fa',
  success: '#15803d',
  successWash: '#e7f6ec',
  danger: '#b91c1c',
  dangerWash: '#fdeaea',
  white: '#ffffff'
};

const PAGE = { width: 595.28, height: 841.89 };
const M = 48; // page margin
const CW = PAGE.width - M * 2; // content width

/* ------------------------------------------------------------------- fonts */

// pdfkit's built-in fonts are WinAnsi-encoded: they cannot represent Greek,
// Cyrillic or Georgian, and this product ships all three as UI languages — so a
// customer name like "გიორგი" would print as garbage. Embedding a TrueType font
// fixes it, but there is no font we can rely on being present, so probe for one
// and degrade honestly if nothing is found.
//
// Set INVOICE_FONT_PATH (+ INVOICE_FONT_BOLD_PATH) to pin a specific file.
const SYSTEM_FONT_PAIRS = [
  ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'],
  ['/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf', '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf'],
  ['/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'],
  ['/usr/share/fonts/dejavu/DejaVuSans.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'],
  ['/Library/Fonts/Arial Unicode.ttf', '/Library/Fonts/Arial Unicode.ttf'],
  ['C:\\Windows\\Fonts\\segoeui.ttf', 'C:\\Windows\\Fonts\\segoeuib.ttf'],
  ['C:\\Windows\\Fonts\\arial.ttf', 'C:\\Windows\\Fonts\\arialbd.ttf']
];

const readable = (file) => {
  if (!file) return false;
  try {
    fs.accessSync(file, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

let cachedFonts = null;

const resolveFonts = () => {
  if (cachedFonts) return cachedFonts;

  const configured = process.env.INVOICE_FONT_PATH;
  if (readable(configured)) {
    const boldPath = process.env.INVOICE_FONT_BOLD_PATH;
    cachedFonts = {
      regular: configured,
      bold: readable(boldPath) ? boldPath : configured,
      unicode: true
    };
    return cachedFonts;
  }

  for (const [regular, bold] of SYSTEM_FONT_PAIRS) {
    if (readable(regular)) {
      cachedFonts = { regular, bold: readable(bold) ? bold : regular, unicode: true };
      return cachedFonts;
    }
  }

  // Last resort: the built-in fonts. Text is sanitised on the way in so the
  // document still renders — just without non-Latin glyphs.
  cachedFonts = { regular: 'Helvetica', bold: 'Helvetica-Bold', unicode: false };
  return cachedFonts;
};

// Test seam: env-driven font selection is cached, so a test that changes
// INVOICE_FONT_PATH needs a way to drop the cache.
const resetFontCache = () => {
  cachedFonts = null;
};

/**
 * Make a string safe for the active font. With an embedded Unicode font this is
 * a pass-through; on the Helvetica fallback, accents are decomposed away
 * (Ana Sofía -> Ana Sofia) and anything still unrepresentable becomes "?" —
 * mangled beats throwing mid-render on a paid customer's invoice.
 */
const makeSafe = (unicode) => (value) => {
  const str = String(value ?? '');
  if (unicode) return str;
  return str
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\n\x20-\x7E\xA0-\xFF]/g, '?');
};

/* ------------------------------------------------------- drawing utilities */

// A tiny wrapper so the layout code below reads as a sequence of design
// decisions rather than pdfkit state juggling.
const painter = (doc, safe) => ({
  /** Draw a run of text and return the y just past it. */
  text(value, x, y, opts = {}) {
    const {
      font = 'inv-regular',
      size = 9.5,
      color = C.inkSoft,
      ...rest
    } = opts;
    doc.font(font).fontSize(size).fillColor(color).text(safe(value), x, y, rest);
    return doc.y;
  },
  rect(x, y, w, h, color, radius = 0) {
    if (radius) doc.roundedRect(x, y, w, h, radius).fill(color);
    else doc.rect(x, y, w, h).fill(color);
  },
  outline(x, y, w, h, color, radius = 0) {
    doc.lineWidth(0.75).strokeColor(color);
    if (radius) doc.roundedRect(x, y, w, h, radius).stroke();
    else doc.rect(x, y, w, h).stroke();
  },
  rule(x, y, w, color = C.border, width = 0.75) {
    doc.lineWidth(width).strokeColor(color).moveTo(x, y).lineTo(x + w, y).stroke();
  }
});

/**
 * A small filled pill (PAID / REFUNDED). Sized to its label and drawn from its
 * RIGHT edge, so it aligns with the right-hand meta column above it.
 */
const drawPill = (doc, p, { label, x, y, bg, fg }) => {
  const paddingX = 10;
  const width = doc.font('inv-bold').fontSize(8).widthOfString(label) + paddingX * 2;
  const height = 18;
  p.rect(x - width, y, width, height, bg, 9);
  p.text(label, x - width, y + 5.5, {
    font: 'inv-bold',
    size: 8,
    color: fg,
    width,
    align: 'center',
    characterSpacing: 0.8
  });
  return y + height;
};

/* ------------------------------------------------------------ page sections */

const drawHeader = (doc, p, invoice) => {
  // Full-bleed brand rule along the top edge.
  p.rect(0, 0, PAGE.width, 6, C.brand);

  let y = 56;

  // --- Left: wordmark, tagline, and who is billing -------------------------
  doc
    .font('inv-bold')
    .fontSize(21)
    .fillColor(C.brandDark)
    .text('Casa', M, y, { continued: true })
    .fillColor(C.accent)
    .text('Clean');

  y += 27;
  p.text('PROFESSIONAL CLEANING SERVICES', M, y, {
    size: 6.8,
    color: C.muted,
    characterSpacing: 1.4
  });

  y += 16;
  const seller = invoice.seller || {};
  const sellerLines = [
    seller.name,
    ...(seller.addressLines || []),
    seller.vatNumber ? `VAT ${seller.vatNumber}` : '',
    seller.registrationNumber ? `Reg. ${seller.registrationNumber}` : '',
    seller.email,
    seller.phone
  ].filter(Boolean);

  for (const line of sellerLines) {
    p.text(line, M, y, { size: 8.2, color: C.muted, width: 240 });
    y += 11;
  }

  // --- Right: the document's identity --------------------------------------
  const rightW = 210;
  const rightX = M + CW - rightW;
  let ry = 52;

  p.text('INVOICE', rightX, ry, {
    font: 'inv-bold',
    size: 27,
    color: C.ghost,
    width: rightW,
    align: 'right',
    characterSpacing: 1.5
  });
  ry += 40;

  const meta = [
    ['Invoice no.', invoice.number],
    ['Issue date', formatDateLong(invoice.issuedAt)],
    ['Booking ref', `CC-${String(invoice.booking || '').slice(-6).toUpperCase()}`]
  ];
  for (const [label, value] of meta) {
    p.text(label, rightX, ry, { size: 8.2, color: C.muted, width: rightW * 0.45 });
    p.text(value, rightX + rightW * 0.45, ry, {
      font: 'inv-bold',
      size: 8.8,
      color: C.ink,
      width: rightW * 0.55,
      align: 'right'
    });
    ry += 13;
  }

  ry += 4;
  const refunded = invoice.status === 'refunded';
  drawPill(doc, p, {
    label: refunded ? 'REFUNDED' : 'PAID',
    x: M + CW,
    y: ry,
    bg: refunded ? C.dangerWash : C.successWash,
    fg: refunded ? C.danger : C.success
  });

  return Math.max(y, ry + 18) + 20;
};

/** The two side-by-side summary cards: who was billed, and what was delivered. */
const drawSummaryCards = (doc, p, invoice, top) => {
  const gap = 14;
  const cardW = (CW - gap) / 2;
  // Tall enough for the longest card: a business bill-to carries a VAT number
  // line on top of the name, two address lines, email and phone.
  const cardH = 118;
  const padX = 14;

  const customer = invoice.customer || {};
  const service = invoice.service || {};

  const schedule = [service.date ? formatDateLong(service.date) : '', service.time]
    .filter(Boolean)
    .join(' · ');
  const crew =
    service.hours || service.cleaners
      ? `${service.hours ?? '—'} h · ${service.cleaners ?? '—'} cleaner${service.cleaners === 1 ? '' : 's'}`
      : '';

  const cards = [
    {
      title: 'BILLED TO',
      lines: [
        { value: customer.name, strong: true },
        ...(customer.addressLines || []).map((value) => ({ value })),
        // A reverse-charge invoice must carry the buyer's VAT number: it is the
        // evidence for why no VAT was charged.
        { value: customer.vatNumber ? `VAT ${customer.vatNumber}` : '' },
        { value: customer.email },
        { value: customer.phone }
      ]
    },
    {
      title: 'SERVICE',
      lines: [
        { value: service.name, strong: true },
        { value: schedule },
        { value: crew },
        { value: service.city }
      ]
    }
  ];

  cards.forEach((card, index) => {
    const x = M + index * (cardW + gap);
    p.rect(x, top, cardW, cardH, C.canvas, 10);
    p.outline(x, top, cardW, cardH, C.border, 10);

    let y = top + 14;
    p.text(card.title, x + padX, y, {
      font: 'inv-bold',
      size: 6.8,
      color: C.brand,
      characterSpacing: 1.3
    });
    y += 15;

    for (const line of card.lines.filter((l) => l.value)) {
      p.text(line.value, x + padX, y, {
        font: line.strong ? 'inv-bold' : 'inv-regular',
        size: line.strong ? 10.5 : 8.8,
        color: line.strong ? C.ink : C.muted,
        width: cardW - padX * 2,
        lineBreak: false,
        ellipsis: true
      });
      y += line.strong ? 16 : 12;
    }
  });

  return top + cardH + 26;
};

// Column geometry for the line-item table, shared by the header and the rows.
const COLS = {
  desc: { x: M + 14, w: 246 },
  qty: { x: M + 266, w: 46 },
  unit: { x: M + 316, w: 84 },
  amount: { x: M + 404, w: 81 }
};

const drawTableHeader = (p, top) => {
  const h = 24;
  p.rect(M, top, CW, h, C.brandDark, 6);
  // Square off the bottom corners so the header sits flush on the first row.
  p.rect(M, top + h - 6, CW, 6, C.brandDark);

  const label = (value, col, align) =>
    p.text(value, col.x, top + 8.5, {
      font: 'inv-bold',
      size: 7.2,
      color: C.white,
      width: col.w,
      align,
      characterSpacing: 1
    });

  label('DESCRIPTION', COLS.desc, 'left');
  label('QTY', COLS.qty, 'right');
  label('UNIT PRICE', COLS.unit, 'right');
  label('AMOUNT', COLS.amount, 'right');

  return top + h;
};

const drawLineItem = (p, item, top) => {
  const hasDetail = Boolean(item.detail);
  const h = hasDetail ? 34 : 24;
  const textY = top + 7;

  p.text(item.description, COLS.desc.x, textY, {
    font: 'inv-bold',
    size: 9.5,
    color: C.ink,
    width: COLS.desc.w,
    lineBreak: false,
    ellipsis: true
  });
  if (hasDetail) {
    p.text(item.detail, COLS.desc.x, textY + 12, {
      size: 8,
      color: C.muted,
      width: COLS.desc.w,
      lineBreak: false,
      ellipsis: true
    });
  }

  const numeric = (value, col, opts = {}) =>
    p.text(value, col.x, textY, {
      size: 9.5,
      color: C.inkSoft,
      width: col.w,
      align: 'right',
      ...opts
    });

  numeric(String(item.quantity ?? 1), COLS.qty);
  numeric(formatEuro(item.unitPrice), COLS.unit);
  numeric(formatEuro(item.amount), COLS.amount, { font: 'inv-bold', color: C.ink });

  p.rule(M, top + h, CW);
  return top + h;
};

const drawTotals = (doc, p, invoice, top) => {
  const boxW = 236;
  const boxX = M + CW - boxW;
  let y = top + 10;

  const row = (label, value, opts = {}) => {
    p.text(label, boxX, y, { size: 9, color: C.muted, width: boxW * 0.5 });
    p.text(value, boxX + boxW * 0.5, y, {
      size: 9.5,
      color: C.inkSoft,
      width: boxW * 0.5,
      align: 'right',
      ...opts
    });
    y += 16;
  };

  // With no VAT rate configured there is nothing to break out, so the invoice
  // shows a single honest total instead of a subtotal that just repeats it.
  // Under the reverse charge the VAT line is there but reads 0.00 — a B2B
  // invoice has to show the zero explicitly, not omit the line.
  if (invoice.vatRate > 0) {
    row('Subtotal (net)', formatEuro(invoice.subtotal));
    row(`VAT ${invoice.vatRate}%`, formatEuro(invoice.vatAmount));
  } else if (invoice.reverseCharge) {
    row('Subtotal (net)', formatEuro(invoice.subtotal));
    row('VAT — reverse charge', formatEuro(0));
  } else {
    row('Subtotal', formatEuro(invoice.subtotal));
  }

  const refunded = invoice.status === 'refunded';

  y += 4;
  const totalH = 36;
  p.rect(boxX, y, boxW, totalH, refunded ? C.dangerWash : C.brandWash, 8);
  p.text(refunded ? 'Total refunded' : 'Total', boxX + 14, y + 13, {
    font: 'inv-bold',
    size: 10,
    color: refunded ? C.danger : C.brandDark
  });
  p.text(formatEuro(invoice.total), boxX + boxW * 0.4, y + 11, {
    font: 'inv-bold',
    size: 13.5,
    color: refunded ? C.danger : C.brandDark,
    width: boxW * 0.6 - 14,
    align: 'right'
  });

  // --- Payment note, in the space left of the totals block -----------------
  const method = invoice.paymentMethod === 'manual' ? 'Paid offline' : 'Paid by card';
  const noteLines = [
    refunded
      ? `Refunded on ${formatDateLong(invoice.refundedAt)}`
      : `${method} on ${formatDateLong(invoice.paidAt || invoice.issuedAt)}`,
    invoice.paymentIntentId ? `Payment ref. ${invoice.paymentIntentId}` : '',
    refunded ? 'This charge has been returned to the original payment method.' : 'No payment is due — this invoice is settled in full.'
  ].filter(Boolean);

  let ny = top + 14;
  p.text(refunded ? 'REFUNDED' : 'PAYMENT', M, ny, {
    font: 'inv-bold',
    size: 6.8,
    color: refunded ? C.danger : C.brand,
    characterSpacing: 1.3
  });
  ny += 14;
  for (const line of noteLines) {
    p.text(line, M, ny, { size: 8.2, color: C.muted, width: CW - boxW - 24 });
    ny += 12;
  }

  return Math.max(y + totalH, ny) + 20;
};

/**
 * Closing band under the totals. A one-off booking bills three or four lines, so
 * without this the page is mostly empty between the total and the footer — and
 * an invoice with a large void reads as truncated. It also carries the one thing
 * a customer actually needs after reading the total: how to query it.
 */
const drawNotes = (p, invoice, top) => {
  const seller = invoice.seller || {};
  const contact = [seller.email, seller.phone].filter(Boolean).join(' · ');
  const reverse = Boolean(invoice.reverseCharge);

  // The reverse-charge wording is the legal substance of a B2B invoice, not a
  // footnote — it gets its own headline and a taller band.
  const h = reverse ? 88 : 62;
  p.rect(M, top, CW, h, reverse ? C.brandWash : C.canvas, 10);
  p.outline(M, top, CW, h, C.border, 10);
  // Brand tab down the leading edge, so the band reads as part of the document
  // rather than a floating grey box.
  p.rect(M, top + 12, 3, h - 24, C.brand, 1.5);

  p.text(reverse ? 'VAT — REVERSE CHARGE' : 'QUESTIONS ABOUT THIS INVOICE?', M + 18, top + 15, {
    font: 'inv-bold',
    size: 6.8,
    color: C.brand,
    characterSpacing: 1.3
  });

  const lines = [
    reverse
      ? `No VAT has been charged. VAT is to be accounted for by the recipient under the reverse charge procedure (Article 196, Council Directive 2006/112/EC).${invoice.customer?.vatNumber ? ` Customer VAT number ${invoice.customer.vatNumber}.` : ''}`
      : '',
    contact
      ? `Questions? Reply to the email this invoice arrived with, or contact ${contact}. Please quote invoice ${invoice.number}.`
      : `Questions? Reply to the email this invoice arrived with. Please quote invoice ${invoice.number}.`,
    invoice.subscription
      ? 'This visit is part of a recurring cleaning plan — each visit is invoiced separately.'
      : ''
  ].filter(Boolean);

  let y = top + 30;
  for (const line of lines) {
    p.text(line, M + 18, y, { size: 8.4, color: C.muted, width: CW - 36, lineGap: 1.5 });
    // Two lines' worth of room for the long statutory sentence (plus a gap so it
    // doesn't run into the next paragraph), one line otherwise.
    y += line.length > 110 ? 27 : 12;
  }

  return top + h;
};

const drawFooter = (p, invoice) => {
  const y = PAGE.height - 74;
  const seller = invoice.seller || {};

  p.rule(M, y, CW);

  const identity = [
    seller.name,
    (seller.addressLines || []).join(', '),
    seller.vatNumber ? `VAT ${seller.vatNumber}` : '',
    seller.registrationNumber ? `Reg. ${seller.registrationNumber}` : ''
  ]
    .filter(Boolean)
    .join('  ·  ');

  const contact = [seller.email, seller.phone, seller.website].filter(Boolean).join('  ·  ');

  p.text(identity, M, y + 12, { size: 7.4, color: C.muted, width: CW, align: 'center' });
  if (contact) {
    p.text(contact, M, y + 23, { size: 7.4, color: C.muted, width: CW, align: 'center' });
  }
  p.text(`Invoice ${invoice.number} — thank you for choosing CasaClean.`, M, y + 38, {
    size: 7.4,
    color: C.ghost,
    width: CW,
    align: 'center'
  });
};

/* --------------------------------------------------------------- public API */

/**
 * Render an invoice to a PDF buffer.
 *
 * @param {Object} invoice  a plain/lean Invoice document (see models/invoice.model.js)
 * @returns {Promise<Buffer>}
 */
const renderInvoicePdf = (invoice) =>
  new Promise((resolve, reject) => {
    try {
      const fonts = resolveFonts();
      const safe = makeSafe(fonts.unicode);

      const doc = new PDFDocument({
        size: 'A4',
        // Every draw below is absolutely positioned, so pdfkit's flow-based
        // auto page-break is not a safety net here — it's a hazard: a footer
        // line that reaches past the bottom margin would silently spawn a blank
        // page and land the rest of the footer on it. A near-zero bottom margin
        // disables that, and page breaks stay explicit (see the line-item loop).
        margins: { top: M, bottom: 12, left: M, right: M },
        // Buffering keeps the whole document in memory until end(), which is
        // what lets us hand back a single Buffer for both the email attachment
        // and the HTTP response. Invoices are one page — this is cheap.
        bufferPages: true,
        info: {
          Title: `Invoice ${invoice.number}`,
          Author: safe(invoice.seller?.name || 'CasaClean'),
          Subject: `Invoice ${invoice.number} for ${safe(invoice.customer?.name || 'customer')}`,
          Creator: 'CasaClean'
        }
      });

      doc.registerFont('inv-regular', fonts.regular);
      doc.registerFont('inv-bold', fonts.bold);

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const p = painter(doc, safe);

      let y = drawHeader(doc, p, invoice);
      y = drawSummaryCards(doc, p, invoice, y);
      y = drawTableHeader(p, y);

      const items = invoice.lineItems?.length
        ? invoice.lineItems
        : [
            {
              description: invoice.service?.name || 'Cleaning service',
              quantity: 1,
              unitPrice: invoice.total,
              amount: invoice.total
            }
          ];

      for (const item of items) {
        // A booking has a handful of line items at most, but never let an
        // unusually long one run off the page and silently lose a charge.
        if (y > PAGE.height - 260) {
          doc.addPage();
          y = drawTableHeader(p, 60);
        }
        y = drawLineItem(p, item, y);
      }

      y = drawTotals(doc, p, invoice, y);
      // Only when there's room — on a long multi-item invoice the totals can
      // sit close to the footer, and a squeezed band is worse than none.
      if (y < PAGE.height - 190) drawNotes(p, invoice, y + 6);
      drawFooter(p, invoice);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });

/** Safe, descriptive filename for the attachment and the download response. */
const invoiceFileName = (invoice) =>
  `invoice-${String(invoice.number || 'casaclean').replace(/[^A-Za-z0-9._-]/g, '-')}.pdf`;

module.exports = { renderInvoicePdf, invoiceFileName, resetFontCache };
