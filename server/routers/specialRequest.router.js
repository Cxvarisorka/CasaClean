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
const { protect, restrictTo } = require('../middlewares/protect.middleware');

const specialRequestRouter = express.Router();

// Public routes (the booking wizard lists the available add-ons)
specialRequestRouter.get('/', getSpecialRequests);
specialRequestRouter.get('/:id', getSpecialRequestById);

// Admin routes — everything below requires a valid auth cookie AND the admin role.
specialRequestRouter.use(protect, restrictTo('admin'));
specialRequestRouter.post('/', addSpecialRequest);
specialRequestRouter.route('/:id').patch(editSpecialRequest).delete(deleteSpecialRequest);

module.exports = specialRequestRouter;
