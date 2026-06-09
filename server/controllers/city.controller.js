const City = require("../models/city.model");
const AppError = require("../utils/appError.util");
const catchAsync = require("../utils/catchAsync.util");
const formatName = require("../utils/formatName.util");

// GET /api/v1/city -> paginated list of cities
const getCities = catchAsync(async (req, res) => {
    // Query params arrive as strings; sanitise them into safe, bounded numbers
    // so a missing/garbage value can't turn the skip/limit maths into NaN.
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

    // Run the page query and the total count in parallel (independent reads).
    const [cities, cityCount] = await Promise.all([
        City.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        City.countDocuments()
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
    const { name, workingHourStarts, workingHourEnds } = req.body;

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

    const city = await City.create({ name: formattedName, workingHourStarts, workingHourEnds });

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
    const { name, workingHourStarts, workingHourEnds, enabled } = req.body;
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
