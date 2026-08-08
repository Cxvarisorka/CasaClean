// Zod side of the multilingual contract described in utils/translations.util.js.
// `translationsSchema(fields)` builds the validator a resource's create/edit
// schema mounts as `translations: translationsSchema(...).optional()`.

const { z } = require("zod");

const { TRANSLATABLE_LOCALES } = require("../utils/locale.util");

/**
 * Validator for a `translations` map.
 *
 * Every field is optional and "" is meaningful: the admin panel walks the
 * languages one at a time, so a half-finished language legitimately posts blank
 * fields, and each blank falls back to the default-locale value when the site
 * renders. Hence no minimum lengths (and no per-item minimum on lists — a row
 * editor can hand back an empty row); the root fields already enforce that real
 * copy exists, and the controller drops the blanks before storing. Maximums do
 * apply, so a translation can't outgrow what the design was built to show.
 *
 * Built as an object with one optional key per translatable locale (rather than
 * z.record) so `.strict()` rejects an unknown or unsupported language code
 * outright instead of quietly storing copy nothing will ever render.
 */
const translationsSchema = (fields) => {
    const shape = {};

    for (const field of fields) {
        const text = z
            .string()
            .trim()
            .max(field.max, { message: `Translated ${field.name} is too long!` });

        shape[field.name] = field.list
            ? z
                .array(text)
                .max(field.maxItems, { message: `Too many translated ${field.name}!` })
                .optional()
            : text.optional();
    }

    const entry = z
        .object(shape)
        .strict({ message: "Unknown translation fields are not allowed!" });

    return z
        .object(
            Object.fromEntries(
                TRANSLATABLE_LOCALES.map((locale) => [locale, entry.optional()])
            )
        )
        .strict({
            message: `Translations are only supported for: ${TRANSLATABLE_LOCALES.join(", ")}!`
        });
};

module.exports = { translationsSchema };
