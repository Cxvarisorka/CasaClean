/*
 * Site metadata
 * -------------
 * Brand-level constants and per-route SEO defaults. The <Seo> component reads
 * from here so every page ships complete, consistent meta without duplication.
 */

/*
 * The real registered details of the company behind the brand. They are stated
 * once here because they are load-bearing in three different places — the
 * footer/contact channels, the schema.org Organization block and the legal
 * documents' identity table — and a phone number that disagrees between them is
 * worse than no phone number at all.
 */
const PHONE = "+39 347 5596318";

/*
 * The origin every canonical, share image and schema `@id` is built from.
 *
 * Read from both env shapes on purpose: `import.meta.env` is what Vite injects
 * into the bundle, and `process.env` is what exists when the build-time SEO
 * prerender (scripts/prerender-seo.mjs) imports this file directly under Node,
 * where Vite's transform never runs. Getting this wrong is silent and expensive
 * — a canonical pointing at the wrong origin de-indexes the page it names.
 */
const SITE_URL =
  import.meta.env?.VITE_SITE_URL ||
  globalThis.process?.env?.VITE_SITE_URL ||
  "https://casaclean.com";

export const SITE = {
  name: "CasaClean",
  legalName: "VACANZE ROMANE S.R.L.S.",
  tagline: "Professional cleaning services in Italy",
  description:
    "CasaClean offers professional cleaning services for apartments, holiday homes, Airbnb properties, hotels, offices and commercial spaces — regular, deep, move-in/move-out and emergency cleaning, booked online in about a minute.",
  url: SITE_URL,
  locale: "en_US",
  email: "info@casaclean.it",
  phone: PHONE,
  // `tel:` needs the dialable form, so it is derived from the displayed number
  // rather than written out a second time and left to drift.
  phoneHref: `tel:${PHONE.replace(/[^\d+]/g, "")}`,
  address: {
    street: "Via Giovanni Giorgi 5",
    city: "Roma",
    region: "RM",
    postalCode: "00149",
    country: "IT",
  },
  // Coordinates of the registered address above. Present so the LocalBusiness
  // block can state *where* the business is rather than only what it is called —
  // it is the field local search uses to place a result on a map.
  geo: { latitude: 41.8433, longitude: 12.4406 },
  /*
   * The share card. Rendered by `scripts/generate-og-images.mjs` (npm run og)
   * and committed to `public/`.
   *
   * The dimensions travel with the file on purpose. A crawler that hasn't
   * fetched the image yet lays the card out from `og:image:width`/`height`, so
   * stating them is the difference between a link that expands to a full-width
   * card immediately and one that pops in a beat later — and, on the first
   * scrape of a new URL, sometimes between a card and a bare link. 1200×630 is
   * the 1.91:1 ratio Facebook, LinkedIn, X, Slack and WhatsApp all key off.
   */
  ogImage: "/og-image.jpg",
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageType: "image/jpeg",
  ogImageAlt:
    "CasaClean — professional cleaning services in Italy, booked online in about a minute.",
  founded: "2021",
  /*
   * Every language the site is published in, as BCP-47 tags for `og:locale`.
   * Mirrors `LANGUAGES` in src/i18n/config.js; kept as its own list because Open
   * Graph wants the regional form (`it_IT`, not `it`) that the language switcher
   * has no use for.
   */
  ogLocales: {
    en: "en_US",
    it: "it_IT",
    ka: "ka_GE",
    el: "el_GR",
    ru: "ru_RU",
  },
  /*
   * Opening hours as the business actually answers them, shared by the contact
   * page copy and the LocalBusiness `openingHoursSpecification`. Cleaning slots
   * themselves are bounded per city by the API — this is when a human replies.
   */
  hours: { days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], opens: "09:00", closes: "18:00" },
  /*
   * Only profiles the business actually owns. This list is the single source
   * for the footer icons and for schema.org `sameAs`, which is a claim of
   * identity — pointing it at a handle we don't control (or at a network we
   * aren't on) is a false claim, so a platform is added here only once its
   * profile exists. There is deliberately no X/Twitter entry, which is also
   * why no `twitter:site` handle is asserted in the card meta.
   */
  social: {
    instagram: "https://www.instagram.com/casaclean.it",
    facebook: "https://www.facebook.com/share/187saPSK29/",
  },
};

/*
 * Per-page SEO presets keyed by a stable id used in each page component.
 *
 * Two rules the entries below follow, because both are enforced by the surface
 * they are written for rather than by taste:
 *
 * - A `title` is written to survive truncation. Google renders roughly 60
 *   characters, so the words that decide the click ("cleaning services",
 *   "Italy") come before the brand rather than after it, and `MetaTags` appends
 *   `· CasaClean` only when the title doesn't already carry the name.
 * - A `description` is not a ranking factor but *is* the ad copy under the
 *   link. It is kept under ~160 characters so it isn't cut mid-sentence, and it
 *   states the thing a searcher is deciding on — where we operate, what it
 *   costs, how long booking takes.
 */
export const PAGE_META = {
  home: {
    // Leads with the service and the market, which is what "cleaning services
    // italy" style queries actually match on. The brand still appears, but the
    // words carrying the intent survive the truncation.
    title: "House & Office Cleaning Services in Italy | CasaClean",
    description:
      "Book vetted, insured cleaners in Rome, Milan, Florence and 9 more Italian cities. Regular, deep, move-out, office and Airbnb cleaning from €19.90/h.",
    path: "/",
    image: "/og-image.jpg",
    keywords: [
      "cleaning services Italy",
      "house cleaning Rome",
      "deep cleaning service",
      "Airbnb cleaning Italy",
      "office cleaning Milan",
      "impresa di pulizie",
    ],
  },
  services: {
    title: "Services — Regular, Deep, Office & Holiday Home Cleaning",
    description:
      "Every kind of clean under one roof: regular cleaning, deep cleaning, move-in/move-out, office & commercial, holiday home / Airbnb / hotel and emergency cleaning — by qualified staff in every city we serve.",
    path: "/services",
  },
  about: {
    title: "About CasaClean — Cleaning Company in Rome, Italy",
    description:
      "Who we are: a registered Italian cleaning company in Rome, serving 12 cities with qualified staff, transparent hourly pricing and support in five languages.",
    path: "/about",
    image: "/og-image-about.jpg",
    imageAlt:
      "About CasaClean — a brand of Vacanze Romane S.r.l.s., professional cleaning services in Italy.",
    keywords: [
      "CasaClean",
      "cleaning company Rome",
      "Vacanze Romane S.r.l.s.",
      "professional cleaning Italy",
      "impresa di pulizie Roma",
    ],
  },
  contact: {
    title: "Contact CasaClean — Talk to Our Team",
    description:
      "Questions about coverage, pricing or cleaning for your office? Reach the CasaClean team and we'll respond within one business day.",
    path: "/contact",
  },
  faq: {
    title: "FAQ — Answers About Booking, Pricing & Quality",
    description:
      "Everything you need to know about CasaClean: booking, supplies, payment, cancellation, vetting and our Spotless Guarantee.",
    path: "/faq",
  },
  careers: {
    title: "Careers — Join the CasaClean Team",
    description:
      "Fair pay, paid training and real growth paths. Explore open roles across cleaning operations, engineering and customer success.",
    path: "/careers",
  },
  booking: {
    title: "Book a Cleaning — Vetted Professionals, Instant Price",
    description:
      "Schedule a professional cleaning in minutes. Tell us about your place, pick a time, see the exact price and confirm — it's that simple.",
    path: "/booking",
  },
  privacy: {
    title: "Privacy Policy — CasaClean",
    description:
      "What personal data CasaClean collects when you book a cleaning, why we collect it, who we share it with, how long we keep it and how to exercise your GDPR rights.",
    path: "/privacy",
  },
  terms: {
    title: "Terms of Service — CasaClean",
    description:
      "The terms governing bookings with CasaClean: how a booking is formed, prices and VAT, recurring plans, cancellations and refunds, your right of withdrawal, our guarantee and liability.",
    path: "/terms",
  },
  notFound: {
    title: "Page Not Found — CasaClean",
    description: "The page you're looking for doesn't exist or has moved.",
    path: "/404",
  },
};
