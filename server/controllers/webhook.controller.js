// Stripe webhook controller
// -------------------------
// Receives signed events from Stripe. Mounted in app.js with express.raw BEFORE
// the JSON parser, cookie parser and CSRF guard — the raw request bytes are
// required for signature verification, and the request carries no auth cookie or
// X-Requested-With header, both of which the normal pipeline would reject.
//
// Every handler path is idempotent (promotePendingBooking and the refund marking
// can safely run twice), so duplicate deliveries and retries are harmless. We
// additionally record processed event ids to skip re-work on duplicates.

const stripe = require('../config/stripe.config');
const StripeEvent = require('../models/stripeEvent.model');
const Booking = require('../models/booking.model');
const { promotePendingBooking } = require('./payment.controller');

const handleStripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    // req.body is a raw Buffer here (express.raw). Verifying against the signing
    // secret is what lets us trust the payload — never act on an unsigned event.
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Dedup: skip events we've already fully processed. (Recorded AFTER successful
  // processing below, so a failed+retried event is reprocessed.)
  const alreadyProcessed = await StripeEvent.exists({ eventId: event.id });
  if (alreadyProcessed) {
    return res.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        // Backstop for the client finalize call — create the booking if it
        // hasn't been already.
        await promotePendingBooking(pi.id, pi);
        break;
      }

      case 'payment_intent.payment_failed': {
        // No booking is created on failure; the PendingBooking draft TTL-expires
        // on its own. Nothing to do here (a notification could be added later).
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId = charge.payment_intent;
        if (paymentIntentId) {
          // Mark the booking refunded. Idempotent: re-applying the same fields is
          // harmless if the cancel handler already set them.
          await Booking.findOneAndUpdate(
            { paymentIntentId },
            { paymentStatus: 'refunded', refundedAt: new Date(), stripeStatus: 'refunded' }
          );
        }
        break;
      }

      default:
        // Unhandled event types are acknowledged so Stripe stops retrying.
        break;
    }
  } catch (err) {
    // A non-2xx makes Stripe retry, which is what we want on a transient failure
    // (the dedup + idempotent handlers make retries safe).
    console.error('Webhook handler error:', err.message);
    return res.status(500).json({ received: false });
  }

  // Record only after successful processing so retries can re-run a failed event.
  await StripeEvent.create({ eventId: event.id, type: event.type }).catch((err) => {
    if (err.code !== 11000) console.error('StripeEvent record error:', err.message);
  });

  res.json({ received: true });
};

module.exports = { handleStripeWebhook };
