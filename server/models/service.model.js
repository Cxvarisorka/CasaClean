// Reference shape of a service record (from the original seed data).
//   {
//     "id": 1,
//     "name": "Regular Cleaning",
//     "description": "Weekly or bi-weekly cleaning for homes",
//     "price_per_hour": 19.9,
//     "enabled": true
//   }
// Localized copy lives in `translations` (see below): the root text fields hold
// the default locale, `translations.<locale>` overrides them per language.

const mongoose = require("mongoose");

const {
    MIN_INTERVAL_DAYS,
    MAX_INTERVAL_DAYS,
    isValidIntervalDays
} = require("../utils/date.util");

const { translationsPath } = require("./translations.schema");
const { TRANSLATABLE_FIELDS } = require("../utils/translations.util");

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
    // resolves against the API origin — normally a relative path to a file this
    // server holds (`/uploads/services/…`, written by the multer upload), but a
    // hosted HTTPS URL or a legacy inline data URL is equally valid.
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
    // Per-language overrides of the four customer-facing text fields above
    // (name / subtitle / description / includes), keyed by locale code.
    // See utils/translations.util.js for the shared contract.
    translations: translationsPath(TRANSLATABLE_FIELDS.service),
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
    ],

    // Same-day ("instant") booking. Every service is normally bookable only
    // ADVANCE_BOOKING_HOURS ahead (utils/leadTime.util.js) so the visit can be
    // staffed; a service the business can genuinely turn around today opts out
    // of that wait here. Default false — fail-closed, and the value every
    // service written before this feature reads as.
    //
    // It removes ONLY the notice period. The city's working hours, the duration
    // fitting inside them and "not already past" still apply, so an instant
    // service still can't be booked for a time this morning.
    allowInstantBooking: {
        type: Boolean,
        default: false
    },

    // Recurrence model: not every service makes sense on a repeating schedule
    // (a one-off deep clean doesn't), so it is opt-in per service.
    //   - recurringEnabled: false -> the service can only be booked once;
    //                                `recurringIntervalDays` is ignored/empty.
    //   - recurringEnabled: true  -> the service can carry a recurring plan.
    recurringEnabled: {
        type: Boolean,
        default: false
    },

    // Optional cadence whitelist, in days. Empty means "the customer chooses",
    // bounded by MIN_INTERVAL_DAYS..MAX_INTERVAL_DAYS (every day up to every two
    // weeks). A non-empty list pins the service to exactly those cadences.
    recurringIntervalDays: {
        type: [Number],
        default: [],
        validate: {
            validator: (values) => (values || []).every(isValidIntervalDays),
            message: `Recurring intervals must be whole numbers between ${MIN_INTERVAL_DAYS} and ${MAX_INTERVAL_DAYS} days!`
        }
    }

}, { timestamps: true });

// Guarantee a consistent coverage state: when allCities is true we never keep a
// stale city list around, so consumers can rely on the flag alone.
// NOTE: Mongoose 9 dropped the callback-style `next` for document middleware
// (see user.model.js, which already uses the no-arg form). A synchronous hook
// just returns — keeping the `next` parameter throws "next is not a function".
serviceSchema.pre("save", function () {
    if (this.allCities) this.cities = [];

    // Same guarantee for recurrence: a non-recurring service never keeps a stale
    // cadence list, and a kept list is always deduplicated and ascending so
    // consumers (and the booking UI) can render it verbatim.
    if (!this.recurringEnabled) this.recurringIntervalDays = [];
    else if (this.recurringIntervalDays?.length) {
        this.recurringIntervalDays = [...new Set(this.recurringIntervalDays.map(Number))]
            .sort((a, b) => a - b);
    }
});

serviceSchema.index({ allCities: 1, enabled: 1 });

serviceSchema.index({ cities: 1, enabled: 1 });

// The public catalogue list is find({ enabled: true }).sort({ createdAt: -1 }).
// Neither coverage index above is prefixed on `enabled`, so that query was a
// collection scan followed by an in-memory sort. This one serves both halves.
serviceSchema.index({ enabled: 1, createdAt: -1 });

const Service = mongoose.model("Service", serviceSchema);

module.exports = Service;
