// Models
const Service = require("../models/service.model");
const City = require("../models/city.model");

// Utils
const AppError = require("../utils/appError.util");
const catchAsync = require("../utils/catchAsync.util");
const SpecialRequest = require("../models/specialRequest.model");
const CleaningTool = require("../models/cleaningTool.model");
const Booking = require("../models/booking.model");
const Subscription = require("../models/subscription.model");
const Review = require("../models/review.model");
const formatName = require("../utils/formatName.util");
const { assertNotReferenced } = require("../utils/referentialGuard.util");
const {
    MIN_INTERVAL_DAYS,
    MAX_INTERVAL_DAYS,
    isValidIntervalDays
} = require("../utils/date.util");
const { serviceImageUrl, removeServiceImage } = require("../utils/upload.util");
const { TRANSLATABLE_FIELDS, normalizeTranslations } = require("../utils/translations.util");

/**
 * The image value to store for a write request.
 *
 * A multipart upload (req.file, put there by multer) always wins — the file is
 * already on disk, so the document must point at it. Otherwise the body's
 * `image` field is used, which lets an admin keep supplying a hosted URL (or
 * send "" to clear the image) without uploading anything.
 */
const resolveImage = (req) =>
    req.file ? serviceImageUrl(req.file.filename) : req.body.image;

// Blank fields and empty languages are stripped before storing — see
// utils/translations.util.js for why.
const cleanTranslations = (translations) =>
    normalizeTranslations(translations, TRANSLATABLE_FIELDS.service);

/**
 * Resolve and validate the coverage a service should have ("all cities",
 * "one city" or "multiple cities") from the request body.
 *
 * Accepts:
 *   - allCities: true                       -> service is offered everywhere
 *   - cities: "<id>"                        -> a single city (string)
 *   - cities: ["<id>", "<id>", ...]         -> one or many cities (array)
 *
 * Returns { allCities, cities } ready to be stored, or throws an AppError
 * (caught by catchAsync) when the input is invalid.
 */
const resolveCoverage = async (allCities, cities) => {
    // "All cities" wins outright — no explicit list is needed or kept.
    if (allCities === true) {
        return { allCities: true, cities: [] };
    }

    // Normalise to an array so a single id and a list are handled the same way.
    const cityIds = Array.isArray(cities) ? cities : cities ? [cities] : [];

    // When not targeting all cities, at least one city must be provided.
    if (cityIds.length === 0) {
        throw new AppError("Please select at least one city, or set allCities to true!", 400);
    }

    // Drop duplicate ids (e.g. the same city sent twice from the UI).
    const uniqueCityIds = [...new Set(cityIds.map(String))];

    // Every id must point to a city that actually exists, otherwise we'd store
    // dangling references that break population later on.
    const foundCount = await City.countDocuments({ _id: { $in: uniqueCityIds } });

    if (foundCount !== uniqueCityIds.length) {
        throw new AppError("One or more selected cities do not exist!", 400);
    }

    return { allCities: false, cities: uniqueCityIds };
};

/**
 * Resolve and validate which special-request add-ons a service enables.
 *
 * Accepts:
 *   - allSpecialRequests: true            -> every add-on is offered; list cleared
 *   - specialRequests: "<id>" | ["<id>"]  -> only the listed add-ons
 *   - empty / nothing                     -> the service offers no add-ons
 *
 * Returns { allSpecialRequests, specialRequests } ready to store, or throws an
 * AppError (caught by catchAsync) when an id doesn't reference a real add-on.
 * Mirrors resolveCoverage; an empty selection is valid (unlike cities, a service
 * is allowed to have no special requests).
 */
const resolveSpecialRequest = async (allSpecialRequests, specialRequests) => {
    if (allSpecialRequests === true) {
        return { allSpecialRequests: true, specialRequests: [] };
    }

    const ids = Array.isArray(specialRequests)
        ? specialRequests
        : specialRequests ? [specialRequests] : [];

    if (ids.length === 0) {
        return { allSpecialRequests: false, specialRequests: [] };
    }

    // Drop duplicate ids (e.g. the same add-on sent twice from the UI).
    const uniqueIds = [...new Set(ids.map(String))];

    // Every id must point to a special request that actually exists, otherwise
    // we'd store dangling references that break population later on.
    const foundCount = await SpecialRequest.countDocuments({ _id: { $in: uniqueIds } });

    if (foundCount !== uniqueIds.length) {
        throw new AppError("One or more selected special requests do not exist!", 400);
    }

    return { allSpecialRequests: false, specialRequests: uniqueIds };
};

/**
 * Resolve and validate whether a service can be booked on a recurring schedule,
 * and on which cadences.
 *
 * Accepts:
 *   - recurringEnabled: false / absent      -> one-off only; list cleared
 *   - recurringEnabled: true, no list       -> the customer picks any cadence
 *                                              between MIN and MAX days
 *   - recurringEnabled: true, [7, 14]       -> only those cadences are offered
 *
 * Returns { recurringEnabled, recurringIntervalDays } ready to store. Values are
 * deduplicated and sorted so the stored list is directly renderable; anything
 * outside the accepted range throws (Zod already bounds it — this is the same
 * defense-in-depth the coverage resolver applies).
 */
const resolveRecurrence = (recurringEnabled, recurringIntervalDays) => {
    // Not recurring wins outright — no cadence list is needed or kept.
    if (recurringEnabled !== true) {
        return { recurringEnabled: false, recurringIntervalDays: [] };
    }

    const raw = Array.isArray(recurringIntervalDays)
        ? recurringIntervalDays
        : recurringIntervalDays !== undefined && recurringIntervalDays !== null
            ? [recurringIntervalDays]
            : [];

    // An empty list is valid and meaningful: it means "no cadence restriction".
    if (raw.length === 0) {
        return { recurringEnabled: true, recurringIntervalDays: [] };
    }

    const intervals = [...new Set(raw.map(Number))].sort((a, b) => a - b);

    if (!intervals.every(isValidIntervalDays)) {
        throw new AppError(
            `Recurring intervals must be whole numbers between ${MIN_INTERVAL_DAYS} and ${MAX_INTERVAL_DAYS} days!`,
            400
        );
    }

    return { recurringEnabled: true, recurringIntervalDays: intervals };
};

// GET /api/v1/service -> paginated list of services
const getServices = catchAsync(async (req, res, next) => {
    // Query params arrive as strings; sanitise them into safe, bounded numbers
    // so a missing/garbage value can't turn the skip/limit maths into NaN.
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

    // Soft-disabled services are an admin concern: the public list (homepage,
    // booking wizard) only ever sees enabled records. An admin opts into the
    // full catalogue with ?includeDisabled=true — honoured only when the live
    // DB role is admin (req.user comes from the attachUser middleware).
    const includeDisabled = req.query.includeDisabled === "true" && req.user?.role === "admin";
    const filter = includeDisabled ? {} : { enabled: true };

    // Run the page query and the total count in parallel (independent reads).
    // For the unfiltered admin view, estimatedDocumentCount reads collection
    // metadata (O(1)) instead of scanning every document.
    const [services, serviceCount] = await Promise.all([
        Service.find(filter)
            .populate("cities")
            .populate("specialRequests")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        includeDisabled ? Service.estimatedDocumentCount() : Service.countDocuments(filter)
    ]);

    res.status(200).json({
        status: "success",
        message: "Services returned successfully!",
        serviceCount,
        data: {
            services
        }
    });
});

// GET /api/v1/service/:id -> single service (404 if not found, 400 if id malformed)
const getServiceById = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const service = await Service.findById(id).populate("cities").populate("specialRequests");

    if (!service) {
        return next(new AppError("Service not found!", 404));
    }

    res.status(200).json({
        status: "success",
        message: "Service returned successfully!",
        data: {
            service
        }
    });
});

// POST /api/v1/service -> create a service (admin only)
const createService = catchAsync(async (req, res, next) => {
    const { name, subtitle, description, includes, translations, pricePerHour, allCities, cities, allSpecialRequests, specialRequests, recurringEnabled, recurringIntervalDays } = req.body;

    // An uploaded file (multipart) takes precedence over an `image` URL in the
    // body. Any failure below leaves the file orphaned on disk — the service
    // router's cleanup handler unlinks it.
    const image = resolveImage(req);

    // Guard required fields up-front so we never hit `name[0]` on undefined and
    // the client gets a clear 400 instead of a generic schema error.
    if (!name || !description || pricePerHour === undefined) {
        return next(new AppError("Please provide name, description and pricePerHour!", 400));
    }

    const formattedName = formatName(name);

    // findOne (not find) — find returns an array, and `[]` is truthy, which
    // would make the duplicate check always fire.
    const exists = await Service.findOne({ name: formattedName });

    if (exists) {
        return next(new AppError("Service already exists!", 409));
    }

    // Validate the chosen coverage (all / one / multiple cities).
    const coverage = await resolveCoverage(allCities, cities);
    const specialRequest = await resolveSpecialRequest(allSpecialRequests, specialRequests);
    const recurrence = resolveRecurrence(recurringEnabled, recurringIntervalDays);

    const service = await Service.create({
        name: formattedName,
        subtitle,
        description,
        image,
        // Drop empty/blank entries so the card never renders an empty bullet.
        includes: Array.isArray(includes) ? includes.map((i) => i.trim()).filter(Boolean) : undefined,
        translations: cleanTranslations(translations),
        pricePerHour,
        ...coverage,
        ...specialRequest,
        ...recurrence
    });

    res.status(201).json({
        status: "success",
        message: "Service created successfully!",
        data: {
            service
        }
    });
});

// PATCH /api/v1/service/:id -> partial update (admin only)
const editService = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { name, subtitle, description, includes, translations, pricePerHour, enabled, allCities, cities, allSpecialRequests, specialRequests, recurringEnabled, recurringIntervalDays } = req.body;

    const image = resolveImage(req);

    const service = await Service.findById(id);

    if (!service) {
        return next(new AppError("Service not found to edit!", 404));
    }

    // Remembered so a replaced/cleared upload can be unlinked after the save
    // succeeds (never before — a failed save must leave the old file in place).
    const previousImage = service.image;

    if (name) {
        const formattedName = formatName(name);

        // Exclude the current document so renaming a service to its own name
        // (or just re-saving) doesn't falsely report a duplicate.
        const exists = await Service.findOne({ name: formattedName, _id: { $ne: id } });

        if (exists) {
            return next(new AppError("Service already exists!", 409));
        }

        service.name = formattedName;
    }

    // Compared against undefined so an explicit "" clears the subtitle/image.
    if (subtitle !== undefined) service.subtitle = subtitle;
    if (description) service.description = description;
    if (image !== undefined) service.image = image;
    if (includes !== undefined) {
        service.includes = Array.isArray(includes)
            ? includes.map((i) => i.trim()).filter(Boolean)
            : [];
    }
    // Replaced wholesale rather than merged: the panel edits every language in
    // one dialog and posts the complete set, so a locale missing from the body
    // is an explicit "remove this translation". A request that omits the field
    // entirely (e.g. the row-level enable toggle) leaves translations untouched.
    if (translations !== undefined) {
        service.translations = cleanTranslations(translations);
    }
    if (pricePerHour !== undefined) service.pricePerHour = pricePerHour;
    // Compared against undefined (not truthiness) so `enabled: false` is honoured.
    if (enabled === false || enabled === true) service.enabled = enabled;

    // Only touch coverage when the client actually sent a coverage field, so a
    // plain rename/price edit leaves the existing cities untouched.
    if (allCities !== undefined || cities !== undefined) {
        const coverage = await resolveCoverage(
            allCities !== undefined ? allCities : service.allCities,
            cities !== undefined ? cities : service.cities
        );

        service.allCities = coverage.allCities;
        service.cities = coverage.cities;
    }

    // Likewise, only touch the special-request selection when the client sent one.
    if (allSpecialRequests !== undefined || specialRequests !== undefined) {
        const resolved = await resolveSpecialRequest(
            allSpecialRequests !== undefined ? allSpecialRequests : service.allSpecialRequests,
            specialRequests !== undefined ? specialRequests : service.specialRequests
        );

        service.allSpecialRequests = resolved.allSpecialRequests;
        service.specialRequests = resolved.specialRequests;
    }

    // Likewise for recurrence: a plain rename must not silently turn a recurring
    // service into a one-off one (recurringEnabled would read as undefined).
    if (recurringEnabled !== undefined || recurringIntervalDays !== undefined) {
        const recurrence = resolveRecurrence(
            recurringEnabled !== undefined ? recurringEnabled : service.recurringEnabled,
            recurringIntervalDays !== undefined ? recurringIntervalDays : service.recurringIntervalDays
        );

        service.recurringEnabled = recurrence.recurringEnabled;
        service.recurringIntervalDays = recurrence.recurringIntervalDays;
    }

    await service.save();

    // The old file is only garbage once the new value is durably stored.
    // Best-effort and non-blocking: a stale file must never fail the request.
    if (previousImage && previousImage !== service.image) {
        removeServiceImage(previousImage);
    }

    res.status(200).json({
        status: "success",
        message: "Service edited successfully!",
        data: {
            service
        }
    });
});

// DELETE /api/v1/service/:id -> remove a service (admin only)
const deleteService = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    // A deleted service breaks every record pointing at it — and an active
    // recurring plan would only find out when its next charge fails reference
    // resolution. Disable instead (see referentialGuard.util.js).
    await assertNotReferenced([
        { model: Booking, filter: { serviceId: id }, noun: "bookings" },
        { model: Subscription, filter: { serviceId: id }, noun: "recurring subscriptions" },
        { model: Review, filter: { service_id: id }, noun: "reviews" },
        { model: CleaningTool, filter: { services: id }, noun: "cleaning tool restrictions" }
    ], "service");

    const service = await Service.findByIdAndDelete(id);

    if (!service) {
        return next(new AppError("Service not found to delete!", 404));
    }

    // Nothing references the cover image any more — drop it from disk too.
    removeServiceImage(service.image);

    res.status(200).json({
        status: "success",
        message: "Service deleted successfully!"
    });
});

module.exports = { getServices, getServiceById, createService, deleteService, editService };
