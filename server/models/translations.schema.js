// Mongoose side of the multilingual contract described in
// utils/translations.util.js. `translationsPath(fields)` returns a ready-made
// schema path a model drops in as `translations: translationsPath(...)`.

const mongoose = require("mongoose");

const { TRANSLATABLE_LOCALES, isTranslatableLocale } = require("../utils/locale.util");

/**
 * Build the per-language sub-document for a set of translatable fields.
 *
 * Deliberately no defaults: an untranslated field must stay *absent* rather than
 * become "" or [], so the record itself says which fields a language actually
 * covers (the admin panel's per-language progress reads exactly this). Mongoose
 * otherwise materialises every array path as [], hence `default: undefined`.
 */
const buildEntrySchema = (fields) => {
    const shape = {};

    for (const field of fields) {
        shape[field.name] = field.list
            ? { type: [String], default: undefined }
            : { type: String, trim: true };
    }

    return new mongoose.Schema(shape, { _id: false, minimize: true });
};

/**
 * The `translations` path: a Map keyed by locale code.
 *
 * A Map rather than a fixed sub-object so adding a language is a one-line change
 * in locale.util.js — no migration, no schema edit. Only translatable locales are
 * accepted; the default locale lives in the root fields, which stay the fallback
 * for anything a translation leaves blank.
 */
const translationsPath = (fields) => ({
    type: Map,
    of: buildEntrySchema(fields),
    default: () => ({}),
    validate: {
        validator: (value) => !value || [...value.keys()].every(isTranslatableLocale),
        message: `Translations may only be provided for: ${TRANSLATABLE_LOCALES.join(", ")}!`
    }
});

module.exports = { translationsPath };
