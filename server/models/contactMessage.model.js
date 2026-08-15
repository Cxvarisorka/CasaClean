const mongoose = require('mongoose');

const { CONTACT_TOPICS, CONTACT_STATUSES } = require('../utils/contact.util');

// Messages submitted through the public contact form (client/src/features/contact).
//
// The form is unauthenticated, so nothing here is trusted: every field is
// customer-typed text that is validated by Zod on the way in and escaped again
// before it is interpolated into the notification email. No document references
// a User — a visitor doesn't need an account to write to us, and a signed-in
// customer's message is deliberately not linked either (the email they typed is
// the one to reply to).
//
// The team is notified by email on arrival, but the record is the source of
// truth: mail delivery is fire-and-forget precisely so a dead SMTP host can
// never cost us a message.
const contactMessageSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'A contact message must have a sender name.'],
            trim: true
        },
        email: {
            type: String,
            required: [true, 'A contact message must have a reply address.'],
            trim: true,
            lowercase: true
        },
        // Optional — the form marks it as such and plenty of people skip it.
        phone: {
            type: String,
            trim: true,
            default: ''
        },
        // Mirrors CONTACT_TOPICS in client/src/features/contact/validation/contactSchema.js.
        topic: {
            type: String,
            required: [true, 'A contact message must have a topic.'],
            enum: {
                values: CONTACT_TOPICS,
                message: 'Unknown topic.'
            }
        },
        message: {
            type: String,
            required: [true, 'A contact message cannot be empty.'],
            trim: true,
            maxlength: [1000, 'Message cannot exceed 1000 characters']
        },
        // Triage state for the admin inbox. 'new' = nobody has looked at it yet.
        status: {
            type: String,
            enum: CONTACT_STATUSES,
            default: 'new'
        },
        // Stamped when the message is marked handled, cleared when it is
        // reopened, so the inbox can show who dealt with what and when.
        handledAt: {
            type: Date,
            default: null
        },
        handledBy: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            default: null
        },
        // Answers sent from the admin panel, oldest first. Appended only after
        // the email has actually left (POST /contact/:id/reply awaits the send),
        // so this is a record of what the customer received — never of what an
        // admin merely typed. A thread can have several: a first answer, then a
        // follow-up.
        replies: {
            type: [
                {
                    body: { type: String, required: true, trim: true },
                    sentAt: { type: Date, default: Date.now },
                    sentBy: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
                    _id: false
                }
            ],
            default: []
        }
    },
    { timestamps: true, collection: 'contactmessages' }
);

// The admin inbox's only query: newest first, optionally narrowed to one status.
contactMessageSchema.index({ status: 1, createdAt: -1 });
contactMessageSchema.index({ createdAt: -1 });

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
module.exports = ContactMessage;
