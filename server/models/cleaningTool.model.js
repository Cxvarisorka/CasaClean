// CleaningTool
// ------------
// A physical tool/supply the company can bring to a job, e.g. "Mop",
// "Vacuum cleaner", "Steam cleaner". Kept in its own collection so that:
//   - the admin can manage the catalogue (name, surcharge, enable/disable) centrally,
//   - each tool declares which services it can be used on,
//   - pricing/availability can change over time without touching services.
//
// `services` holds the Service ids the tool is usable on. An empty array means
// the tool is available for every service (mirrors how a Service with
// `allCities` skips the explicit city list).

const mongoose = require("mongoose");

const cleaningToolSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "A cleaning tool must have a name."],
            unique: true, // DB-level guard; the 11000 handler turns this into a 409
            trim: true
        },
        description: {
            type: String,
            trim: true,
            default: ""
        },
        // Services this tool can be used on; empty = usable on all services.
        services: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
            default: []
        },
        // Flat surcharge added when the tool is requested. Defaults to 0 so a
        // tool can be free / informational if needed.
        price: {
            type: Number,
            required: [true, "A cleaning tool must have a price."],
            min: [0, "Price can't be negative!"],
            default: 0
        },
        enabled: {
            type: Boolean,
            default: true // soft on/off switch so a tool can be hidden without deleting it
        }
    },
    { timestamps: true }
);

// Most reads are "list the currently selectable tools", so index the flag.
cleaningToolSchema.index({ enabled: 1 });

const CleaningTool = mongoose.model("CleaningTool", cleaningToolSchema);

module.exports = CleaningTool;
