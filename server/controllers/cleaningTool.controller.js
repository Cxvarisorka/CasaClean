// Models
const CleaningTool = require("../models/cleaningTool.model");
const Service = require("../models/service.model");

// Utils
const AppError = require("../utils/appError.util");
const catchAsync = require("../utils/catchAsync.util");
const formatName = require("../utils/formatName.util");

// Fail closed on the service references: every id must point to a real Service
// document, otherwise a typo would silently create a tool that never matches
// any service. Returns the deduplicated id list to store.
const assertServicesExist = async (services) => {
    const ids = [...new Set(services.map(String))];

    const count = await Service.countDocuments({ _id: { $in: ids } });

    if (count !== ids.length) {
        throw new AppError("One or more services were not found!", 400);
    }

    return ids;
};

// GET /api/v1/cleaning-tool -> paginated list (public, so the booking flow can
// show the tools available for a service).
const getCleaningTools = catchAsync(async (req, res, next) => {
    // Query params arrive as strings; sanitise into safe, bounded numbers so a
    // missing/garbage value can't turn the skip/limit maths into NaN.
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

    // Soft-disabled tools are an admin concern: the public list only ever sees
    // enabled records. An admin opts into the full catalogue with
    // ?includeDisabled=true — honoured only when the live DB role is admin.
    const includeDisabled = req.query.includeDisabled === "true" && req.user?.role === "admin";
    const filter = includeDisabled ? {} : { enabled: true };

    // For the unfiltered admin view, estimatedDocumentCount reads collection
    // metadata (O(1)) instead of scanning every document.
    const [cleaningTools, cleaningToolCount] = await Promise.all([
        CleaningTool.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        includeDisabled ? CleaningTool.estimatedDocumentCount() : CleaningTool.countDocuments(filter)
    ]);

    res.status(200).json({
        status: "success",
        message: "Cleaning tools returned successfully!",
        cleaningToolCount,
        data: { cleaningTools }
    });
});

// GET /api/v1/cleaning-tool/:id -> single item (404 if missing, 400 if id malformed)
const getCleaningToolById = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const cleaningTool = await CleaningTool.findById(id).lean();

    if (!cleaningTool) {
        return next(new AppError("Cleaning tool not found!", 404));
    }

    res.status(200).json({
        status: "success",
        message: "Cleaning tool returned successfully!",
        data: { cleaningTool }
    });
});

// POST /api/v1/cleaning-tool -> create a tool (admin only)
const addCleaningTool = catchAsync(async (req, res, next) => {
    const { name, description, price, services } = req.body;

    // Guard required fields up-front so the client gets a clear 400. Price is
    // compared against undefined so a legitimate 0 (free tool) is accepted.
    if (!name || price === undefined) {
        return next(new AppError("Please provide a name and price!", 400));
    }

    const formattedName = formatName(name);

    const exists = await CleaningTool.findOne({ name: formattedName });

    if (exists) {
        return next(new AppError("Cleaning tool already exists!", 409));
    }

    const serviceIds = Array.isArray(services) && services.length > 0
        ? await assertServicesExist(services)
        : [];

    const cleaningTool = await CleaningTool.create({
        name: formattedName,
        description,
        price,
        services: serviceIds
    });

    res.status(201).json({
        status: "success",
        message: "Cleaning tool created successfully!",
        data: { cleaningTool }
    });
});

// PATCH /api/v1/cleaning-tool/:id -> partial update (admin only)
const editCleaningTool = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { name, description, price, enabled, services } = req.body;

    const cleaningTool = await CleaningTool.findById(id);

    if (!cleaningTool) {
        return next(new AppError("Cleaning tool not found to edit!", 404));
    }

    if (name) {
        const formattedName = formatName(name);

        // Exclude the current document so renaming a tool to its own name
        // doesn't falsely report a duplicate.
        const exists = await CleaningTool.findOne({ name: formattedName, _id: { $ne: id } });

        if (exists) {
            return next(new AppError("Cleaning tool already exists!", 409));
        }

        cleaningTool.name = formattedName;
    }

    if (description !== undefined) cleaningTool.description = description;
    if (price !== undefined) cleaningTool.price = price;
    // Compared against undefined (not truthiness) so `enabled: false` is honoured.
    if (enabled === true || enabled === false) cleaningTool.enabled = enabled;
    // An explicit empty array is honoured — it resets the tool to "all services".
    if (Array.isArray(services)) {
        cleaningTool.services = services.length > 0 ? await assertServicesExist(services) : [];
    }

    await cleaningTool.save();

    res.status(200).json({
        status: "success",
        message: "Cleaning tool edited successfully!",
        data: { cleaningTool }
    });
});

// DELETE /api/v1/cleaning-tool/:id -> remove a tool (admin only)
const deleteCleaningTool = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const cleaningTool = await CleaningTool.findByIdAndDelete(id);

    if (!cleaningTool) {
        return next(new AppError("Cleaning tool not found to delete!", 404));
    }

    res.status(200).json({
        status: "success",
        message: "Cleaning tool deleted successfully!"
    });
});

module.exports = {
    getCleaningTools,
    getCleaningToolById,
    addCleaningTool,
    editCleaningTool,
    deleteCleaningTool
};
