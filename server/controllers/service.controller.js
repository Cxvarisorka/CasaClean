// Models
const Service = require("../models/service.model");
const City = require("../models/city.model");

// Utils
const AppError = require("../utils/appError.util");
const catchAsync = require("../utils/catchAsync.util");
const SpecialRequest = require("../models/specialRequest.model");
const formatName = require("../utils/formatName.util");

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

// GET /api/v1/service -> paginated list of services
const getServices = catchAsync(async (req, res, next) => {
    // Query params arrive as strings; sanitise them into safe, bounded numbers
    // so a missing/garbage value can't turn the skip/limit maths into NaN.
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

    // Run the page query and the total count in parallel (independent reads).
    const [services, serviceCount] = await Promise.all([
        Service.find()
            .populate("cities")
            .populate("specialRequests")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Service.countDocuments()
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
    const { name, subtitle, description, image, includes, pricePerHour, allCities, cities, allSpecialRequests, specialRequests } = req.body;

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

    const service = await Service.create({
        name: formattedName,
        subtitle,
        description,
        image,
        // Drop empty/blank entries so the card never renders an empty bullet.
        includes: Array.isArray(includes) ? includes.map((i) => i.trim()).filter(Boolean) : undefined,
        pricePerHour,
        ...coverage,
        ...specialRequest
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
    const { name, subtitle, description, image, includes, pricePerHour, enabled, allCities, cities, allSpecialRequests, specialRequests } = req.body;

    const service = await Service.findById(id);

    if (!service) {
        return next(new AppError("Service not found to edit!", 404));
    }

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

    await service.save();

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

    const service = await Service.findByIdAndDelete(id);

    if (!service) {
        return next(new AppError("Service not found to delete!", 404));
    }

    res.status(200).json({
        status: "success",
        message: "Service deleted successfully!"
    });
});

module.exports = { getServices, getServiceById, createService, deleteService, editService };
