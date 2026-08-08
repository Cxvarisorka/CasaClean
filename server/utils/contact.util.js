// Shared vocabulary for the contact form, kept in one place so the Mongoose
// enum, the Zod schema and the admin status filter can never drift apart.
//
// CONTACT_TOPICS mirrors the dropdown the customer actually sees —
// client/src/features/contact/validation/contactSchema.js. Adding a topic means
// adding it here AND there (plus a `pages.contact.topics.*` string per locale).
const CONTACT_TOPICS = ['general', 'booking', 'pricing', 'partnership', 'support'];

// Triage states for the admin inbox. Deliberately just two: a message has
// either been dealt with or it hasn't.
const CONTACT_STATUSES = ['new', 'handled'];

module.exports = { CONTACT_TOPICS, CONTACT_STATUSES };
