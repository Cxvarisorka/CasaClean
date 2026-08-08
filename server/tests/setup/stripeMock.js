// In-memory stand-in for config/stripe.config.js (the Stripe SDK singleton).
//
// Every API-object method the code calls is a jest.fn() the tests configure per
// scenario. `webhooks` is deliberately the REAL Stripe webhook module: signature
// verification is pure HMAC (no network), so webhook tests exercise the genuine
// constructEvent check and sign their payloads with
// stripe.webhooks.generateTestHeaderString({ payload, secret }).
const Stripe = require("stripe");

const realWebhooks = new Stripe("sk_test_casaclean_dummy").webhooks;

module.exports = {
    webhooks: realWebhooks,
    customers: {
        create: jest.fn(),
        // Customer Tax IDs back VAT-number verification (services/tax.service.js).
        // Stripe validates EU numbers against VIES asynchronously, so createTaxId
        // normally resolves 'pending' and the real answer arrives as a webhook.
        createTaxId: jest.fn(),
        retrieveTaxId: jest.fn(),
        deleteTaxId: jest.fn(),
        listTaxIds: jest.fn()
    },
    paymentIntents: { create: jest.fn(), retrieve: jest.fn() },
    paymentMethods: { retrieve: jest.fn(), list: jest.fn(), detach: jest.fn() },
    setupIntents: { create: jest.fn() },
    refunds: { create: jest.fn() }
};
