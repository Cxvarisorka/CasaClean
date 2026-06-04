// Reference shape of a city record (from the original seed data).
// NOTE: the localized names (name_it/name_ka/name_ru) and working_days are not
// modelled yet — add them here if/when multilingual + per-day scheduling is needed.
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

const City = mongoose.model('City', citySchema);

module.exports = City;