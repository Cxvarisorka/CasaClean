// Date-only helpers
// -----------------
// Booking and subscription dates are deliberately stored as YYYY-MM-DD strings.
// JavaScript parses that format as UTC when passed directly to `new Date(...)`,
// which can shift it to the prior day in west-of-UTC timezones. Keep every
// conversion local, matching the booking cancellation/window code.

// Recurrence cadence bounds. A service decides WHETHER it can repeat and MAY
// pin an explicit set of cadences (Service.recurringIntervalDays); when it does
// not, the customer picks any whole number of days inside this range. Both the
// per-service list and the free choice are clamped to it, so every cadence the
// system can ever store is 1–14 days.
const MIN_INTERVAL_DAYS = 1;
const MAX_INTERVAL_DAYS = 14;

const isValidIntervalDays = (value) =>
  Number.isInteger(Number(value)) &&
  Number(value) >= MIN_INTERVAL_DAYS &&
  Number(value) <= MAX_INTERVAL_DAYS;

const parseLocalDate = (dateStr) => {
  const [year, month, day] = String(dateStr).split('-').map(Number);
  return new Date(year, month - 1, day);
};

const toDateString = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0')
].join('-');

const addDaysToDateString = (dateStr, days) => {
  const date = parseLocalDate(dateStr);
  date.setDate(date.getDate() + Number(days));
  return toDateString(date);
};

const localMidnight = (dateStr) => parseLocalDate(dateStr);

const todayString = () => toDateString(new Date());

module.exports = {
  MIN_INTERVAL_DAYS,
  MAX_INTERVAL_DAYS,
  isValidIntervalDays,
  addDaysToDateString,
  localMidnight,
  todayString
};
