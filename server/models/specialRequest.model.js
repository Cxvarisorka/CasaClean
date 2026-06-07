// SpecialRequest
// ----------------
// An optional add-on a customer can attach to a booking, e.g. "Fridge Cleaning",
// "Inside Oven", "Interior Windows". Kept in its own collection (instead of a
// free-text array on the booking) so that:
//   - the admin can manage the catalogue (name, price, enable/disable) centrally,
//   - bookings reference real, priced items by _id instead of arbitrary strings,
//   - pricing/availability can change over time without rewriting past bookings.
//
// A booking links to these via `specialRequests: [ObjectId]` (see booking.model.js).

const mongoose = require("mongoose");

const specialRequestSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "A special request must have a name."],
            unique: true, // DB-level guard; the 11000 handler turns this into a 409
            trim: true
        },
        description: {
            type: String,
            trim: true,
            default: ""
        },
        // Flat surcharge added to the booking total when this request is selected.
        // Defaults to 0 so a request can be free / informational if needed.
        price: {
            type: Number,
            required: [true, "A special request must have a price."],
            min: [0, "Price can't be negative!"],
            default: 0
        },
        enabled: {
            type: Boolean,
            default: true // soft on/off switch so an item can be hidden without deleting it
        }
    },
    { timestamps: true }
);

// Most reads are "list the currently selectable requests", so index the flag.
specialRequestSchema.index({ enabled: 1 });

const SpecialRequest = mongoose.model("SpecialRequest", specialRequestSchema);

module.exports = SpecialRequest;
