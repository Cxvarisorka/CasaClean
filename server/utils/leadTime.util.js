// Advance-booking notice
// ----------------------
// A cleaning visit has to be staffed: someone is rostered, told where to go and
// given time to get there. So by default a booking must be placed at least
// ADVANCE_BOOKING_HOURS before it starts, measured against the exact moment —
// not the calendar day. At 15:00 on 16 August the earliest bookable slot is
// 15:00 on 18 August; 14:59 on the 18th is too soon.
//
// A service can opt out of the wait (`Service.allowInstantBooking`) when the
// business can genuinely staff it today. Opting out removes ONLY the notice
// period: the city's working hours, the duration fitting inside them, and the
// "not already past" rule all still apply — an instant booking for 08:00 this
// morning is exactly as impossible as it sounds.
//
// The client mirrors this rule so the wizard can grey out the unbookable days
// (client/src/features/booking/constants.js), but the server is the authority:
// every path that can create a booking runs assertBookingWindow, which calls in
// here.

// Deliberately a constant rather than an env var: the client mirrors the number
// to shape its date picker, and a value only one side knows about would let the
// wizard offer slots checkout then refuses.
const ADVANCE_BOOKING_HOURS = 48;

const ADVANCE_BOOKING_MS = ADVANCE_BOOKING_HOURS * 60 * 60 * 1000;

/**
 * The moment a booking starts, built from the stored local-format strings
 * ("YYYY-MM-DD" + "HH:MM"). Local, never `new Date("YYYY-MM-DD")`, which parses
 * as UTC midnight and shifts the day west of Greenwich.
 */
const bookingStartsAt = ({ bookingDate, bookingTime }) => {
  const [year, month, day] = String(bookingDate).split('-').map(Number);
  const [hour, minute] = String(bookingTime).split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
};

/** The earliest moment a normal (non-instant) booking may start. */
const earliestBookableStart = (now = new Date()) =>
  new Date(now.getTime() + ADVANCE_BOOKING_MS);

/**
 * True when the chosen start leaves at least the required notice.
 * Exactly ADVANCE_BOOKING_HOURS ahead qualifies — the rule is "at least".
 */
const meetsAdvanceNotice = (bookingDate, bookingTime, now = new Date()) =>
  bookingStartsAt({ bookingDate, bookingTime }).getTime() - now.getTime() >= ADVANCE_BOOKING_MS;

/**
 * True when a service may be booked without the notice period. Fail-closed: an
 * unresolved service, or one with the flag absent (every service written before
 * this feature), waits the full 48 hours.
 */
const allowsInstantBooking = (service) => Boolean(service?.allowInstantBooking);

module.exports = {
  ADVANCE_BOOKING_HOURS,
  bookingStartsAt,
  earliestBookableStart,
  meetsAdvanceNotice,
  allowsInstantBooking
};
