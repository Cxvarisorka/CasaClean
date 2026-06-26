// Stripe SDK singleton.
//
// STRIPE_SECRET_KEY is validated at boot by assertEnv() (utils/env.util.js), so
// by the time any controller pulls in this module the key is guaranteed present.
// Keeping a single client instance avoids re-creating the HTTP agent per call.
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = stripe;
