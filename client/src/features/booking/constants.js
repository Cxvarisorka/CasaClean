/*
 * Booking constants
 * -----------------
 * Step definitions and the option sets that drive the wizard. Field lists per
 * step power per-step validation (we only validate the current slice before
 * advancing). Shapes align with the backend `booking` model.
 */

export const BOOKING_STEPS = [
  {
    // City and service live together here on purpose: they constrain each other,
    // so separating them is what let a pre-selected service disappear silently
    // one step later. See PropertyStep for the one-way filtering rule.
    id: "property",
    title: "Service & address",
    subtitle: "What you need and where",
    fields: [
      "cityId",
      "serviceId",
      "street",
      "houseNumber",
      "propertySize",
      "doorbellName",
    ],
  },
  {
    id: "preferences",
    title: "Cleaning preferences",
    subtitle: "Tailor the turnover",
    fields: ["hours", "cleaners", "additionalServices", "cleaningTools"],
  },
  {
    id: "schedule",
    title: "Schedule",
    subtitle: "Pick a date and time",
    fields: ["date", "time", "intervalDays"],
  },
  {
    id: "contact",
    title: "Your details",
    subtitle: "Where to reach you",
    fields: ["name", "email", "phone", "notes"],
  },
  {
    id: "review",
    title: "Review",
    subtitle: "Confirm everything looks right",
    fields: [],
  },
  {
    id: "payment",
    title: "Payment",
    subtitle: "Secure checkout to confirm your booking",
    fields: [],
  },
];

// Time slots are NOT a constant: they depend on the chosen city's working hours
// and the booking duration, both of which the server enforces. See
// utils/timeSlots.js — a fixed list here shipped options (e.g. 17:00) that
// checkout always rejected.

// Add-ons and cleaning tools come from the live catalogue via
// useSpecialRequests / useCleaningTools; there is no static fallback list.

// Selectable durations. Must stay within the server's accepted range and match
// the `hours` bound in validation/bookingSchema.js.
export const HOURS_RANGE = [1, 2, 3, 4, 5, 6];

// Selectable cleaner counts, mirrored by the `cleaners` bound in
// validation/bookingSchema.js and by the max on the PreferencesStep input.
export const CLEANERS_RANGE = [1, 2, 3];

// Recurrence is decided per service, not globally: a service opts in
// (`recurringEnabled`) and may pin the exact cadences it repeats on
// (`recurringIntervalDays`). When it pins none, the customer picks any whole
// number of days in this range — mirrored by MIN/MAX_INTERVAL_DAYS in the
// server's utils/date.util.js, which rejects anything outside it.
export const MIN_INTERVAL_DAYS = 1;
export const MAX_INTERVAL_DAYS = 14;

/**
 * The cadences (in days) a service can be booked on, for the frequency picker.
 * Returns [] when the service can't repeat at all, so the caller can hide the
 * control entirely rather than render a one-option group. `0` — the one-time
 * sentinel — is added by the step itself, not here.
 */
export function recurrenceChoices(service) {
  if (!service?.recurringEnabled) return [];

  const pinned = (service.recurringIntervalDays || [])
    .map(Number)
    .filter((days) => Number.isInteger(days) && days >= MIN_INTERVAL_DAYS && days <= MAX_INTERVAL_DAYS);

  if (pinned.length > 0) return [...new Set(pinned)].sort((a, b) => a - b);

  return Array.from(
    { length: MAX_INTERVAL_DAYS - MIN_INTERVAL_DAYS + 1 },
    (_, index) => MIN_INTERVAL_DAYS + index
  );
}

export const BOOKING_STORAGE_KEY = "casaclean:booking-draft";
