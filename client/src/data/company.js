/*
 * Company content
 * ---------------
 * The official "Why choose CasaClean" reasons, shared by the Home page
 * differentiators band and the About page. Titles/descriptions here are the
 * English fallback — the rendered copy comes from `values.*` in the locale
 * files, which both surfaces read so they can never drift apart.
 */

export const WHY_CASACLEAN = [
  {
    id: "staff",
    icon: "BadgeCheck",
    title: "Qualified and experienced staff",
    description:
      "Every clean is carried out by qualified professionals using professional cleaning products, with close attention to every detail.",
  },
  {
    id: "pricing",
    icon: "Wallet",
    title: "Transparent pricing",
    description:
      "You see the price before you confirm. No contracts, no hidden fees and no surprises after the visit.",
  },
  {
    id: "booking",
    icon: "CalendarCheck",
    title: "Easy and fast booking",
    description:
      "Book online in about a minute and choose the time that fits your schedule — one-time or recurring.",
  },
  {
    id: "support",
    icon: "HeartHandshake",
    title: "Dedicated customer support",
    description:
      "A real team you can reach before, during and after your cleaning — outstanding support is part of the service.",
  },
  {
    id: "standards",
    icon: "Sparkles",
    title: "High cleaning standards",
    description:
      "Apartments, holiday homes, offices or hotels — every property is cleaned to the same high standard, every time.",
  },
];

/**
 * The About page renders the same five reasons; kept as a named export so the
 * page reads by intent rather than reaching for the Home-page constant.
 */
export const COMPANY_VALUES = WHY_CASACLEAN;
