// Modules
const express = require('express');

// Controllers
const {
    createContactMessage,
    getContactMessages,
    getContactMessageById,
    updateContactMessageStatus,
    replyToContactMessage,
    deleteContactMessage
} = require('../controllers/contactMessage.controller');

// Middlewares
const { protect, restrictTo } = require('../middlewares/protect.middleware');
const validate = require('../middlewares/validate.middleware');
const { contactLimiter, contactReplyLimiter } = require('../middlewares/rateLimit.middleware');

// Validations
const {
    createContactMessageSchema,
    updateContactMessageSchema,
    replyContactMessageSchema
} = require('../validations/contactMessage.validation');

const contactMessageRouter = express.Router();

// Public: the website contact form. Unauthenticated by design, so it leans on
// three separate guards — csrfGuard (a cross-site form can't set
// X-Requested-With), contactLimiter (per-IP volume) and a honeypot field the
// controller drops silently. Standard order: rate limiter -> validate -> controller.
contactMessageRouter.post('/', contactLimiter, validate(createContactMessageSchema), createContactMessage);

// Admin inbox — everything below requires a valid auth cookie AND the admin role.
contactMessageRouter.use(protect, restrictTo('admin'));

contactMessageRouter.get('/', getContactMessages);

// Answer the customer by email. Declared before the dynamic '/:id' routes so the
// literal segment is unambiguous.
contactMessageRouter.post(
    '/:id/reply',
    contactReplyLimiter,
    validate(replyContactMessageSchema),
    replyToContactMessage
);

contactMessageRouter.route('/:id')
    .get(getContactMessageById)
    .patch(validate(updateContactMessageSchema), updateContactMessageStatus)
    .delete(deleteContactMessage);

module.exports = contactMessageRouter;
