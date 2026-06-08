// Models
const SpecialRequest = require("../models/specialRequest.model");

// Utils
const AppError = require("../utils/appError.util");
const catchAsync = require("../utils/catchAsync.util");

// "fRIDGE cleaning" -> "Fridge cleaning". Capitalise the first letter and
// lowercase the rest so the same item can't be stored under different casings.
const formatName = (name) => name[0].toUpperCase() + name.slice(1).toLowerCase();

// GET /api/v1/special-request -> paginated list (public, so the booking wizard
// can show the available add-ons).
const getSpecialRequests = catchAsync(async (req, res, next) => {
    // Query params arrive as strings; sanitise into safe, bounded numbers so a
    // missing/garbage value can't turn the skip/limit maths into NaN.
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

    const [specialRequests, specialRequestCount] = await Promise.all([
        SpecialRequest.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        SpecialRequest.countDocuments()
    ]);

    res.status(200).json({
        status: "success",
        message: "Special requests returned successfully!",
        specialRequestCount,
        data: { specialRequests }
    });
});

// GET /api/v1/special-request/:id -> single item (404 if missing, 400 if id malformed)
const getSpecialRequestById = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const specialRequest = await SpecialRequest.findById(id).lean();

    if (!specialRequest) {
        return next(new AppError("Special request not found!", 404));
    }

    res.status(200).json({
        status: "success",
        message: "Special request returned successfully!",
        data: { specialRequest }
    });
});

// POST /api/v1/special-request -> create an add-on (admin only)
const addSpecialRequest = catchAsync(async (req, res, next) => {
    const { name, description, price, services } = req.body;

    // Guard required fields up-front so we never hit `name[0]` on undefined and
    // the client gets a clear 400. Price is compared against undefined so a
    // legitimate 0 (free add-on) is accepted.
    if (!name || price === undefined) {
        return next(new AppError("Please provide a name and price!", 400));
    }

    const formattedName = formatName(name);

    const exists = await SpecialRequest.findOne({ name: formattedName });

    if (exists) {
        return next(new AppError("Special request already exists!", 409));
    }

    const specialRequest = await SpecialRequest.create({
        name: formattedName,
        description,
        price,
        services
    });

    res.status(201).json({
        status: "success",
        message: "Special request created successfully!",
        data: { specialRequest }
    });
});

// PATCH /api/v1/special-request/:id -> partial update (admin only)
const editSpecialRequest = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { name, description, price, enabled, services = [] } = req.body;

    const specialRequest = await SpecialRequest.findById(id);

    if (!specialRequest) {
        return next(new AppError("Special request not found to edit!", 404));
    }

    if (name) {
        const formattedName = formatName(name);

        // Exclude the current document so renaming an item to its own name
        // doesn't falsely report a duplicate.
        const exists = await SpecialRequest.findOne({ name: formattedName, _id: { $ne: id } });

        if (exists) {
            return next(new AppError("Special request already exists!", 409));
        }

        specialRequest.name = formattedName;
    }

    if (description !== undefined) specialRequest.description = description;
    if (price !== undefined) specialRequest.price = price;
    // Compared against undefined (not truthiness) so `enabled: false` is honoured.
    if (enabled === true || enabled === false) specialRequest.enabled = enabled;
    if (services.length > 0) specialRequest.services = services;

    await specialRequest.save();

    res.status(200).json({
        status: "success",
        message: "Special request edited successfully!",
        data: { specialRequest }
    });
});

// DELETE /api/v1/special-request/:id -> remove an add-on (admin only)
const deleteSpecialRequest = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const specialRequest = await SpecialRequest.findByIdAndDelete(id);

    if (!specialRequest) {
        return next(new AppError("Special request not found to delete!", 404));
    }

    res.status(200).json({
        status: "success",
        message: "Special request deleted successfully!"
    });
});

module.exports = {
    getSpecialRequests,
    getSpecialRequestById,
    addSpecialRequest,
    editSpecialRequest,
    deleteSpecialRequest
};
