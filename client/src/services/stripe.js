/*
 * Stripe.js loader
 * ----------------
 * A single, lazily-initialised Stripe instance shared across the app (the
 * booking PaymentStep and the profile saved-cards UI both consume it).
 * `getStripe()` returns a promise that resolves to the Stripe object once
 * stripe.js has loaded, and caches it so every caller shares one script tag.
 *
 * Two things here are deliberate, and both exist to keep js.stripe.com off the
 * critical path of surfaces that will never charge a card:
 *
 *   - the import is from `@stripe/stripe-js/pure`, whose entry point has no
 *     side effects (the default entry starts fetching stripe.js the moment the
 *     module is evaluated);
 *   - the instance is behind a FUNCTION rather than an exported constant, so
 *     nothing loads until a component actually renders a card form. As a
 *     module-scope constant this fired at booking-wizard mount — step 1 of 6 —
 *     and on every visit to the profile page.
 *
 * When VITE_STRIPE_PUBLISHABLE_KEY is absent we return null so payment surfaces
 * can degrade gracefully to a "payments unavailable" notice instead of crashing.
 */

import { loadStripe } from "@stripe/stripe-js/pure";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

let stripe = null;

/** @returns {Promise<import("@stripe/stripe-js").Stripe | null> | null} */
export function getStripe() {
  if (!publishableKey) return null;
  if (!stripe) stripe = loadStripe(publishableKey);
  return stripe;
}

export const isStripeConfigured = Boolean(publishableKey);
