const Worker = require("../models/worker.model");
const AppError = require("../utils/appError.util");
const catchAsync = require("../utils/catchAsync.util");

// Optional contact fields arrive trimmed from the Zod layer; the admin form
// sends "" to clear one. Normalise an empty/whitespace value to null so the
// stored document is consistent (never an empty string).
const normalizeOptional = (value) => {
    if (value === undefined) return undefined; // not supplied → leave untouched
    const trimmed = String(value).trim();
    return trimmed === "" ? null : trimmed;
};

// GET /api/v1/worker -> paginated list of workers (admin only)
const getWorkers = catchAsync(async (req, res) => {
    // Query params arrive as strings; sanitise them into safe, bounded numbers
    // so a missing/garbage value can't turn the skip/limit maths into NaN.
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

    // Run the page query and the total count in parallel (independent reads).
    const [workers, workerCount] = await Promise.all([
        Worker.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Worker.countDocuments()
    ]);

    res.status(200).json({
        status: "success",
        message: "Workers returned successfully!",
        workerCount,
        length: workers.length,
        data: {
            workers
        }
    });
});

// GET /api/v1/worker/:id -> single worker (404 if not found, 400 if id malformed)
const getWorker = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const worker = await Worker.findById(id).lean();

    if (!worker) {
        return next(new AppError("Worker can't be found!", 404));
    }

    res.status(200).json({
        status: "success",
        message: "Worker returned successfully!",
        data: {
            worker
        }
    });
});

// POST /api/v1/worker -> create a worker (admin only)
const addWorker = catchAsync(async (req, res, next) => {
    const { fullname, email, phone } = req.body;

    if (!fullname) {
        return next(new AppError("Please provide the worker's full name!", 400));
    }

    // fullname is stored as typed (Zod already trimmed it); unlike a city name
    // we don't force casing — a person's name may legitimately be mixed-case.
    const worker = await Worker.create({
        fullname,
        email: normalizeOptional(email),
        phone: normalizeOptional(phone)
    });

    res.status(201).json({
        status: "success",
        message: "Worker added successfully!",
        data: {
            worker
        }
    });
});

// DELETE /api/v1/worker/:id -> remove a worker (admin only)
const deleteWorker = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const deletedWorker = await Worker.findByIdAndDelete(id);

    if (!deletedWorker) {
        return next(new AppError("Worker can't be found to delete!", 404));
    }

    res.status(200).json({
        status: "success",
        message: "Worker deleted successfully!"
    });
});

// PATCH /api/v1/worker/:id -> partial update (admin only)
const editWorker = catchAsync(async (req, res, next) => {
    const { fullname, email, phone, enabled } = req.body;
    const { id } = req.params;

    const worker = await Worker.findById(id);

    if (!worker) {
        return next(new AppError("Worker can't be found to edit!", 404));
    }

    if (fullname) worker.fullname = fullname;
    // email/phone are optional and clearable — compared against undefined (not
    // truthiness) so an explicit "" wipes a previously stored value.
    if (email !== undefined) worker.email = normalizeOptional(email);
    if (phone !== undefined) worker.phone = normalizeOptional(phone);
    // Compared against undefined (not truthiness) so `enabled: false` is honoured.
    if (enabled === false || enabled === true) worker.enabled = enabled;

    await worker.save();

    res.status(200).json({
        status: "success",
        message: "Worker successfully edited!",
        data: {
            worker
        }
    });
});

module.exports = { getWorkers, getWorker, addWorker, deleteWorker, editWorker };
