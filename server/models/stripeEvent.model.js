const mongoose = require('mongoose');

// StripeEvent
// -----------
// A processed-webhook ledger. Stripe delivers each event at-least-once and
// retries on a non-2xx response, so the webhook handler records every event id
// it has fully processed and skips any it has already seen. The underlying
// operations (promotePendingBooking, refund marking) are themselves idempotent,
// so this is an optimisation on top of correctness, not the sole guard.
const stripeEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    required: true
  }
}, { timestamps: true, collection: 'stripeEvents' });

// TTL: a processed event only needs to be remembered long enough to cover
// Stripe's retry window (up to ~3 days). 30 days is a comfortable margin.
stripeEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const StripeEvent = mongoose.model('StripeEvent', stripeEventSchema);
module.exports = StripeEvent;
