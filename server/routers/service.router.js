// Modules
const express = require('express');

// Controllers
const { getServices, getServiceById, createService, deleteService, editService } = require('../controllers/service.controller');

// Middlewares
const { protect, restrictTo } = require('../middlewares/protect.middleware');
const validate = require('../middlewares/validate.middleware');

// Validations
const { createServiceSchema, editServiceSchema } = require('../validations/service.validation');

const serviceRouter = express.Router();

// Public routes (anyone can browse services)
serviceRouter.get('/', getServices);
serviceRouter.get('/:id', getServiceById);

// Admin routes — everything below requires a valid auth cookie AND the admin role.
// protect populates req.user; restrictTo("admin") then gates on the role.
serviceRouter.use(protect, restrictTo('admin'));
serviceRouter.post('/', validate(createServiceSchema), createService);
serviceRouter.route('/:id').delete(deleteService).patch(validate(editServiceSchema), editService);

module.exports = serviceRouter;
