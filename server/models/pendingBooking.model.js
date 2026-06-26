const mongoose = require('mongoose');

// PendingBooking
// --------------
// A transient, SERVER-VALIDATED booking draft created the moment a customer
// begins paying. It holds the fully resolved & priced booking fields (computed
// server-side via buildValidatedBookingDraft — never trusted from the client),
// keyed to a Stripe PaymentIntent.
//
// It only becomes a real Booking once that PaymentIntent succeeds (see
// promotePendingBooking in payment.controller). This is what makes the product
// rule "no charge -> no booking" true: an abandoned or failed payment leaves
// only a draft, which the TTL index below reaps automatically.
const pendingBookingSchema = new mongoose.Schema({
  // The signed-in customer this draft belongs to.
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // The Stripe PaymentIntent this draft is waiting on. Unique so a single intent
  // maps to exactly one draft (and the webhook/finalize can look the draft up by
  // intent id).
  paymentIntentId: {
    type: String,
    required: true,
    unique: true
  },

  // Whether the customer asked to save this card for future bookings.
  savePaymentMethod: {
    type: Boolean,
    default: false
  },

  // The fully validated & priced booking payload, ready to hand to
  // Booking.create() on promotion. An explicit sub-schema (rather than a free
  // Mixed blob) keeps the shape honest.
  draft: {
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true },
    // Cached for the confirmation email so promotion needs no extra Service read.
    serviceName: { type: String },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    streetName: { type: String, required: true },
    houseNumber: { type: String, required: true },
    propertySize: { type: String, required: true },
    doorbellName: { type: String, required: true },
    bookingDate: { type: String, required: true },
    bookingTime: { type: String, required: true },
    hours: { type: Number, required: true },
    cleaners: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    notes: { type: String, default: null },
    specialRequests: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SpecialRequest' }],
      default: []
    },
    supplies: { type: [String], default: [] }
  }
}, { timestamps: true, collection: 'pendingBookings' });

// TTL: auto-delete abandoned drafts one hour after creation. A successful
// payment promotes (and deletes) the draft well before then.
pendingBookingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

const PendingBooking = mongoose.model('PendingBooking', pendingBookingSchema);
module.exports = PendingBooking;
