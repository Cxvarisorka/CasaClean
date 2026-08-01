/*
 * Service catalog
 * ---------------
 * The marketing-facing service offerings. Shapes mirror the backend `service`
 * model (name, description, price_per_hour) and extend it with presentation
 * metadata (icon, slug, features) the API doesn't need to own.
 *
 * The six services below are CasaClean's official offering — keep this list in
 * sync with the "Our Services" block on the About page (`pages.about.services`
 * in the locale files).
 */

import { IMAGES } from "@/constants/images";

export const SERVICES = [
  {
    id: 1,
    slug: "regular-cleaning",
    name: "Regular Cleaning",
    icon: "Sparkles",
    image: IMAGES.turnover,
    tagline: "Your routine clean, made effortless",
    description:
      "A thorough clean of your whole home — kitchen, bathrooms, bedrooms and living areas — as a one-time visit or on a schedule that suits you.",
    pricePerHour: 19.9,
    startingAt: 49,
    features: [
      "Kitchen & bathroom sanitation",
      "Dusting, vacuuming & mopping",
      "Beds made & rooms reset",
      "Bins emptied & surfaces polished",
    ],
    popular: true,
  },
  {
    id: 2,
    slug: "deep-cleaning",
    name: "Deep Cleaning",
    icon: "Droplets",
    image: IMAGES.deepClean,
    tagline: "For when it needs more than a once-over",
    description:
      "An intensive top-to-bottom clean — inside appliances, limescale, grout and all the spots a regular clean doesn't reach.",
    pricePerHour: 24,
    startingAt: 89,
    features: [
      "Inside oven, fridge & cabinets",
      "Limescale, grout & tile treatment",
      "Skirting boards, doors & vents",
      "Under & behind furniture",
    ],
    popular: false,
  },
  {
    id: 3,
    slug: "move-in-move-out",
    name: "Move-In / Move-Out Cleaning",
    icon: "DoorOpen",
    image: IMAGES.guestReady,
    tagline: "Leave nothing behind but shine",
    description:
      "A rigorous clean before or after a move that helps deposits come back in full and new chapters start fresh — landlord-checklist thorough.",
    pricePerHour: 24,
    startingAt: 99,
    features: [
      "Full-property deep clean",
      "Inside all appliances & storage",
      "Windows, frames & doors",
      "Deposit-friendly documentation",
    ],
    popular: false,
  },
  {
    id: 4,
    slug: "office-commercial-cleaning",
    name: "Office & Commercial Cleaning",
    icon: "Building2",
    image: IMAGES.inspection,
    tagline: "A workspace your team enjoys",
    description:
      "Reliable cleaning for offices, studios, shops and commercial spaces — scheduled around your working hours, with one simple monthly invoice.",
    pricePerHour: 22,
    startingAt: 59,
    features: [
      "Desks, meeting rooms & kitchens",
      "High-touch points sanitized",
      "Evening & early-morning slots",
      "Monthly invoicing available",
    ],
    popular: false,
  },
  {
    id: 5,
    slug: "holiday-home-airbnb-hotel",
    name: "Holiday Home, Airbnb & Hotel Cleaning",
    icon: "BedDouble",
    image: IMAGES.linens,
    tagline: "Guest-ready between every stay",
    description:
      "Fast, reliable turnovers for holiday homes, Airbnb properties and hotels in Rome — cleaned, reset and presented to hospitality standards.",
    pricePerHour: 22,
    startingAt: 59,
    features: [
      "Checkout-to-checkin turnovers",
      "Fresh linen & towel changes",
      "Property reset & presentation",
      "Flexible, short-notice scheduling",
    ],
    popular: false,
  },
  {
    id: 6,
    slug: "emergency-cleaning",
    name: "Emergency Cleaning",
    icon: "Zap",
    image: IMAGES.restock,
    tagline: "When it can't wait until tomorrow",
    description:
      "Urgent cleaning when plans change or something goes wrong — a qualified team dispatched at short notice, with the same standards as every other visit.",
    pricePerHour: 28,
    startingAt: 79,
    features: [
      "Short-notice availability",
      "Same qualified professionals",
      "Homes, offices & rentals",
      "Professional products included",
    ],
    popular: false,
  },
];

export const getServiceBySlug = (slug) =>
  SERVICES.find((service) => service.slug === slug) ?? null;
