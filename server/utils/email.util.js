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

    transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT) || 587,
        auth: {
            user: process.env.MAIL_USERNAME,
            pass: process.env.MAIL_PASSWORD
        }
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
 */
const sendEmail = async ({ email, subject, html, text }) => {
    await getTransporter().sendMail({
        // Friendly "From" name; the address itself comes from config so it can
        // differ between environments.
        from: process.env.MAIL_FROM || '"CasaClean" <noreply@casaclean.com>',
        to: email,
        subject,
        html,
        text
    });
};

module.exports = sendEmail;
