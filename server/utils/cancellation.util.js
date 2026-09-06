// Late-cancellation policy
// ------------------------
// A customer may cancel their own booking at any time. What differs is the
// money: a cancellation made well ahead of the appointment costs us nothing and
// is refunded in full, while one made inside the window has already burned the
// slot — the crew's hour is blocked and can no longer be resold.
//
// Inside the window we therefore keep a fee worth ONE HOUR of the booked crew
// and refund the rest, rather than keeping the whole charge. Both halves of that
// rule (how close is "inside", and what an hour is worth) live here so the
// controller reads as policy rather than arithmetic.

const { roundMoney } = require('./vat.util');
const { durationInMinutes } = require('./duration.util');
// The moment a booking starts is the same "YYYY-MM-DD" + "HH:MM" pair the
// advance-notice rule works from, so it is defined once, there.
const { bookingStartsAt } = require('./leadTime.util');

// How long before the appointment a self-cancellation stops being free.
// Configurable, defaulting to one day.
const CANCELLATION_WINDOW_HOURS =
  Number(process.env.CANCELLATION_WINDOW_HOURS) >= 0
    ? Number(process.env.CANCELLATION_WINDOW_HOURS)
    : 24;

/** True when the booking starts less than CANCELLATION_WINDOW_HOURS from now. */
const isLateCancellation = (booking, now = Date.now()) =>
  bookingStartsAt(booking).getTime() - now < CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000;

/**
 * Split a late-cancelled booking's charge into what we keep and what goes back.
 *
 * The fee is one hour of the booked crew, which is exactly the booking's labour
 * divided by its length in hours — the total is `pricePerHour × (minutes ÷ 60) ×
 * cleaners` plus add-ons (`computeBookingTotal`), so scaling the labour back to
 * a single hour leaves `pricePerHour × cleaners`: an hour of everyone who was
 * going to turn up. A booking of an hour or less has no more than that in it, so
 * the cap below keeps its whole charge.
 *
 * Add-ons are excluded on purpose. A fridge cleaning that never happens costs us
 * nothing, whereas the hour does — the fee compensates for the blocked slot, not
 * for the shopping list attached to it.
 *
 * The labour is recovered by SUBTRACTION (charge − add-ons) rather than by
 * re-reading the service's current `pricePerHour`: the booking's own figures
 * are what the customer was charged, and
 * a catalogue price edit must never restate that. Add-on catalogue prices are
 * net today, so they are grossed up at the booking's own snapshotted VAT rate
 * before being subtracted from the gross charge; a legacy booking (no `tax`
 * snapshot) was priced when catalogue prices were VAT-inclusive, so its add-ons
 * already sit on the same footing as its total.
 *
 * If the arithmetic can't be reconciled — an add-on repriced past the labour
 * since, or references that reached us unpopulated — fall back to an hour's
 * share of the whole charge. A defensible fee that adds up beats an itemised one
 * built on figures we can't trust, and the fallback can only ever favour us by
 * the add-ons' share, never overcharge past the hour it is meant to be.
 *
 * @param {Object} booking  a booking with totalAmount, durationMinutes, the
 *                          `tax` snapshot and POPULATED specialRequests/cleaningTools
 * @returns {{ fee: number, refundAmount: number }} euros, summing to totalAmount
 */
const lateCancellationSettlement = (booking) => {
  const total = roundMoney(booking.totalAmount);
  const minutes = durationInMinutes(booking);

  // Nothing to split, or a duration we can't divide by: keep what was charged,
  // which is the behaviour this policy replaced.
  if (!(total > 0) || !(minutes > 0)) {
    return { fee: Math.max(total, 0), refundAmount: 0 };
  }

  const addOnPrices = [
    ...(booking.specialRequests || []),
    ...(booking.cleaningTools || [])
  ].map((item) => Number(item?.price));

  // Catalogue prices are net for a priced booking, VAT-inclusive for a legacy
  // one; `tax.netAmount` is the discriminator (it has no schema default, so its
  // absence means the booking predates VAT handling).
  const priced = booking.tax?.netAmount !== undefined && booking.tax?.netAmount !== null;
  const grossUp = priced ? 1 + (Number(booking.tax?.vatRate) || 0) / 100 : 1;

  const addOnTotal = addOnPrices.every(Number.isFinite)
    ? roundMoney(addOnPrices.reduce((sum, price) => sum + price, 0) * grossUp)
    : null;

  const labour = addOnTotal === null ? null : roundMoney(total - addOnTotal);
  const base = labour > 0 ? labour : total;

  const fee = Math.min(roundMoney((base * 60) / minutes), total);
  return { fee, refundAmount: roundMoney(total - fee) };
};

module.exports = {
  CANCELLATION_WINDOW_HOURS,
  bookingStartsAt,
  isLateCancellation,
  lateCancellationSettlement
};
