// Date-only helpers
// -----------------
// Booking and subscription dates are deliberately stored as YYYY-MM-DD strings.
// JavaScript parses that format as UTC when passed directly to `new Date(...)`,
// which can shift it to the prior day in west-of-UTC timezones. Keep every
// conversion local, matching the booking cancellation/window code.

const ALLOWED_INTERVAL_DAYS = [2, 3, 5, 7, 14, 30];

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
  ALLOWED_INTERVAL_DAYS,
  addDaysToDateString,
  localMidnight,
  todayString
};
