// Modules
const express = require('express');

// Controllers
const { getServices, getServiceById, createService, deleteService, editService } = require('../controllers/service.controller');

// Middlewares
const { protect, restrictTo } = require('../middlewares/protect.middleware');

const serviceRouter = express.Router();

// Public routes (anyone can browse services)
serviceRouter.get('/', getServices);
serviceRouter.get('/:id', getServiceById);

// Admin routes — everything below requires a valid auth cookie AND the admin role.
// protect populates req.user; restrictTo("admin") then gates on the role.
serviceRouter.use(protect, restrictTo('admin'));
serviceRouter.post('/', createService);
serviceRouter.route('/:id').delete(deleteService).patch(editService);

module.exports = serviceRouter;
