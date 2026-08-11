// Booking durations
// -----------------
// A booking's length is stored in HOURS (Booking.hours, and its copies on
// PendingBooking / Subscription / Invoice). It used to be a whole number; a
// booking can now be booked by the half hour ("1 h 30 min"), so the field
// carries multiples of 0.5.
//
// Half is deliberately as fine as it gets. The price is pricePerHour × hours ×
// cleaners and is charged in integer cents, so a third of an hour can't be
// priced exactly from a per-hour rate; halves can (and 0.5 is exact in binary
// floating point, so the arithmetic never drifts). Every existing whole-hour
// record stays valid under the new rule.

const DURATION_STEP_HOURS = 0.5;
const MIN_DURATION_HOURS = 1;
const MAX_DURATION_HOURS = 12;

// True for a duration that is a whole or half hour inside the accepted range.
// `hours * 2` is exact for halves, so this is a real integrality test, not an
// epsilon comparison.
const isValidDurationHours = (value) => {
  const hours = Number(value);
  return (
    Number.isFinite(hours) &&
    hours >= MIN_DURATION_HOURS &&
    hours <= MAX_DURATION_HOURS &&
    Number.isInteger(hours * 2)
  );
};

/**
 * A duration in hours as human text: 2 -> "2 h", 1.5 -> "1 h 30 min".
 * Used by every customer-facing surface that states a booking's length (the
 * confirmation email, the admin alert, the invoice line and its PDF), so a
 * half-hour booking never reads as "1.5 h".
 */
const formatDuration = (hours) => {
  const totalMinutes = Math.round(Number(hours) * 60);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '—';

  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!wholeHours) return `${minutes} min`;
  return minutes ? `${wholeHours} h ${minutes} min` : `${wholeHours} h`;
};

module.exports = {
  DURATION_STEP_HOURS,
  MIN_DURATION_HOURS,
  MAX_DURATION_HOURS,
  isValidDurationHours,
  formatDuration
};
