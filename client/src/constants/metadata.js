/*
 * Site metadata
 * -------------
 * Brand-level constants and per-route SEO defaults. The <Seo> component reads
 * from here so every page ships complete, consistent meta without duplication.
 */

export const SITE = {
  name: "CasaClean",
  legalName: "CasaClean S.r.l.",
  tagline: "Premium turnover cleaning for vacation rentals",
  description:
    "CasaClean delivers guest-ready turnovers for Airbnb hosts, vacation rental owners and property managers — cleaning, inspections, linens and restocking, on schedule, every time.",
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
    title: "CasaClean — Premium Turnover Cleaning for Vacation Rentals",
    description: SITE.description,
    path: "/",
  },
  services: {
    title: "Services — Turnovers, Linens, Restocking & Inspections",
    description:
      "Full-service short-term rental operations: guest-ready turnovers, hotel-grade linen, supply restocking, and 50-point inspections handled by vetted professionals.",
    path: "/services",
  },
  pricing: {
    title: "Pricing — Transparent Per-Turnover Plans",
    description:
      "Simple, transparent pricing for vacation rental turnovers. No contracts, no surprises — pay per clean or save with a managed plan.",
    path: "/pricing",
  },
  about: {
    title: "About CasaClean — Operations Built for Hosts",
    description:
      "We're a team of hospitality and operations specialists obsessed with five-star guest-ready turnovers for short-term rentals.",
    path: "/about",
  },
  contact: {
    title: "Contact CasaClean — Talk to Our Team",
    description:
      "Questions about turnovers, coverage areas or pricing? Reach the CasaClean team and we'll respond within one business day.",
    path: "/contact",
  },
  faq: {
    title: "FAQ — Answers for Hosts & Property Managers",
    description:
      "Everything you need to know about CasaClean turnovers: scheduling, pricing, supplies, linens, damage reporting and guarantees.",
    path: "/faq",
  },
  careers: {
    title: "Careers — Join the CasaClean Team",
    description:
      "Build the operating system for short-term rental operations. Explore open roles across cleaning operations, engineering and customer success.",
    path: "/careers",
  },
  booking: {
    title: "Book a Turnover — Get a Guest-Ready Clean",
    description:
      "Schedule a professional vacation rental turnover in minutes. Tell us about your property, pick a time, and we'll handle the rest.",
    path: "/booking",
  },
  blog: {
    title: "Blog — Short-Term Rental Operations & Insights",
    description:
      "Playbooks, checklists and data-driven insights to help hosts and property managers run flawless short-term rental operations.",
    path: "/blog",
  },
  notFound: {
    title: "Page Not Found — CasaClean",
    description: "The page you're looking for doesn't exist or has moved.",
    path: "/404",
  },
};
