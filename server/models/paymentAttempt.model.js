const mongoose = require('mongoose');

// PaymentAttempt
// --------------
// An idempotency ledger for the one Stripe call in this codebase that both moves
// money and fires directly off a customer click: the saved-card booking charge
// in payment.controller.js, created with `confirm: true` and therefore captured
// immediately.
//
// The new-card path deliberately has NO record here. Its PaymentIntent is
// created unconfirmed — the customer confirms it later from the browser — so a
// duplicate create costs nothing but an intent that expires unused. Only the
// confirming path can turn a duplicate request into a duplicate charge.
//
// `key` is a hash of the booking content plus the chosen card (see
// bookingAttemptKey), so two submissions of the same checkout collapse onto one
// record: the first stores the PaymentIntent it created, and the second finds it
// and reuses that intent instead of charging again. This is what survives the
// case a Stripe idempotency key alone cannot make pleasant — a response lost in
// flight, retried by the customer a minute later.
//
// `attempts` exists because Stripe REPLAYS the stored response for a reused
// idempotency key, declines included. Without it a customer declined for
// insufficient funds could top up, press pay again, and be handed the original
// decline forever. Every recorded failure increments the counter and so mints a
// fresh key — exactly what the subscription charge worker does with
// `subcycle:...:a{n}`.
const paymentAttemptSchema = new mongoose.Schema({
  // sha256 of the priced booking + the card paying for it.
  key: {
    type: String,
    required: true,
    unique: true
  },

  // Whose attempt this is. Not part of the uniqueness (the key already contains
  // the user id) — kept for support/debugging.
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // The PaymentIntent this attempt produced, once Stripe has returned one. Null
  // between claiming the key and the create call coming back.
  paymentIntentId: {
    type: String,
    default: null
  },

  // Count of recorded card failures for this exact booking+card pair.
  attempts: {
    type: Number,
    default: 0
  }
}, { timestamps: true, collection: 'paymentAttempts' });

// TTL matched to Stripe's own idempotency-key lifetime. Past 24h Stripe no
// longer replays the original response, so a record older than that would point
// at a key Stripe has already forgotten — worse than having no record at all.
paymentAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

const PaymentAttempt = mongoose.model('PaymentAttempt', paymentAttemptSchema);
module.exports = PaymentAttempt;
