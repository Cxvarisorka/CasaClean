const mongoose = require('mongoose');

// Worker
// ------
// A member of cleaning staff that an admin can assign to a booking. Only the
// full name is required; email and phone are optional contact details (a worker
// may have neither on file). Field names are camelCase to match the rest of the
// models. All worker management is admin-only (see routers/worker.router.js).
const workerSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: [true, "A worker must have a full name."],
        trim: true
    },
    // Optional — many cleaners don't have a work email on file. Lowercased and
    // trimmed for consistency, but NOT marked unique (two workers could legibly
    // share a household email, and the field is allowed to be absent entirely).
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: null
    },
    phone: {
        type: String,
        trim: true,
        default: null
    },
    enabled: {
        type: Boolean,
        default: true                    // soft on/off switch so a worker can be hidden without deleting
    }
}, {
    timestamps: true
});

workerSchema.index({ enabled: 1 });

const Worker = mongoose.model('Worker', workerSchema);

module.exports = Worker;
