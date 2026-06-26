// Money conversion helpers for the Stripe boundary.
//
// Stripe expects amounts as an integer in the smallest currency unit (cents for
// EUR). Our booking totals are stored as decimal euros (e.g. 44.8), so every
// amount that crosses into/out of Stripe must be converted. Math.round guards
// against floating-point drift (44.8 * 100 === 4479.999999999999).

const toMinorUnits = (amount) => Math.round(Number(amount) * 100);

const fromMinorUnits = (cents) => Number(cents) / 100;

module.exports = { toMinorUnits, fromMinorUnits };
