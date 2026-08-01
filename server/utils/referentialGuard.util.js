// Referential-integrity guard for catalogue hard deletes.
//
// Cities, services, add-ons, tools and workers are all referenced by ObjectId
// from Bookings, Subscriptions and each other. Mongo does not enforce foreign
// keys, so a plain findByIdAndDelete silently leaves dangling refs: historical
// bookings render as "Service #undefined" in the admin panel, populate() yields
// null, and an active recurring plan only discovers the problem when its next
// charge fails reference resolution.
//
// Every catalogue model already has an `enabled` flag, and the whole codebase
// treats disabled records correctly (hidden from the public catalogue, still
// priceable on existing bookings). Soft-disable is therefore the right tool for
// "stop offering this", and deletion stays available only for records nothing
// depends on.

const AppError = require('./appError.util');

/**
 * Throw a 409 when any of the supplied references still exist.
 *
 * @param {Array<{model: import('mongoose').Model, filter: Object, noun: string}>} checks
 *        Each entry is an existence probe; `noun` names the blocking records in
 *        the error message (e.g. "bookings").
 * @param {string} subject  What the caller is trying to delete, for the message.
 */
const assertNotReferenced = async (checks, subject) => {
  const found = await Promise.all(
    checks.map(async ({ model, filter, noun }) =>
      (await model.exists(filter)) ? noun : null
    )
  );

  const blocking = found.filter(Boolean);
  if (blocking.length === 0) return;

  const list = blocking.length === 1
    ? blocking[0]
    : `${blocking.slice(0, -1).join(', ')} and ${blocking.at(-1)}`;

  throw new AppError(
    `This ${subject} is still referenced by existing ${list} and can't be deleted. ` +
    `Disable it instead — it will disappear from the public site while existing records keep working.`,
    409
  );
};

module.exports = { assertNotReferenced };
