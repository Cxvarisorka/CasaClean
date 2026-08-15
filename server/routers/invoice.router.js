const express = require('express');

const {
  getMyInvoices,
  getInvoices,
  getInvoiceById,
  downloadInvoicePdf,
  sendInvoice,
  issueInvoice
} = require('../controllers/invoice.controller');
const { protect, restrictTo } = require('../middlewares/protect.middleware');
const validate = require('../middlewares/validate.middleware');
const { emailLimiter, paymentLimiter } = require('../middlewares/rateLimit.middleware');
const { sendInvoiceSchema, issueInvoiceSchema } = require('../validations/invoice.validation');

const invoiceRouter = express.Router();

// Literal route first so "my" is never parsed as an ObjectId.
invoiceRouter.get('/my', protect, getMyInvoices);

// Admin collection listing.
invoiceRouter.get('/', protect, restrictTo('admin'), getInvoices);

// Issue the invoice for an already-paid booking (backfill / offline bookings).
// paymentLimiter because it both reserves a number and can send mail.
invoiceRouter.post(
  '/booking/:bookingId',
  paymentLimiter,
  protect,
  restrictTo('admin'),
  validate(issueInvoiceSchema),
  issueInvoice
);

// Re-deliver an invoice. emailLimiter — this is an outbound-mail endpoint.
invoiceRouter.post(
  '/:id/send',
  emailLimiter,
  protect,
  restrictTo('admin'),
  validate(sendInvoiceSchema),
  sendInvoice
);

// Rendering a PDF is real CPU work, so the download sits behind a limiter too.
// Owner-or-admin; the controller does the authorisation.
invoiceRouter.get('/:id/pdf', paymentLimiter, protect, downloadInvoicePdf);
invoiceRouter.get('/:id', protect, getInvoiceById);

module.exports = invoiceRouter;
