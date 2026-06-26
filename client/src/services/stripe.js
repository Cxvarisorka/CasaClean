/*
 * Stripe.js loader
 * ----------------
 * A single, lazily-initialised Stripe instance shared across the app (the
 * booking PaymentStep and the profile saved-cards UI both consume it). loadStripe
 * returns a promise that resolves to the Stripe object once stripe.js has loaded.
 *
 * When VITE_STRIPE_PUBLISHABLE_KEY is absent we export null so payment surfaces
 * can degrade gracefully to a "payments unavailable" notice instead of crashing.
 */

import { loadStripe } from "@stripe/stripe-js";

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

export const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export const isStripeConfigured = Boolean(publishableKey);
