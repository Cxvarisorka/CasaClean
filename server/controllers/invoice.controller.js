// Invoice controller
// ------------------
// Read + delivery surface for invoices. Invoices are *issued* by the payment
// pipeline, never by a request body, so there is no create/update endpoint here:
// the only writes an admin can make are "issue the one this paid booking is
// missing" and "send it again". Nothing on the document itself is editable —
// that is the point of a snapshot.
//
//   GET    /invoice/my                    a customer's own invoices
//   GET    /invoice                       admin list (paginated)
//   GET    /invoice/:id                   one invoice (owner or admin)
//   GET    /invoice/:id/pdf               download the PDF (owner or admin)
//   POST   /invoice/:id/send              re-email it (admin)
//   POST   /invoice/booking/:bookingId    issue for a paid booking (admin)

const mongoose = require('mongoose');

const Invoice = require('../models/invoice.model');

const catchAsync = require('../utils/catchAsync.util');
const AppError = require('../utils/appError.util');
const { renderInvoicePdf, invoiceFileName } = require('../utils/invoicePdf.util');
const {
  issueInvoiceForBooking,
  deliverInvoiceEmail
} = require('../services/invoice.service');

/**
 * Load an invoice the caller is allowed to see.
 *
 * Ownership is checked on the invoice's `user`, which is the account the booking
 * belonged to. An admin sees everything. A booking with no linked account
 * (admin-entered walk-in) has no owner, so only an admin can reach it — matching
 * an email address from the snapshot would let anyone who changes their profile
 * email pull someone else's document.
 */
const findAuthorisedInvoice = async (id, user) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invoice not found.', 404);
  }

  const invoice = await Invoice.findById(id);
  if (!invoice) throw new AppError('Invoice not found.', 404);

  const isOwner = invoice.user && String(invoice.user) === String(user._id);
  if (user.role !== 'admin' && !isOwner) {
    // Same message as "not found" — never confirm an invoice id exists to
    // someone who isn't entitled to it.
    throw new AppError('Invoice not found.', 404);
  }

  return invoice;
};

// GET /api/v1/invoice/my — the signed-in customer's own invoices, newest first.
const getMyInvoices = catchAsync(async (req, res, next) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const filter = { user: req.user._id };

  const [invoices, invoiceCount] = await Promise.all([
    Invoice.find(filter).sort({ issuedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Invoice.countDocuments(filter)
  ]);

  res.status(200).json({
    status: 'success',
    message: 'Invoices returned successfully!',
    invoiceCount,
    data: { invoices }
  });
});

// GET /api/v1/invoice — admin list.
const getInvoices = catchAsync(async (req, res, next) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

  // Whitelisted filters only — req.query is not covered by sanitizeMongo.
  const filter = {};
  if (['issued', 'refunded'].includes(req.query.status)) {
    filter.status = req.query.status;
  }
  if (/^\d{4}$/.test(String(req.query.series))) {
    filter.series = String(req.query.series);
  }

  const hasFilter = Object.keys(filter).length > 0;

  const [invoices, invoiceCount] = await Promise.all([
    Invoice.find(filter)
      .sort({ issuedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    hasFilter ? Invoice.countDocuments(filter) : Invoice.estimatedDocumentCount()
  ]);

  res.status(200).json({
    status: 'success',
    message: 'Invoices returned successfully!',
    invoiceCount,
    data: { invoices }
  });
});

// GET /api/v1/invoice/:id — one invoice (owner or admin).
const getInvoiceById = catchAsync(async (req, res, next) => {
  const invoice = await findAuthorisedInvoice(req.params.id, req.user);

  res.status(200).json({
    status: 'success',
    message: 'Invoice returned successfully!',
    data: { invoice }
  });
});

// GET /api/v1/invoice/:id/pdf — the exact PDF the customer was emailed.
const downloadInvoicePdf = catchAsync(async (req, res, next) => {
  const invoice = await findAuthorisedInvoice(req.params.id, req.user);

  const pdf = await renderInvoicePdf(invoice.toObject());
  const filename = invoiceFileName(invoice);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', pdf.length);
  // `attachment` so the browser saves it under the invoice number rather than
  // rendering it inline under the route's last path segment ("pdf").
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // A financial document must never be served from a shared/proxy cache.
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(pdf);
});

// POST /api/v1/invoice/:id/send — resend an invoice by email (admin).
// Unlike the automatic path this one reports failure: an admin who clicks
// "resend" needs to know whether it actually went out.
const sendInvoice = catchAsync(async (req, res, next) => {
  const invoice = await findAuthorisedInvoice(req.params.id, req.user);

  try {
    await deliverInvoiceEmail(invoice);
  } catch (err) {
    if (err instanceof AppError) return next(err);
    return next(new AppError(`The invoice could not be sent: ${err.message}`, 502));
  }

  res.status(200).json({
    status: 'success',
    message: 'Invoice sent successfully!',
    data: { invoice: await Invoice.findById(invoice._id) }
  });
});

// POST /api/v1/invoice/booking/:bookingId — issue the invoice for a paid booking
// (admin). Idempotent: returns the existing one if it has already been issued.
// This is what covers bookings paid before invoicing existed, and offline/manual
// bookings an admin entered by hand.
const issueInvoice = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return next(new AppError('Booking not found.', 404));
  }

  const existed = await Invoice.exists({ booking: bookingId });
  const invoice = await issueInvoiceForBooking(bookingId);

  // Only email a genuinely new document unless the caller asks otherwise, so
  // re-clicking "issue" doesn't spam the customer.
  if (!existed && req.body?.send !== false) {
    await deliverInvoiceEmail(invoice).catch((err) =>
      console.error('Invoice send error:', err.message)
    );
  }

  res.status(existed ? 200 : 201).json({
    status: 'success',
    message: existed ? 'Invoice already issued.' : 'Invoice issued successfully!',
    data: { invoice: await Invoice.findById(invoice._id) }
  });
});

module.exports = {
  getMyInvoices,
  getInvoices,
  getInvoiceById,
  downloadInvoicePdf,
  sendInvoice,
  issueInvoice
};
