/*
 * Pricing plans
 * -------------
 * Marketing pricing tiers + the add-on matrix surfaced on the Pricing page.
 */

export const PRICING_PLANS = [
  {
    id: "payg",
    name: "Pay As You Go",
    description: "Perfect for occasional hosts who want flexibility.",
    price: 49,
    unit: "/ turnover",
    cadence: "Billed per clean",
    highlight: false,
    cta: "Book a turnover",
    features: [
      "Standard turnover cleaning",
      "Bed making & tidy",
      "Trash removal",
      "Photo completion report",
      "Guest-Ready Guarantee",
    ],
  },
  {
    id: "host",
    name: "Host",
    description: "For active hosts running one to three listings.",
    price: 39,
    unit: "/ turnover",
    cadence: "Billed monthly · save 20%",
    highlight: true,
    badge: "Most popular",
    cta: "Start with Host",
    features: [
      "Everything in Pay As You Go",
      "Priority same-day scheduling",
      "Linen management included",
      "Supply restocking & alerts",
      "50-point inspection reports",
      "Dedicated support line",
    ],
  },
  {
    id: "portfolio",
    name: "Portfolio",
    description: "Managed operations for 4+ units and property managers.",
    price: null,
    unit: "Custom",
    cadence: "Tailored to your portfolio",
    highlight: false,
    cta: "Talk to sales",
    features: [
      "Everything in Host",
      "Volume pricing across units",
      "Single multi-property dashboard",
      "Dedicated account manager",
      "API & PMS integrations",
      "Custom SLAs & reporting",
    ],
  },
];

export const PRICING_ADDONS = [
  { id: "deep", label: "Deep clean", price: 89, note: "Seasonal top-to-bottom reset" },
  { id: "linen", label: "Hotel-grade linens", price: 29, note: "Per turnover, swapped on arrival" },
  { id: "restock", label: "Supply restocking", price: 19, note: "Consumables tracked & replenished" },
  { id: "staging", label: "Guest-ready staging", price: 35, note: "Welcome setup & final styling" },
];

export const PRICING_FAQ_IDS = ["q4", "q5", "q6"];
