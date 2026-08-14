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

const Sentry = require('@sentry/node');

const stripe = require('../config/stripe.config');
const StripeEvent = require('../models/stripeEvent.model');
const Booking = require('../models/booking.model');
const PendingBooking = require('../models/pendingBooking.model');
const Subscription = require('../models/subscription.model');
const sendEmail = require('../utils/email.util');
const { promotePendingBooking, refundOrphanedPayment } = require('./payment.controller');
const { markInvoiceRefunded } = require('../services/invoice.service');
const {
  applyVerificationResult,
  applyVatNumberDeleted
} = require('../services/tax.service');
const {
  ensureSubscriptionCycleBooking,
  renderSubscriptionPausedEmail,
  sendBestEffortEmail
} = require('../services/subscription.service');

const { DRAFT_TTL_SECONDS } = PendingBooking;

const stripeId = (value) => (typeof value === 'string' ? value : value?.id);

/**
 * Decide what to do with a succeeded booking payment that produced no booking.
 *
 * `promotePendingBooking` returns null in two very different situations, and
 * telling them apart is the whole job here — one deserves an automatic refund,
 * the other must never get one:
 *
 *   1. The draft TTL-expired before the payment landed. The booking can never be
 *      created, so keeping the money would be keeping it against nothing. The
 *      finalize endpoint already refunds this when the customer is still on the
 *      page; without the same treatment here, a customer who closed the tab is
 *      simply charged for a booking that does not exist.
 *
 *   2. The draft has not been WRITTEN yet — a saved-card charge captures inside
 *      stripe.paymentIntents.create, and Stripe can deliver this event before
 *      createBookingIntent has persisted its PendingBooking. Refunding here would
 *      cancel a perfectly good payment moments before its booking appears.
 *
 * The intent's own age separates them: past the draft TTL nothing can still be
 * in flight, so a missing draft is definitively a reaped one. Anything younger is
 * either case 2 or something genuinely unexpected — neither is ours to refund, so
 * it goes to Sentry for a human instead.
 */
const handleOrphanedBookingPayment = async (paymentIntent) => {
  // Only ever touch payments this application created. An intent belonging to
  // another integration on the same Stripe account is not ours to refund.
  if (paymentIntent?.metadata?.type !== 'booking') return;

  const createdAt = Number(paymentIntent.created) * 1000;
  const ageSeconds = Number.isFinite(createdAt)
    ? (Date.now() - createdAt) / 1000
    : 0;

  if (ageSeconds > DRAFT_TTL_SECONDS) {
    const refunded = await refundOrphanedPayment(paymentIntent.id);
    if (refunded) {
      console.error(
        `Refunded orphaned payment ${paymentIntent.id}: the booking draft expired before the charge landed.`
      );
    }
    return;
  }

  // Too young to judge. Do not refund; make it visible instead.
  Sentry.captureMessage(
    `Succeeded booking payment ${paymentIntent.id} has no draft and no booking.`,
    {
      level: 'warning',
      extra: {
        stage: 'handleOrphanedBookingPayment',
        paymentIntentId: paymentIntent.id,
        ageSeconds,
        userId: paymentIntent.metadata?.userId
      }
    }
  );
};

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
        const booking = await promotePendingBooking(pi.id, pi);
        // Nothing to promote: either an expired draft (refundable) or a draft
        // still being written (emphatically not). See the helper.
        if (!booking) await handleOrphanedBookingPayment(pi);
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
          const booking = await Booking.findOneAndUpdate(
            { paymentIntentId },
            { paymentStatus: 'refunded', refundedAt: new Date(), stripeStatus: 'refunded' },
            { returnDocument: 'after' }
          );

          // Keep the invoice honest: a downloaded PDF must never claim money was
          // kept that has since been returned. Idempotent (scoped to 'issued')
          // and non-fatal — a bookkeeping stamp can't be allowed to fail the
          // webhook and trigger Stripe retries.
          if (booking) {
            await markInvoiceRefunded(booking._id, booking.refundedAt).catch((err) =>
              console.error('Invoice refund stamp error:', err.message)
            );
          }

          // A refund issued straight from the Stripe dashboard is a deliberate
          // "undo this charge". If the refunded charge paid for a recurring
          // cycle, leaving the plan active would just charge the same card again
          // on the next sweep — so pause it and tell the customer why. Paused
          // (not cancelled) keeps it resumable once the card/billing issue is
          // sorted out.
          if (booking?.subscriptionId) {
            const paused = await Subscription.findOneAndUpdate(
              { _id: booking.subscriptionId, status: 'active' },
              {
                $set: {
                  status: 'paused',
                  pausedReason: 'payment-failed',
                  pausedAt: new Date(),
                  processingAt: null,
                  lastError: 'A charge for this plan was refunded, so upcoming visits are on hold.'
                }
              },
              { returnDocument: 'after' }
            );

            if (paused) {
              sendBestEffortEmail({
                email: paused.customerEmail,
                ...renderSubscriptionPausedEmail({
                  subscription: paused,
                  reason: 'payment-failed',
                  errorMessage: paused.lastError
                })
              });
            }
          }
        }
        break;
      }

      case 'charge.dispute.created': {
        // A chargeback. The money is held by Stripe from this moment, and the
        // customer has told their bank they did not authorise (or did not
        // receive) this cleaning — so the one thing we must not do is carry on
        // billing the same card. Deliberately narrower than charge.refunded:
        // paymentStatus stays 'paid' because a dispute can still be WON, and a
        // won dispute must not leave the booking mislabelled as refunded.
        const dispute = event.data.object;
        const paymentIntentId = stripeId(dispute.payment_intent);
        if (!paymentIntentId) break;

        const booking = await Booking.findOneAndUpdate(
          { paymentIntentId },
          { $set: { stripeStatus: 'disputed' } },
          { returnDocument: 'after' }
        );

        // Pause any plan this charge belonged to. Paused rather than cancelled:
        // if the dispute is resolved in our favour the customer can resume,
        // whereas charging again mid-dispute earns a second chargeback and
        // counts against the account's dispute rate.
        if (booking?.subscriptionId) {
          const paused = await Subscription.findOneAndUpdate(
            { _id: booking.subscriptionId, status: 'active' },
            {
              $set: {
                status: 'paused',
                pausedReason: 'payment-failed',
                pausedAt: new Date(),
                processingAt: null,
                lastError: 'A charge for this plan was disputed, so upcoming visits are on hold.'
              }
            },
            { returnDocument: 'after' }
          );

          if (paused) {
            sendBestEffortEmail({
              email: paused.customerEmail,
              ...renderSubscriptionPausedEmail({
                subscription: paused,
                reason: 'payment-failed',
                errorMessage: paused.lastError
              })
            });
          }
        }

        // A dispute has a response deadline and needs evidence a human has to
        // gather — it can never be handled by code alone, so it must page us.
        Sentry.captureMessage(`Stripe dispute opened on charge ${dispute.charge || dispute.id}.`, {
          level: 'error',
          extra: {
            stage: 'charge.dispute.created',
            disputeId: dispute.id,
            paymentIntentId,
            amount: dispute.amount,
            reason: dispute.reason,
            dueBy: dispute.evidence_details?.due_by,
            bookingId: booking ? String(booking._id) : null
          }
        });
        break;
      }

      case 'customer.tax_id.created':
      case 'customer.tax_id.updated': {
        // VIES verification is asynchronous — a number registered a few minutes
        // ago as 'pending' gets its real answer here. This is the event that
        // actually flips a business onto the reverse charge, so it must be
        // handled, not merely acknowledged.
        await applyVerificationResult(event.data.object);
        break;
      }

      case 'customer.tax_id.deleted': {
        // Removed on Stripe's side (dashboard, or a customer object rebuilt).
        // It can no longer earn the reverse charge here either.
        await applyVatNumberDeleted(event.data.object);
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
