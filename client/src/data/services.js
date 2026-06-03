/*
 * Service catalog
 * ---------------
 * The marketing-facing service offerings. Shapes mirror the backend `service`
 * model (name, description, price_per_hour) and extend it with presentation
 * metadata (icon, slug, features) the API doesn't need to own.
 */

import { IMAGES } from "@/constants/images";

export const SERVICES = [
  {
    id: 1,
    slug: "turnover-cleaning",
    name: "Turnover Cleaning",
    icon: "Sparkles",
    image: IMAGES.turnover,
    tagline: "Guest-ready in hours, not days",
    description:
      "A complete reset between guests — every surface, every room, to a five-star hospitality standard.",
    pricePerHour: 19.9,
    startingAt: 49,
    features: [
      "Full kitchen & bathroom sanitation",
      "Bed making with hotel-fold finish",
      "Floors, surfaces & high-touch points",
      "Trash removal & odor neutralization",
    ],
    popular: true,
  },
  {
    id: 2,
    slug: "linen-management",
    name: "Linen Management",
    icon: "BedDouble",
    image: IMAGES.linens,
    tagline: "Hotel-grade linen, always fresh",
    description:
      "Commercial laundering, par-level tracking and swap-on-arrival linen so every guest sleeps on crisp, fresh sheets.",
    pricePerHour: 16.5,
    startingAt: 29,
    features: [
      "Commercial wash & press",
      "Par-level inventory tracking",
      "Stain & wear replacement",
      "Fresh sets delivered per turnover",
    ],
    popular: false,
  },
  {
    id: 3,
    slug: "supply-restocking",
    name: "Supply Restocking",
    icon: "PackageCheck",
    image: IMAGES.restock,
    tagline: "Never run out of the essentials",
    description:
      "We monitor and replenish consumables — from coffee to toiletries — so your listing is always fully stocked.",
    pricePerHour: 14,
    startingAt: 19,
    features: [
      "Toiletries & bathroom amenities",
      "Kitchen & coffee consumables",
      "Cleaning & paper supplies",
      "Automated low-stock alerts",
    ],
    popular: false,
  },
  {
    id: 4,
    slug: "property-inspection",
    name: "Property Inspection",
    icon: "ClipboardCheck",
    image: IMAGES.inspection,
    tagline: "A 50-point check, every visit",
    description:
      "Photo-documented inspections catch damage, maintenance issues and missing items before your next guest does.",
    pricePerHour: 18,
    startingAt: 25,
    features: [
      "50-point quality checklist",
      "Timestamped photo report",
      "Damage & maintenance flagging",
      "Lost-and-found handling",
    ],
    popular: false,
  },
  {
    id: 5,
    slug: "deep-cleaning",
    name: "Deep Cleaning",
    icon: "Droplets",
    image: IMAGES.deepClean,
    tagline: "A seasonal reset that shows",
    description:
      "An exhaustive top-to-bottom clean — appliances, grout, baseboards and the spots a standard turnover skips.",
    pricePerHour: 24,
    startingAt: 89,
    features: [
      "Inside appliances & cabinets",
      "Grout, baseboards & vents",
      "Window interiors & tracks",
      "Upholstery & soft furnishings",
    ],
    popular: false,
  },
  {
    id: 6,
    slug: "guest-ready-prep",
    name: "Guest-Ready Prep",
    icon: "DoorOpen",
    image: IMAGES.guestReady,
    tagline: "The finishing touches that earn 5 stars",
    description:
      "Staging, welcome setup and a final walkthrough so your space photographs and reviews as well as it cleans.",
    pricePerHour: 17,
    startingAt: 35,
    features: [
      "Welcome amenity staging",
      "Lighting & ambiance setup",
      "Final styling walkthrough",
      "Listing-photo consistency check",
    ],
    popular: false,
  },
];

export const getServiceBySlug = (slug) =>
  SERVICES.find((service) => service.slug === slug) ?? null;
