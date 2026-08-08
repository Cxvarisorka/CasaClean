// Modules
const express = require('express');

// Controllers
const { getServices, getServiceById, createService, deleteService, editService } = require('../controllers/service.controller');

// Middlewares
const { protect, attachUser, restrictTo } = require('../middlewares/protect.middleware');
const validate = require('../middlewares/validate.middleware');
const sanitizeMongo = require('../middlewares/sanitize.middleware');
const coerceMultipart = require('../middlewares/multipart.middleware');
const { uploadServiceImage } = require('../middlewares/upload.middleware');

// Utils
const { removeServiceImage, serviceImageUrl } = require('../utils/upload.util');

// Validations
const { createServiceSchema, editServiceSchema } = require('../validations/service.validation');

const serviceRouter = express.Router();

// Public routes (anyone can browse services). The list only returns enabled
// services; attachUser (optional auth, never rejects) lets a signed-in admin
// request the full catalogue with ?includeDisabled=true.
serviceRouter.get('/', attachUser, getServices);
serviceRouter.get('/:id', getServiceById);

// Admin routes — everything below requires a valid auth cookie AND the admin role.
// protect populates req.user; restrictTo("admin") then gates on the role.
serviceRouter.use(protect, restrictTo('admin'));

// Write pipeline for the two routes that accept a cover image.
//   uploadServiceImage — multer; parses `multipart/form-data` (file → req.file,
//                        text fields → req.body) and no-ops on JSON bodies.
//   sanitizeMongo      — re-run here because the app-level pass happens before
//                        multer populates req.body on a multipart request.
//   coerceMultipart    — re-types the non-string fields multipart flattened to
//                        strings, so the strict Zod schema below is unchanged.
const parseServiceBody = [
    uploadServiceImage,
    sanitizeMongo,
    coerceMultipart({
        numbers: ['pricePerHour'],
        booleans: ['allCities', 'allSpecialRequests', 'enabled', 'recurringEnabled'],
        arrays: ['includes', 'cities', 'specialRequests', 'recurringIntervalDays'],
        objects: ['translations']
    })
];

serviceRouter.post('/', parseServiceBody, validate(createServiceSchema), createService);
serviceRouter
    .route('/:id')
    .delete(deleteService)
    .patch(parseServiceBody, validate(editServiceSchema), editService);

// Orphan cleanup. multer has already written the file to disk by the time
// validation or the controller rejects the request, so any failure downstream
// of the upload would otherwise leave a file nothing references. Runs before the
// global error handler and always re-throws — it only tidies up.
serviceRouter.use((err, req, res, next) => {
    if (req.file) {
        removeServiceImage(serviceImageUrl(req.file.filename));
    }
    next(err);
});

module.exports = serviceRouter;
