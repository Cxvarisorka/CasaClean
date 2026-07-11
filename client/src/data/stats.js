/*
 * Headline metrics
 * ----------------
 * Numbers for the animated statistics band. `value` is numeric so the
 * count-up hook can animate it; `suffix`/`prefix` render the units.
 */

export const STATS = [
  { id: "turnovers", value: 48000, suffix: "+", label: "Cleans completed" },
  { id: "rating", value: 4.97, decimals: 2, suffix: "★", label: "Average customer rating" },
  { id: "ontime", value: 99.6, decimals: 1, suffix: "%", label: "On-time arrival rate" },
  { id: "cities", value: 12, suffix: "", label: "Cities served" },
];

export const TRUSTED_BY = [
  "Google Reviews",
  "Trustpilot",
  "Facebook",
  "Yelp",
  "Booking.com",
  "Airbnb",
];
