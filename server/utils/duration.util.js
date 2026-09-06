// Booking durations
// -----------------
// A booking's length is TOTAL MINUTES (Booking.durationMinutes, and its copies
// on PendingBooking / Subscription). Minutes are the canonical
// representation everywhere: the customer types "1 h 25 m", the wizard combines
// that into 85, and 85 is what travels, gets stored, gets priced and gets
// printed. Nothing downstream ever sees 1.4166…
//
// It used to be HOURS, as a multiple of 0.5 — which could only express whole
// and half hours and could not express 1 h 25 m at all. `Booking.hours` still
// exists on records written before this change; read a duration through
// `durationInMinutes(record)` rather than either field so both shapes work.
//
// Pricing is exact at this granularity because it is done in integer cents:
// pricePerHour × minutes ÷ 60 × cleaners, rounded once (see computeBookingTotal
// in services/booking.service.js). €20/h × 85 min = €28.33.

const MIN_DURATION_MINUTES = 60; // one hour, the shortest visit we sell
const MAX_DURATION_MINUTES = 720; // twelve hours — the same ceiling as before

// The minutes half of the "Hours + Minutes" input pair. Sixty minutes is one
// more hour, not a valid minutes value, so the pair has exactly one spelling.
const MAX_MINUTES_PART = 59;

/** True for a whole number of minutes inside the accepted range. */
const isValidDurationMinutes = (value) => {
  const minutes = Number(value);
  return (
    Number.isInteger(minutes) &&
    minutes >= MIN_DURATION_MINUTES &&
    minutes <= MAX_DURATION_MINUTES
  );
};

/**
 * Combine an "Hours + Minutes" pair into total minutes: (1, 25) -> 85.
 * Returns NaN for anything that isn't two whole numbers, so callers reject
 * rather than guess. Blanks are rejected explicitly because `Number("")` is 0,
 * which would read a missing half as a real zero.
 */
const combineDuration = (hours, minutes) => {
  if (hours === '' || hours === null || hours === undefined) return NaN;
  if (minutes === '' || minutes === null || minutes === undefined) return NaN;

  const h = Number(hours);
  const m = Number(minutes);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return NaN;
  return h * 60 + m;
};

/** The inverse: 85 -> { hours: 1, minutes: 25 }. */
const splitDuration = (totalMinutes) => {
  const total = Math.max(0, Math.round(Number(totalMinutes) || 0));
  return { hours: Math.floor(total / 60), minutes: total % 60 };
};

/**
 * The duration of a booking-shaped record, in minutes.
 *
 * `durationMinutes` is the field every write sets. `hours` is the legacy field
 * on records (bookings, subscriptions) written before durations went
 * to the minute; it held whole/half hours, so ×60 is exact for every value it
 * could ever have carried. Returns 0 when neither is usable, which callers
 * treat as "unknown" rather than "instant".
 */
const durationInMinutes = (record) => {
  const stored = Number(record?.durationMinutes);
  if (Number.isFinite(stored) && stored > 0) return Math.round(stored);

  const legacyHours = Number(record?.hours);
  if (Number.isFinite(legacyHours) && legacyHours > 0) return Math.round(legacyHours * 60);

  return 0;
};

/**
 * A duration in minutes as human text: 120 -> "2 h", 85 -> "1 h 25 min".
 * Used by every customer-facing surface that states a booking's length (the
 * confirmation email, the admin alert), so a
 * booking never reads as "1.4166 h" or a bare minute count.
 */
const formatDuration = (totalMinutes) => {
  const total = Math.round(Number(totalMinutes));
  if (!Number.isFinite(total) || total <= 0) return '—';

  const { hours, minutes } = splitDuration(total);

  if (!hours) return `${minutes} min`;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
};

module.exports = {
  MIN_DURATION_MINUTES,
  MAX_DURATION_MINUTES,
  MAX_MINUTES_PART,
  isValidDurationMinutes,
  combineDuration,
  splitDuration,
  durationInMinutes,
  formatDuration
};
