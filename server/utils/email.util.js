// Thin wrapper around nodemailer so the rest of the app sends mail through a
// single, configured entry point. All transport credentials come from the
// environment (Mailtrap in dev) — never hard-code secrets in source.
const nodemailer = require("nodemailer");

// Env config (load before anything reads process.env)
require("dotenv").config();

/**
 * Build the SMTP transport from environment variables.
 *
 * Kept as a lazily-created singleton so we don't open a new connection pool on
 * every email. During local development this points at Mailtrap's sandbox inbox.
 */
let transporter;

const getTransporter = () => {
    if (transporter) return transporter;

    const port = Number(process.env.MAIL_PORT) || 587;

    transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port,
        // Port 465 is implicit TLS; 587/25 negotiate via STARTTLS. Getting this
        // wrong doesn't error — the connection hangs until timeout — so derive
        // it from the port (override with MAIL_SECURE=true/false if needed).
        secure: process.env.MAIL_SECURE
            ? process.env.MAIL_SECURE === 'true'
            : port === 465,
        auth: {
            user: process.env.MAIL_USERNAME,
            pass: process.env.MAIL_PASSWORD
        },
        // Fail fast instead of nodemailer's defaults (up to 2 min to connect,
        // 10 min socket) — an unreachable SMTP host must never stall a request
        // or a Stripe webhook for minutes.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,

        // Reuse SMTP connections instead of opening one per message. Without
        // this, every email paid a fresh TCP handshake + TLS negotiation + AUTH
        // before a single byte of the message moved — and several paths send more
        // than one message in a row (a paid booking sends the customer's invoice
        // and the admin alert; a cron sweep sends one pair per due plan).
        //
        // maxConnections is small on purpose: shared SMTP providers cap
        // concurrent connections per account and answer an over-eager client with
        // a temporary failure, which for us would mean a silently undelivered
        // invoice. maxMessages recycles a connection periodically because
        // providers also cap messages per connection.
        pool: true,
        maxConnections: 3,
        maxMessages: 50
    });

    return transporter;
};

/**
 * Send an email.
 *
 * @param {Object}  options
 * @param {string}  options.email    - recipient address
 * @param {string}  options.subject  - subject line
 * @param {string}  options.html     - HTML body
 * @param {string} [options.text]    - optional plain-text fallback (good for
 *                                     deliverability and non-HTML clients)
 * @param {string} [options.replyTo] - address a reply should go to instead of
 *                                     the sending mailbox. Used by the
 *                                     contact-form notification so the team can
 *                                     just hit Reply and reach the customer.
 * @param {Array}  [options.attachments] - nodemailer attachment descriptors,
 *                                     e.g. [{ filename, content: Buffer,
 *                                     contentType }]. Used for the invoice PDF.
 */
const sendEmail = async ({ email, subject, html, text, replyTo, attachments }) => {
    await getTransporter().sendMail({
        // Friendly "From" name; the address itself comes from config so it can
        // differ between environments. Nodemailer derives the envelope sender
        // from this, and providers reject the message outright ("550 Sender
        // address is not allowed") when it isn't an address the authenticated
        // account may send as — so fall back to that account, never to a
        // hard-coded domain we may not even control.
        from: process.env.MAIL_FROM || process.env.MAIL_USERNAME,
        to: email,
        subject,
        html,
        text,
        // Omitted unless set, so the From address stays the reply target for
        // every existing caller.
        ...(replyTo ? { replyTo } : {}),
        // Omitted entirely when there's nothing to attach — nodemailer treats an
        // empty array as a multipart message with no parts.
        ...(attachments?.length ? { attachments } : {})
    });
};

/**
 * Close the pooled SMTP connections.
 *
 * `pool: true` keeps sockets open between messages, and an open socket is a
 * handle that keeps the event loop alive — so a graceful shutdown that doesn't
 * call this waits for the hard timeout instead of exiting cleanly. Safe to call
 * when no transporter was ever created (nothing has sent mail yet).
 */
const closeTransport = () => {
    if (!transporter) return;
    transporter.close();
    transporter = undefined;
};

module.exports = sendEmail;
module.exports.closeTransport = closeTransport;
