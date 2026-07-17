// Reference shape of a service record (from the original seed data).
// NOTE: the localized name/description fields (name_it/name_ka/name_ru, ...) are
// not modelled yet — add them here if/when multilingual support is needed.
//   {
//     "id": 1,
//     "name": "Regular Cleaning",
//     "description": "Weekly or bi-weekly cleaning for homes",
//     "price_per_hour": 19.9,
//     "enabled": true
//   }

const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Service name is required!"],
        unique: true, // DB-level guard; the 11000 handler turns this into a 409
        trim: true
    },
    // Short marketing sub-title shown under the name on the service card.
    subtitle: {
        type: String,
        trim: true,
        default: ""
    },
    description: {
        type: String,
        required: [true, "Service description is required!"]
    },
    // Presentation image for the service card. Stored as a string the frontend
    // can render directly — either a hosted URL or an inline data URL (the admin
    // upload is visual-only for now, so no external file store is involved).
    image: {
        type: String,
        default: ""
    },
    // Bullet list of what the service includes, rendered as ticked features on
    // the marketing card.
    includes: {
        type: [String],
        default: []
    },
    pricePerHour: {
        type: Number,
        required: [true, "Price is required!"],
        min: [0, "Price can't be negative!"]
    },
    // Coverage model: a service is offered either in every city or in an
    // explicit subset of cities.
    //   - allCities: true  -> available everywhere; `cities` is ignored/empty.
    //   - allCities: false -> available only in the cities listed in `cities`.
    allCities: {
        type: Boolean,
        default: false
    },
    // References to City documents the service is offered in. Only meaningful
    // when allCities is false. Validated in the controller against real cities.
    cities: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "City"
        }
    ],
    enabled: {
        type: Boolean,
        default: true // soft on/off switch so a service can be hidden without deleting it
    },

    allSpecialRequests: {
        type: Boolean,
        default: false // if true, all special requests are available for this service; otherwise only those listed in `specialRequests`
    },

    specialRequests: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SpecialRequest"
        }
    ]
    
}, { timestamps: true });

// Guarantee a consistent coverage state: when allCities is true we never keep a
// stale city list around, so consumers can rely on the flag alone.
// NOTE: Mongoose 9 dropped the callback-style `next` for document middleware
// (see user.model.js, which already uses the no-arg form). A synchronous hook
// just returns — keeping the `next` parameter throws "next is not a function".
serviceSchema.pre("save", function () {
    if (this.allCities) this.cities = [];
});

serviceSchema.index({ allCities: 1, enabled: 1 });

serviceSchema.index({ cities: 1, enabled: 1 });

const Service = mongoose.model("Service", serviceSchema);

module.exports = Service;
