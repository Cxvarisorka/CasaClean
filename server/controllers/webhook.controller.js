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
const PendingBooking = require('../models/pendingBooking.model');
const sendEmail = require('../utils/email.util');
const { promotePendingBooking } = require('./payment.controller');
const { ensureSubscriptionCycleBooking } = require('../services/subscription.service');

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
        if (pi.metadata?.type === 'subscription-cycle') {
          // Job-side creation is the normal path; this repairs a crash after
          // Stripe captured a cycle PaymentIntent.
          await ensureSubscriptionCycleBooking(pi);
          break;
        }
        await promotePendingBooking(pi.id, pi);
        break;
      }

      case 'payment_intent.payment_failed': {
        // No booking is created on failure; the PendingBooking draft TTL-expires
        // on its own. Best-effort heads-up to the customer so an abandoned
        // decline doesn't just go silent — never awaited past the response and
        // never allowed to fail the webhook.
        const pi = event.data.object;
        // Cycle declines are handled synchronously by the subscription worker.
        // Never send the one-off "book again" email for an automatic retry.
        if (pi.metadata?.type === 'subscription-cycle') break;
        const pending = await PendingBooking.findOne({ paymentIntentId: pi.id })
          .select('draft.customerEmail draft.customerName')
          .lean()
          .catch(() => null);
        const email = pending?.draft?.customerEmail;
        if (email) {
          const name = pending.draft.customerName || 'there';
          sendEmail({
            email,
            subject: 'CasaClean — Your payment didn\'t go through',
            text:
              `Hello ${name},\n\n` +
              `Unfortunately your payment for a CasaClean booking didn't go through` +
              `${pi.last_payment_error?.message ? ` (${pi.last_payment_error.message})` : ''}.\n` +
              `No booking was created and you have not been charged.\n\n` +
              `You can try again any time at ${process.env.CLIENT_URL}/booking.\n\n— CasaClean`,
            html: undefined
          }).catch((err) => console.error('Payment-failed email error:', err.message));
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId = charge.payment_intent;
        // Only a FULL refund flips the booking's money state — this event also
        // fires for partial refunds issued from the Stripe dashboard, and a
        // €10 goodwill refund must not mark the whole booking as refunded.
        if (paymentIntentId && charge.amount_refunded >= charge.amount) {
          // Idempotent: re-applying the same fields is harmless if the cancel
          // handler already set them.
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
