// Modules
const express = require('express');

// Controllers
const { getWorkers, getWorker, addWorker, deleteWorker, editWorker } = require('../controllers/worker.controller');

// Middlewares
const { protect, restrictTo } = require('../middlewares/protect.middleware');
const validate = require('../middlewares/validate.middleware');

// Validations
const { addWorkerSchema, editWorkerSchema } = require('../validations/worker.validation');

const workerRouter = express.Router();

// Workers are internal staff whose contact details are PII, so the WHOLE
// resource is admin-only — there is no public listing (unlike city/service).
// protect populates req.user; restrictTo("admin") then gates on the role.
workerRouter.use(protect, restrictTo('admin'));

workerRouter.get('/', getWorkers);
workerRouter.post('/', validate(addWorkerSchema), addWorker);
workerRouter.get('/:id', getWorker);
workerRouter.patch('/:id', validate(editWorkerSchema), editWorker);
workerRouter.delete('/:id', deleteWorker);

module.exports = workerRouter;
