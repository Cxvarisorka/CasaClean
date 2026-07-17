// Modules
const express = require('express');

// Controllers
const {
    getSpecialRequests,
    getSpecialRequestById,
    addSpecialRequest,
    editSpecialRequest,
    deleteSpecialRequest
} = require('../controllers/specialRequest.controller');

// Middlewares
const { protect, attachUser, restrictTo } = require('../middlewares/protect.middleware');
const validate = require('../middlewares/validate.middleware');

// Validations
const { addSpecialRequestSchema, editSpecialRequestSchema } = require('../validations/specialRequest.validation');

const specialRequestRouter = express.Router();

// Public routes (the booking wizard lists the available add-ons). The list only
// returns enabled add-ons; attachUser (optional auth, never rejects) lets a
// signed-in admin request the full catalogue with ?includeDisabled=true.
specialRequestRouter.get('/', attachUser, getSpecialRequests);
specialRequestRouter.get('/:id', getSpecialRequestById);

// Admin routes — everything below requires a valid auth cookie AND the admin role.
specialRequestRouter.use(protect, restrictTo('admin'));
specialRequestRouter.post('/', validate(addSpecialRequestSchema), addSpecialRequest);
specialRequestRouter.route('/:id').patch(validate(editSpecialRequestSchema), editSpecialRequest).delete(deleteSpecialRequest);

module.exports = specialRequestRouter;
