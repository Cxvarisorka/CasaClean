const mongoose = require('mongoose');

// Booking
// -------
// A single cleaning reservation made by a signed-in user. Field names use
// camelCase to stay consistent with the rest of the Mongoose models in this
// codebase (user/city/service). The public create flow is validated up-front by
// the Zod schema in validations/booking.validation.js, so the controller never
// trusts raw req.body for writes.
//
// `serviceId` and `cityId` reference the database-backed Service/City documents
// the booking wizard selects. They are ObjectId refs and required — a booking
// must always resolve to a real, enabled service and city (validated in the
// controller via resolveServiceAndCity before the document is created).
const bookingSchema = new mongoose.Schema({
  // Owner of the booking. For customer self-service bookings this is always the
  // signed-in user (set by the controller, used for "my bookings" and auditing).
  // It is intentionally OPTIONAL: an admin may create a booking on a customer's
  // behalf without linking it to a registered account (walk-in / phone booking),
  // in which case the customer identity lives only in the customerName/email/phone
  // fields below. The controller enforces that customer self-bookings are always
  // owned by req.user.
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: [true, "Service ID is required!"]
  },
  cityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "City",
    required: [true, "City ID is required!"]
  },
  customerName: {
    type: String,
    required: true,
    trim: [true, "Customer Name is required!"]
  },
  customerEmail: {
    type: String,
    required: [true, "Customer email is required!"],
    trim: true,
    lowercase: true
  },
  customerPhone: {
    type: String,
    required: [true, "Customer phone number is required!"],
    trim: true
  },
  streetName: {
    type: String,
    required: [true, "Street name is required!"],
    trim: true
  },
  houseNumber: {
    type: String,
    required: [true, "House number is required!"],
    trim: true
  },
  propertySize: {
    type: String,
    required: [true, "House property size is required!"],
    trim: true
  },
  doorbellName: {
    type: String,
    required: [true, "Doorbell name is required!"],
    trim: true
  },
  // Stored as strings ("2026-02-04" / "14:00"). Format is enforced by the Zod
  // validation layer; kept as strings to match the client contract.
  bookingDate: {
    type: String,
    required: [true, "Booking date is required!"]
  },
  bookingTime: {
    type: String,
    required: [true, "Booking time is required!"]
  },
  hours: {
    type: Number,
    required: [true, "Working hours is required!"],
    min: [1, "A booking must be at least 1 hour."]
  },
  cleaners: {
    type: Number,
    required: [true, "Cleaners count is required!"],
    min: [1, "A booking must have at least 1 cleaner."]
  },
  totalAmount: {
    type: Number,
    required: [true, "Total amount is required!"],
    min: [0, "Total amount can't be negative."]
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, "Notes can't exceed 2000 characters."],
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
  // Cleaning staff assigned to this booking. Admin-managed only — references to
  // Worker documents so each entry is a real staff member. Customers never set
  // this; the controller only honours it for admin requests (resolveWorkers
  // validates the ids before they're stored).
  workers: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Worker' }],
    default: []
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'confirmed'
  },
  // --- Payment fields ---------------------------------------------------------
  // All server-managed (never accepted from the public create endpoint). For a
  // customer online booking they're populated when the PaymentIntent succeeds
  // (promotePendingBooking); for an admin walk-in/phone booking the payment is
  // recorded as 'manual' with no Stripe involvement.
  //
  // No `default: null` on paymentIntentId: the sparse unique index below only
  // ignores documents where this field is ABSENT, not where it's null.
  // Defaulting to null would put every manual/payment-less booking into the
  // index as null and collide on the second one — so the field stays unset until
  // a real payment id exists.
  paymentIntentId: {
    type: String
  },
  // How the booking was paid for: an online card charge, or a manual/offline
  // (cash/invoice) booking entered by an admin.
  paymentMethod: {
    type: String,
    enum: ['card', 'manual'],
    default: 'card'
  },
  // Lifecycle of the money: unpaid (no charge yet), paid (captured), refunded
  // (charge reversed on cancellation), or manual (offline booking, no Stripe).
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'refunded', 'manual'],
    default: 'unpaid'
  },
  // Amount actually captured, in decimal euros (mirrors totalAmount at pay time).
  amountPaid: {
    type: Number,
    min: [0, "Amount paid can't be negative."]
  },
  currency: {
    type: String,
    default: 'eur'
  },
  // Stripe refund id, set when a paid booking is cancelled & refunded.
  refundId: {
    type: String
  },
  paidAt: {
    type: Date
  },
  refundedAt: {
    type: Date
  },
  // Raw Stripe status mirror (e.g. 'succeeded' / 'refunded') for support/debug.
  stripeStatus: {
    type: String,
    default: ''
  }
}, { timestamps: true, collection: 'bookings' });

// --- Indexes ----------------------------------------------------------------
// Admin booking list — the whole collection sorted newest-first (no filter),
// so a standalone createdAt index backs the sort instead of an in-memory sort.
bookingSchema.index({ createdAt: -1 });
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
