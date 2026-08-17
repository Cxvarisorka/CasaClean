// Reference shape of a city record (from the original seed data).
// NOTE: working_days is not modelled yet — add it here if/when per-day
// scheduling is needed. The localized names shown below now live in
// `translations` (see utils/translations.util.js).
//  {
//     "id": 1,
//     "name": "Rome",
//     "name_it": "Roma",
//     "name_ka": "რომი",
//     "name_ru": "Рим",
//     "enabled": true,
//     "working_days": "1,2,3,4,5,6,7",
//     "working_hours_start": "09:00",
//     "working_hours_end": "17:30"
//   },

const mongoose = require('mongoose');

const { translationsPath } = require('./translations.schema');
const { TRANSLATABLE_FIELDS } = require('../utils/translations.util');

// Working hours are clock times ("09:00"), not calendar dates, so they're
// stored as strings validated against HH:MM (00:00–23:59).
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const citySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "A city must have a name."],
        unique: true, // DB-level guard; the 11000 handler turns this into a 409
        trim: true
    },
    // The city name in the other languages ("Rome" → "Roma" → "რომი"), keyed by
    // locale code. The root name stays the default-locale one and the fallback.
    translations: translationsPath(TRANSLATABLE_FIELDS.city),
    workingHourStarts: {
        type: String,
        required: [true, "A city must have a working hours start time."],
        match: [TIME_REGEX, "workingHourStarts must be in HH:MM format."]
    },
    workingHourEnds: {
        type: String,
        required: [true, "A city must have a working hours end time."],
        match: [TIME_REGEX, "workingHourEnds must be in HH:MM format."]
    },
    enabled: {
        type: Boolean,
        default: true                    // soft on/off switch so a city can be hidden without deleting it
    }
}, {
    timestamps: true
});

// The public list is find({ enabled: true }).sort({ createdAt: -1 }). A bare
// { enabled: 1 } index serves the filter but not the sort, so MongoDB buffered
// every enabled city in memory to sort it. The compound serves both, and its
// `enabled` prefix still answers every plain { enabled: true } match, so it
// fully replaces the single-field index.
citySchema.index({ enabled: 1, createdAt: -1 });

const City = mongoose.model('City', citySchema);

module.exports = City;