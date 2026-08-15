// Modules
const mongoose = require("mongoose");

// Models
const ContactMessage = require("../models/contactMessage.model");

// Utils
const AppError = require("../utils/appError.util");
const catchAsync = require("../utils/catchAsync.util");
const sendEmail = require("../utils/email.util");
const { contactMessageEmail, contactReplyEmail } = require("../utils/emailTemplates.util");
const { CONTACT_STATUSES } = require("../utils/contact.util");

// Where team notifications go. Falls back to the sending mailbox so a default
// install still reaches somebody; when nothing is configured at all we simply
// skip the email — the message is already stored, and a missing optional
// address must never cost a customer their submission.
const notifyAddress = () =>
    process.env.CONTACT_NOTIFY_EMAIL || process.env.MAIL_FROM || process.env.MAIL_USERNAME;

// Fire-and-forget notification. Awaiting SMTP here would let a slow or dead
// mail host stall (or fail) a request whose real work — persisting the message —
// has already succeeded.
const notifyTeam = (contactMessage) => {
    const email = notifyAddress();
    if (!email) return;

    const { subject, html, text } = contactMessageEmail({
        name: contactMessage.name,
        email: contactMessage.email,
        phone: contactMessage.phone,
        topic: contactMessage.topic,
        message: contactMessage.message,
        submittedAt: contactMessage.createdAt
    });

    sendEmail({
        email,
        subject,
        html,
        text,
        // Reply goes to the customer, not to our own notification mailbox.
        replyTo: contactMessage.email
    }).catch((err) => {
        console.error(`Contact notification failed for message ${contactMessage._id}:`, err.message);
    });
};

// POST /api/v1/contact -> submit a message (public, unauthenticated).
const createContactMessage = catchAsync(async (req, res, next) => {
    const { name, email, phone, topic, message, website } = req.body;

    // Honeypot tripped: answer exactly as if we had accepted it, but store and
    // send nothing. A distinguishable rejection just teaches the bot which field
    // to leave alone next time — which is also why the id is generated rather
    // than nulled: the response body has to match a real one field for field.
    if (typeof website === "string" && website.length > 0) {
        return res.status(201).json({
            status: "success",
            message: "Message received. We'll get back to you shortly!",
            data: {
                contactMessage: { _id: new mongoose.Types.ObjectId(), createdAt: new Date() }
            }
        });
    }

    // Whitelisted explicitly — status/handledAt/handledBy are server-managed and
    // must never be settable from a public request body.
    const contactMessage = await ContactMessage.create({ name, email, phone, topic, message });

    notifyTeam(contactMessage);

    // Nothing useful to echo back to an anonymous sender; the id and timestamp
    // are enough for the client to key a success state on.
    res.status(201).json({
        status: "success",
        message: "Message received. We'll get back to you shortly!",
        data: {
            contactMessage: { _id: contactMessage._id, createdAt: contactMessage.createdAt }
        }
    });
});

// GET /api/v1/contact -> paginated inbox, newest first (admin only).
// Optional filter: ?status=new | handled
const getContactMessages = catchAsync(async (req, res, next) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

    // req.query is NOT covered by sanitizeMongo (body & params only), so the
    // filter value is whitelisted against the enum rather than passed through.
    const filter = {};
    if (CONTACT_STATUSES.includes(req.query.status)) {
        filter.status = req.query.status;
    }

    const hasFilter = Object.keys(filter).length > 0;

    const [contactMessages, contactMessageCount] = await Promise.all([
        ContactMessage.find(filter)
            .populate("handledBy", "fullname email")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        hasFilter ? ContactMessage.countDocuments(filter) : ContactMessage.estimatedDocumentCount()
    ]);

    res.status(200).json({
        status: "success",
        message: "Contact messages returned successfully!",
        contactMessageCount,
        data: { contactMessages }
    });
});

// GET /api/v1/contact/:id -> single message (admin only)
const getContactMessageById = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const contactMessage = await ContactMessage.findById(id)
        .populate("handledBy", "fullname email")
        .lean();

    if (!contactMessage) {
        return next(new AppError("Contact message not found!", 404));
    }

    res.status(200).json({
        status: "success",
        message: "Contact message returned successfully!",
        data: { contactMessage }
    });
});

// PATCH /api/v1/contact/:id -> triage a message (admin only).
// Status is the only writable field: the text is the customer's, not ours.
const updateContactMessageStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body;

    const contactMessage = await ContactMessage.findById(id);

    if (!contactMessage) {
        return next(new AppError("Contact message not found to edit!", 404));
    }

    contactMessage.status = status;
    // Re-stamped on every transition so reopening a message clears a stale
    // "handled by X on Y" line instead of leaving it to mislead the next admin.
    contactMessage.handledAt = status === "handled" ? new Date() : null;
    contactMessage.handledBy = status === "handled" ? req.user._id : null;

    await contactMessage.save();

    res.status(200).json({
        status: "success",
        message: "Contact message updated successfully!",
        data: { contactMessage }
    });
});

// POST /api/v1/contact/:id/reply -> answer the customer by email (admin only).
//
// The recipient, the subject and the quoted original are all derived from the
// stored message; the request supplies only the text. Nothing about who this
// email reaches can be influenced by the request body.
const replyToContactMessage = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { body } = req.body;

    const contactMessage = await ContactMessage.findById(id);

    if (!contactMessage) {
        return next(new AppError("Contact message not found to reply to!", 404));
    }

    const { subject, html, text } = contactReplyEmail({
        customerName: contactMessage.name,
        replyBody: body,
        originalMessage: contactMessage.message,
        originalSentAt: contactMessage.createdAt
    });

    // AWAITED, unlike the arrival notification. An admin pressing Send has to
    // learn whether the mail actually left — showing "sent" for an email that
    // failed is worse than showing an error. Nothing is recorded unless it did.
    try {
        await sendEmail({
            email: contactMessage.email,
            subject,
            html,
            text,
            // Their answer to our answer comes back to the team, not to the
            // no-reply-ish sending mailbox.
            replyTo: notifyAddress()
        });
    } catch (err) {
        // The admin gets a generic message — SMTP errors leak host names, ports
        // and credential hints — but the cause has to survive somewhere, or a
        // deployment where outbound mail is blocked or throttled looks exactly
        // like one where it works. Logged in the same shape as notifyTeam's
        // failure so both mail paths are greppable together.
        console.error(`Contact reply failed for message ${contactMessage._id}:`, err.message);
        return next(new AppError("We couldn't send the reply. Please try again later.", 502));
    }

    // Only now is it true. Replying is handling, so the message is triaged in
    // the same step — an admin should never have to remember a second click.
    contactMessage.replies.push({ body, sentAt: new Date(), sentBy: req.user._id });
    contactMessage.status = "handled";
    contactMessage.handledAt = new Date();
    contactMessage.handledBy = req.user._id;

    await contactMessage.save();

    res.status(200).json({
        status: "success",
        message: "Reply sent successfully!",
        data: { contactMessage }
    });
});

// DELETE /api/v1/contact/:id -> remove a message (admin only).
// Nothing references a contact message, so there is no referential guard here.
const deleteContactMessage = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const contactMessage = await ContactMessage.findByIdAndDelete(id);

    if (!contactMessage) {
        return next(new AppError("Contact message not found to delete!", 404));
    }

    res.status(200).json({
        status: "success",
        message: "Contact message deleted successfully!"
    });
});

module.exports = {
    createContactMessage,
    getContactMessages,
    getContactMessageById,
    updateContactMessageStatus,
    replyToContactMessage,
    deleteContactMessage
};
