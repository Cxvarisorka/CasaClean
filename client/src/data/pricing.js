/*
 * Pricing plans
 * -------------
 * Marketing pricing tiers + the add-on matrix surfaced on the Pricing page.
 */

export const PRICING_PLANS = [
  {
    id: "payg",
    name: "One-Time Clean",
    description: "Perfect for a one-off refresh, a special occasion or a trial run.",
    price: 49,
    unit: "/ visit",
    cadence: "Billed per visit",
    highlight: false,
    cta: "Book a cleaning",
    features: [
      "Standard home cleaning",
      "Professional supplies included",
      "Vetted, insured professional",
      "Secure online payment",
      "Spotless Guarantee",
    ],
  },
  {
    id: "host",
    name: "Regular Clean",
    description: "For homes cleaned weekly or every two weeks — our most popular plan.",
    price: 39,
    unit: "/ visit",
    cadence: "Billed monthly · save 20%",
    highlight: true,
    badge: "Most popular",
    cta: "Start a regular plan",
    features: [
      "Everything in One-Time Clean",
      "The same trusted cleaner each visit",
      "Priority & same-day scheduling",
      "Skip or reschedule anytime",
      "Laundry & ironing add-on discount",
      "Dedicated support line",
    ],
  },
  {
    id: "portfolio",
    name: "Business & Offices",
    description: "Tailored cleaning for offices, studios, shops and landlords.",
    price: null,
    unit: "Custom",
    cadence: "Tailored to your spaces",
    highlight: false,
    cta: "Talk to sales",
    features: [
      "Everything in Regular Clean",
      "Out-of-hours scheduling",
      "One monthly invoice",
      "Dedicated account manager",
      "Multiple locations, one contact",
      "Custom SLAs & reporting",
    ],
  },
];

export const PRICING_ADDONS = [
  { id: "deep", label: "Deep clean", price: 89, note: "Intensive top-to-bottom reset" },
  { id: "linen", label: "Laundry & ironing", price: 29, note: "Washed, ironed and folded" },
  { id: "restock", label: "Inside fridge & oven", price: 19, note: "Degreased and descaled, inside and out" },
  { id: "staging", label: "Interior windows", price: 35, note: "Glass, frames and sills" },
];

export const PRICING_FAQ_IDS = ["q4", "q5", "q6"];
