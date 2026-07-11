/*
 * Site metadata
 * -------------
 * Brand-level constants and per-route SEO defaults. The <Seo> component reads
 * from here so every page ships complete, consistent meta without duplication.
 */

export const SITE = {
  name: "CasaClean",
  legalName: "CasaClean S.r.l.",
  tagline: "Professional home & office cleaning across Italy",
  description:
    "CasaClean connects you with vetted, insured cleaning professionals for homes and offices — regular cleaning, deep cleans, move-outs, laundry and more, booked online in about a minute.",
  url: import.meta.env.VITE_SITE_URL || "https://casaclean.com",
  locale: "en_US",
  email: "hello@casaclean.com",
  phone: "+39 06 1234 5678",
  address: {
    street: "Via Giovanni Giorgi 5",
    city: "Rome",
    region: "Lazio",
    postalCode: "00197",
    country: "IT",
  },
  ogImage: "/og-image.png",
  twitter: "@casaclean",
  founded: "2021",
};

/** Per-page SEO presets keyed by a stable id used in each page component. */
export const PAGE_META = {
  home: {
    title: "CasaClean — Professional Home & Office Cleaning in Italy",
    description: SITE.description,
    path: "/",
  },
  services: {
    title: "Services — Home, Deep, Office & Move-Out Cleaning",
    description:
      "Every kind of clean under one roof: regular home cleaning, deep cleans, office cleaning, move-in/move-out, laundry & ironing and disinfection — by vetted professionals.",
    path: "/services",
  },
  pricing: {
    title: "Pricing — Transparent Hourly Rates & Plans",
    description:
      "Simple, transparent cleaning prices. Pay per visit or save 20% with a regular plan — no contracts, no hidden fees, exact price shown before you book.",
    path: "/pricing",
  },
  about: {
    title: "About CasaClean — Cleaning You Can Count On",
    description:
      "We're on a mission to make professional, trustworthy cleaning as easy to book as a taxi — for every home and workplace in Italy.",
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
  blog: {
    title: "Blog — Home Care Tips & Cleaning Guides",
    description:
      "Checklists, room-by-room guides and honest advice from professional cleaners for a cleaner home and office.",
    path: "/blog",
  },
  notFound: {
    title: "Page Not Found — CasaClean",
    description: "The page you're looking for doesn't exist or has moved.",
    path: "/404",
  },
};
