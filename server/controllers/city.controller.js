const City = require("../models/city.model");
const Service = require("../models/service.model");
const Booking = require("../models/booking.model");
const Subscription = require("../models/subscription.model");
const AppError = require("../utils/appError.util");
const catchAsync = require("../utils/catchAsync.util");
const formatName = require("../utils/formatName.util");
const { assertNotReferenced } = require("../utils/referentialGuard.util");
const { TRANSLATABLE_FIELDS, normalizeTranslations } = require("../utils/translations.util");

// Blank fields and empty languages are stripped before storing — see
// utils/translations.util.js for why.
const cleanTranslations = (translations) =>
    normalizeTranslations(translations, TRANSLATABLE_FIELDS.city);

// GET /api/v1/city -> paginated list of cities
const getCities = catchAsync(async (req, res) => {
    // Query params arrive as strings; sanitise them into safe, bounded numbers
    // so a missing/garbage value can't turn the skip/limit maths into NaN.
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

    // Soft-disabled cities are an admin concern: the public list (booking
    // wizard) only ever sees enabled records. An admin opts into the full
    // catalogue with ?includeDisabled=true — honoured only when the live DB
    // role is admin (req.user comes from the attachUser middleware).
    const includeDisabled = req.query.includeDisabled === "true" && req.user?.role === "admin";
    const filter = includeDisabled ? {} : { enabled: true };

    // Run the page query and the total count in parallel (independent reads).
    // For the unfiltered admin view, estimatedDocumentCount reads collection
    // metadata (O(1)) instead of scanning every document.
    const [cities, cityCount] = await Promise.all([
        City.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        includeDisabled ? City.estimatedDocumentCount() : City.countDocuments(filter)
    ]);

    res.status(200).json({
        status: "success",
        message: "Cities returned successfully!",
        cityCount,
        length: cities.length,
        data: {
            cities
        }
    });
});

// GET /api/v1/city/:id -> single city (404 if not found, 400 if id malformed)
const getCity = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const city = await City.findById(id).lean();

    if (!city) {
        return next(new AppError("City can't be found!", 404));
    }

    res.status(200).json({
        status: "success",
        message: "City returned successfully!",
        data: {
            city
        }
    });
});

// POST /api/v1/city -> create a city (admin only)
const addCity = catchAsync(async (req, res, next) => {
    const { name, translations, workingHourStarts, workingHourEnds } = req.body;

    // Guard the required fields up-front so we never hit `name[0]` on undefined
    // and so the client gets a clear 400 instead of a generic schema error.
    if (!name || !workingHourStarts || !workingHourEnds) {
        return next(new AppError("Please provide name, workingHourStarts and workingHourEnds!", 400));
    }

    const formattedName = formatName(name);

    const existing = await City.findOne({ name: formattedName });

    if (existing) {
        return next(new AppError("City already exists!", 409));
    }

    const city = await City.create({
        name: formattedName,
        translations: cleanTranslations(translations),
        workingHourStarts,
        workingHourEnds
    });

    res.status(201).json({
        status: "success",
        message: "City added successfully!",
        data: {
            city
        }
    });
});

// DELETE /api/v1/city/:id -> remove a city (admin only)
const deleteCity = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    // Refuse to orphan records that point at this city. Disabling is the
    // supported way to stop offering a city (see referentialGuard.util.js).
    await assertNotReferenced([
        { model: Booking, filter: { cityId: id }, noun: "bookings" },
        { model: Subscription, filter: { cityId: id }, noun: "recurring subscriptions" },
        { model: Service, filter: { cities: id }, noun: "service coverage areas" }
    ], "city");

    const deletedCity = await City.findByIdAndDelete(id);

    if (!deletedCity) {
        return next(new AppError("City can't be found to delete!", 404));
    }

    res.status(200).json({
        status: "success",
        message: "City deleted successfully!"
    });
});

// PATCH /api/v1/city/:id -> partial update (admin only)
const editCity = catchAsync(async (req, res, next) => {
    const { name, translations, workingHourStarts, workingHourEnds, enabled } = req.body;
    const { id } = req.params;

    const city = await City.findById(id);

    if (!city) {
        return next(new AppError("City can't be found to edit!", 404));
    }

    if (name) {
        const formattedName = formatName(name);

        // Don't let a rename collide with another existing city.
        const existing = await City.findOne({ name: formattedName, _id: { $ne: id } });

        if (existing) {
            return next(new AppError("City already exists!", 409));
        }

        city.name = formattedName;
    }

    // Replaced wholesale rather than merged: the panel edits every language in
    // one dialog and posts the complete set, so a locale missing from the body
    // is an explicit "remove this translation". A request that omits the field
    // entirely (e.g. the row-level enable toggle) leaves translations untouched.
    if (translations !== undefined) city.translations = cleanTranslations(translations);

    if (workingHourStarts) city.workingHourStarts = workingHourStarts;
    if (workingHourEnds) city.workingHourEnds = workingHourEnds;
    // Compared against undefined (not truthiness) so `enabled: false` is honoured.
    if (enabled == false || enabled == true) city.enabled = enabled;

    await city.save();

    res.status(200).json({
        status: "success",
        message: "City successfully edited!",
        data: {
            city
        }
    });
});

module.exports = { getCities, getCity, addCity, deleteCity, editCity };
