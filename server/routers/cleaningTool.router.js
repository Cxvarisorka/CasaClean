// Modules
const express = require('express');

// Controllers
const {
    getCleaningTools,
    getCleaningToolById,
    addCleaningTool,
    editCleaningTool,
    deleteCleaningTool
} = require('../controllers/cleaningTool.controller');

// Middlewares
const { protect, attachUser, restrictTo } = require('../middlewares/protect.middleware');
const validate = require('../middlewares/validate.middleware');

// Validations
const { addCleaningToolSchema, editCleaningToolSchema } = require('../validations/cleaningTool.validation');

const cleaningToolRouter = express.Router();

// Public routes (the booking flow lists the available tools). The list only
// returns enabled tools; attachUser (optional auth, never rejects) lets a
// signed-in admin request the full catalogue with ?includeDisabled=true.
cleaningToolRouter.get('/', attachUser, getCleaningTools);
cleaningToolRouter.get('/:id', getCleaningToolById);

// Admin routes — everything below requires a valid auth cookie AND the admin role.
cleaningToolRouter.use(protect, restrictTo('admin'));
cleaningToolRouter.post('/', validate(addCleaningToolSchema), addCleaningTool);
cleaningToolRouter.route('/:id').patch(validate(editCleaningToolSchema), editCleaningTool).delete(deleteCleaningTool);

module.exports = cleaningToolRouter;
