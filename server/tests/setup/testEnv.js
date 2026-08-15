// Shared bootstrap for every INTEGRATION test suite. Require it first:
//
//   const { app, api, stripeMock, sendEmailMock } = require('../setup/testEnv');
//
// It:
//   - replaces the Stripe SDK singleton and the mail sender with mocks
//     (registered before app.js is required, so every controller sees them),
//   - boots an in-memory MongoDB per suite and connects mongoose to it,
//   - builds every schema index up front (several behaviours under test depend
//     on unique indexes: paymentIntentId idempotency, one-review-per-booking),
//   - wipes all collections and resets mocks between tests.
jest.mock("../../config/stripe.config", () => require("./stripeMock"));
jest.mock("../../utils/email.util", () => jest.fn());

const mongoose = require("mongoose");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

const app = require("../../app");
const stripeMock = require("../../config/stripe.config");
const sendEmailMock = require("../../utils/email.util");

// VAT is added ON TOP of catalogue prices (utils/tax.util.js), so a configured
// rate changes every booking total. The developer's own .env must not decide
// what the pricing suites expect — the baseline here is "no VAT configured",
// and the suites that exercise VAT set their own rate in beforeAll. Cleared
// AFTER app.js, whose dotenv load overrides the environment.
delete process.env.INVOICE_VAT_RATE;

// Every confirmed booking also raises an internal alert to the team
// (services/bookingAlert.service.js): to each admin ACCOUNT and to a configured
// business mailbox. Pinned to a known address for the same reason as the VAT
// rate above — the developer's own MAIL_FROM must not decide how many emails a
// paid booking sends. Use `bookingAlerts()` / `customerEmails()` to tell the two
// audiences apart instead of indexing into sendEmailMock.mock.calls.
const BOOKING_ALERT_EMAIL = "ops@test.casaclean.local";
process.env.BOOKING_NOTIFY_EMAIL = BOOKING_ALERT_EMAIL;

let mongod;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
});

beforeEach(() => {
    jest.resetAllMocks();
    // Default: every email "sends" successfully. Individual tests override with
    // mockRejectedValueOnce to exercise send-failure paths.
    sendEmailMock.mockResolvedValue(undefined);
});

afterEach(async () => {
    // deleteMany (not dropDatabase) so the indexes built in beforeAll survive.
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
});

// supertest shorthand that adds the CSRF header the API requires on every
// state-changing request (csrf.middleware.js). GET stays header-free on purpose
// so tests exercise the same requests a browser would make.
const api = {
    get: (url) => request(app).get(url),
    post: (url) => request(app).post(url).set("X-Requested-With", "XMLHttpRequest"),
    patch: (url) => request(app).patch(url).set("X-Requested-With", "XMLHttpRequest"),
    delete: (url) => request(app).delete(url).set("X-Requested-With", "XMLHttpRequest")
};

/**
 * Wait for fire-and-forget customer mail to actually be dispatched.
 *
 * Post-payment email is deliberately NOT awaited by the request/webhook that
 * triggers it (a slow SMTP host must not stall a Stripe webhook), and since
 * invoicing was added the dispatch sits behind a few awaited steps — reserve a
 * number, snapshot the booking, render the PDF. So a test that asserts on
 * sendEmailMock immediately after the HTTP call is racing it.
 *
 * Polls rather than sleeping a fixed interval: it returns as soon as the mail is
 * out, and gives up quietly at the timeout so the assertion (not this helper)
 * reports the failure.
 */
const waitForEmails = async (count = 1, timeoutMs = 3000) => {
    const deadline = Date.now() + timeoutMs;
    while (sendEmailMock.mock.calls.length < count && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return sendEmailMock.mock.calls;
};

/** Every mail argument sent so far, in dispatch order. */
const sentEmails = () => sendEmailMock.mock.calls.map(([mail]) => mail);

/** The internal new-booking alerts (addressed to the team). */
const bookingAlerts = () =>
    sentEmails().filter((mail) => String(mail?.email || "").includes(BOOKING_ALERT_EMAIL));

/**
 * Everything that is NOT a team alert — i.e. the customer-facing mail. The team
 * alert and the customer's confirmation race each other (both are
 * fire-and-forget), so suites must select by audience rather than by index.
 */
const customerEmails = () =>
    sentEmails().filter((mail) => !String(mail?.email || "").includes(BOOKING_ALERT_EMAIL));

/** Poll until `count` customer-facing emails have been dispatched. */
const waitForCustomerEmails = async (count = 1, timeoutMs = 3000) => {
    const deadline = Date.now() + timeoutMs;
    while (customerEmails().length < count && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return customerEmails();
};

/** Poll until `count` team booking alerts have been dispatched. */
const waitForBookingAlerts = async (count = 1, timeoutMs = 3000) => {
    const deadline = Date.now() + timeoutMs;
    while (bookingAlerts().length < count && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return bookingAlerts();
};

module.exports = {
    app,
    api,
    request,
    stripeMock,
    sendEmailMock,
    waitForEmails,
    BOOKING_ALERT_EMAIL,
    sentEmails,
    bookingAlerts,
    customerEmails,
    waitForCustomerEmails,
    waitForBookingAlerts
};
