const Sentry = require("@sentry/node");
const dotenv = require("dotenv");

dotenv.config();

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    // To disable sending user data, uncomment the line below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/node/configuration/options/#dataCollection
    // dataCollection: { userInfo: false },
});