const mongoose = require('mongoose');

// Booking
// -------
// A single cleaning reservation made by a signed-in user. Field names use
// camelCase to stay consistent with the rest of the Mongoose models in this
// codebase (user/city/service). The public create flow is validated up-front by
// the Zod schema in validations/booking.validation.js, so the controller never
// trusts raw req.body for writes.
//
// NOTE (legacy reference shape): `serviceId` and `cityId` are stored as plain
// Numbers because that's the contract the client currently sends and the seed
// data used. The actual Service/City documents in this codebase are keyed by
// ObjectId, so these numbers do NOT reference real documents and cannot be
// populated. Migrating them to `ObjectId` refs (+ a coordinated client change)
// is the correct long-term fix — tracked here intentionally rather than changed
// silently, since it would break the existing API contract.
const bookingSchema = new mongoose.Schema({
  // Owner of the booking. Bookings now require authentication, so every booking
  // is tied to the user who created it (used for "my bookings" and auditing).
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceId: {
    type: Number,
    required: true
  },
  cityId: {
    type: Number,
    required: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  customerPhone: {
    type: String,
    required: true,
    trim: true
  },
  streetName: {
    type: String,
    required: true,
    trim: true
  },
  houseNumber: {
    type: String,
    required: true,
    trim: true
  },
  propertySize: {
    type: String,
    required: true,
    trim: true
  },
  doorbellName: {
    type: String,
    required: true,
    trim: true
  },
  // Stored as strings ("2026-02-04" / "14:00"). Format is enforced by the Zod
  // validation layer; kept as strings to match the client contract.
  bookingDate: {
    type: String,
    required: true
  },
  bookingTime: {
    type: String,
    required: true
  },
  hours: {
    type: Number,
    required: true,
    min: [1, "A booking must be at least 1 hour."]
  },
  cleaners: {
    type: Number,
    required: true,
    min: [1, "A booking must have at least 1 cleaner."]
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, "Total amount can't be negative."]
  },
  notes: {
    type: String,
    trim: true,
    default: null
  },
  // Add-on requests (e.g. "Fridge Cleaning"). References to SpecialRequest
  // documents so each item is a real, priced catalogue entry rather than an
  // arbitrary string. Renamed from the old `additional_services`.
  specialRequests: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SpecialRequest' }],
    default: []
  },
  // Equipment/consumables the customer asks the cleaners to bring. Still a free
  // list of slugs from the UI (no catalogue model needed for these yet).
  supplies: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'confirmed'
  },
  // --- Payment placeholders ---------------------------------------------------
  // Payments are NOT implemented yet, so these are optional and server-managed
  // (never accepted from the public create endpoint). They are kept so a future
  // payment integration can populate them without another migration. When/if a
  // payment intent id is set it must be unique (one booking per payment) — see
  // the sparse unique index below.
  paymentIntentId: {
    type: String,
    default: null
  },
  stripeStatus: {
    type: String,
    default: ''
  }
}, { timestamps: true, collection: 'bookings' });

// --- Indexes ----------------------------------------------------------------
// "My bookings" — list a user's bookings, newest first.
bookingSchema.index({ user: 1, createdAt: -1 });
// Admin filtering by status and/or date.
bookingSchema.index({ status: 1, bookingDate: 1 });
// Look-ups / support by customer email.
bookingSchema.index({ customerEmail: 1 });
// Idempotency guard: a given payment can back at most one booking. `sparse` so
// the many bookings without a payment id (current state) don't collide on null.
bookingSchema.index({ paymentIntentId: 1 }, { unique: true, sparse: true });

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
