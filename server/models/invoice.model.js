const mongoose = require('mongoose');

// Invoice
// -------
// The financial record of one paid booking. Issued automatically the moment a
// payment succeeds (one-off bookings and every recurring cycle), emailed to the
// customer as a PDF, and downloadable from the admin panel.
//
// The defining property of this model is that it is a SNAPSHOT, not a set of
// references. Every value printed on the document — the seller's address, the
// customer's details, the service name, each line item and its price — is
// copied in at issue time. A service that later changes its name or price, or a
// customer who edits their profile, must never retroactively alter a document
// that has already been sent and accounted for. The only fields that change
// after issue are the delivery bookkeeping (emailedAt/emailCount) and the
// refund stamp.

// One priced row on the document. Amounts are decimal euros, stated NET (see
// utils/invoice.util.js — catalogue prices exclude VAT, and any VAT is added
// under the subtotal these rows sum to, not inside them).
const lineItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    // Optional second line under the description, e.g. "3 h × 2 cleaners".
    detail: { type: String, default: '' },
    quantity: { type: Number, default: 1, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

// Who is billing. Snapshotted from the INVOICE_* environment configuration.
const partySchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    addressLines: { type: [String], default: [] },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    vatNumber: { type: String, default: '' },
    registrationNumber: { type: String, default: '' },
    website: { type: String, default: '' }
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    // Human-readable sequential reference, e.g. "CC-2026-000042". Unique and
    // gap-free within a series (see models/counter.model.js).
    number: { type: String, required: true, unique: true },
    // The series the sequence belongs to — the issue year.
    series: { type: String, required: true },
    sequence: { type: Number, required: true },

    // The booking being invoiced. Unique: a booking is billed exactly once, and
    // this index is what makes issuing idempotent across the finalize/webhook
    // race (the same guarantee Booking.paymentIntentId gives the payment).
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true
    },
    // Present when the invoice bills a recurring cycle rather than a one-off.
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
    // The account, when the booking has one. Absent for an admin-entered
    // walk-in booking — the customer snapshot below is then the only identity.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // 'issued' is the normal terminal state. 'refunded' is stamped when the
    // underlying charge is reversed, so a downloaded PDF can never claim money
    // was kept that has since been returned.
    status: { type: String, enum: ['issued', 'refunded'], default: 'issued' },
    issuedAt: { type: Date, default: Date.now },
    refundedAt: { type: Date },

    seller: { type: partySchema, default: () => ({}) },
    customer: { type: partySchema, default: () => ({}) },

    // What was actually delivered, as it read at issue time.
    service: {
      name: { type: String, default: '' },
      city: { type: String, default: '' },
      date: { type: String, default: '' },
      time: { type: String, default: '' },
      hours: { type: Number },
      cleaners: { type: Number }
    },

    lineItems: { type: [lineItemSchema], default: [] },

    currency: { type: String, default: 'eur' },
    // EU reverse charge: this customer is a business whose VAT number was
    // verified, so no VAT was charged and they account for it themselves. The
    // PDF must say so explicitly — an invoice with no VAT line and no
    // explanation is not a valid B2B document.
    reverseCharge: { type: Boolean, default: false },
    // Net of VAT when a rate is configured; equal to `total` when it isn't.
    subtotal: { type: Number, required: true, min: 0 },
    // The rate PRINTED on this document — snapshotted, so changing
    // INVOICE_VAT_RATE never restates an issued invoice.
    vatRate: { type: Number, default: 0, min: 0 },
    vatAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },

    paymentMethod: { type: String, default: 'card' },
    paymentIntentId: { type: String, default: '' },
    paidAt: { type: Date },

    // Delivery bookkeeping, so the panel can show whether the customer ever
    // received it and an admin can resend without losing the audit trail.
    emailedTo: { type: String, default: '' },
    emailedAt: { type: Date },
    emailCount: { type: Number, default: 0 }
  },
  { timestamps: true, collection: 'invoices' }
);

// --- Indexes ----------------------------------------------------------------
// Admin list — the whole collection, newest first.
invoiceSchema.index({ issuedAt: -1 });
// "My invoices" — a customer's own documents, newest first.
invoiceSchema.index({ user: 1, issuedAt: -1 });
// Cycle history for one recurring plan.
invoiceSchema.index({ subscription: 1, issuedAt: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);
module.exports = Invoice;
