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

export const SITE = {
  name: "CasaClean",
  legalName: "VACANZE ROMANE S.R.L.S.",
  tagline: "Professional cleaning services in Italy",
  description:
    "CasaClean offers professional cleaning services for apartments, holiday homes, Airbnb properties, hotels, offices and commercial spaces — regular, deep, move-in/move-out and emergency cleaning, booked online in about a minute.",
  url: import.meta.env.VITE_SITE_URL || "https://casaclean.com",
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
  ogImage: "/og-image.png",
  founded: "2021",
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

/** Per-page SEO presets keyed by a stable id used in each page component. */
export const PAGE_META = {
  home: {
    title: "CasaClean — Professional Cleaning Services in Italy",
    description: SITE.description,
    path: "/",
  },
  services: {
    title: "Services — Regular, Deep, Office & Holiday Home Cleaning",
    description:
      "Every kind of clean under one roof: regular cleaning, deep cleaning, move-in/move-out, office & commercial, holiday home / Airbnb / hotel and emergency cleaning — by qualified staff in every city we serve.",
    path: "/services",
  },
  about: {
    title: "About CasaClean — Professional Cleaning in Italy",
    description:
      "CasaClean provides high-quality cleaning for apartments, holiday homes, Airbnb properties, hotels, offices and commercial spaces. A brand managed by Vacanze Romane S.r.l.s.",
    path: "/about",
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
