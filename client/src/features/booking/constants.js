/*
 * Booking constants
 * -----------------
 * Step definitions and the option sets that drive the wizard. Field lists per
 * step power per-step validation (we only validate the current slice before
 * advancing). Shapes align with the backend `booking` model.
 */

export const BOOKING_STEPS = [
  {
    id: "property",
    title: "Property details",
    subtitle: "Where are we cleaning?",
    fields: ["cityId", "street", "houseNumber", "propertySize", "doorbellName"],
  },
  {
    id: "preferences",
    title: "Cleaning preferences",
    subtitle: "Tailor the turnover",
    fields: ["serviceId", "hours", "cleaners", "additionalServices", "supplies"],
  },
  {
    id: "schedule",
    title: "Schedule",
    subtitle: "Pick a date and time",
    fields: ["date", "time"],
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
];

export const ADDITIONAL_SERVICES = [
  { value: "deep-clean", label: "Deep clean", price: 89 },
  { value: "linens", label: "Hotel-grade linens", price: 29 },
  { value: "restock", label: "Supply restocking", price: 19 },
  { value: "staging", label: "Guest-ready staging", price: 35 },
];

export const SUPPLY_OPTIONS = [
  { value: "provide-solvents", label: "Cleaning solvents" },
  { value: "provide-mop", label: "Mop & bucket" },
  { value: "provide-vacuum", label: "Vacuum cleaner" },
  { value: "provide-cloths", label: "Microfiber cloths" },
];

export const TIME_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

export const HOURS_RANGE = [1, 2, 3, 4, 5, 6];
export const CLEANERS_RANGE = [1, 2, 3];

export const BOOKING_STORAGE_KEY = "casaclean:booking-draft";
