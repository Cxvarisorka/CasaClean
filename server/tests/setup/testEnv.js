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

module.exports = { app, api, request, stripeMock, sendEmailMock };
