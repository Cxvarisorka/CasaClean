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
    slug: "home-cleaning",
    name: "Home Cleaning",
    icon: "Sparkles",
    image: IMAGES.turnover,
    tagline: "Your regular clean, made effortless",
    description:
      "A thorough clean of your whole home — kitchen, bathrooms, bedrooms and living areas — as a one-off or on a schedule that suits you.",
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
    slug: "office-cleaning",
    name: "Office Cleaning",
    icon: "Building2",
    image: IMAGES.inspection,
    tagline: "A workspace your team enjoys",
    description:
      "Reliable cleaning for offices, studios and shops — scheduled around your working hours, with one simple monthly invoice.",
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
    id: 4,
    slug: "move-in-move-out",
    name: "Move-In / Move-Out Cleaning",
    icon: "DoorOpen",
    image: IMAGES.guestReady,
    tagline: "Leave nothing behind but shine",
    description:
      "A rigorous end-of-lease clean that helps deposits come back in full and new chapters start fresh — landlord-checklist thorough.",
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
    id: 5,
    slug: "laundry-ironing",
    name: "Laundry & Ironing",
    icon: "Shirt",
    image: IMAGES.linens,
    tagline: "Fresh, folded and put away",
    description:
      "Add washing, ironing and folding to any cleaning visit — or book it on its own. Your wardrobe and linen cupboard, handled.",
    pricePerHour: 16.5,
    startingAt: 29,
    features: [
      "Wash, dry & fold",
      "Ironing & garment care",
      "Bed linen & towel rotation",
      "Add-on to any cleaning",
    ],
    popular: false,
  },
  {
    id: 6,
    slug: "sanitization-disinfection",
    name: "Sanitization & Disinfection",
    icon: "SprayCan",
    image: IMAGES.restock,
    tagline: "Certified clean, down to the details",
    description:
      "Professional-grade disinfection of high-touch surfaces for homes and workplaces — ideal after illness, tenants or renovations.",
    pricePerHour: 26,
    startingAt: 79,
    features: [
      "Certified professional disinfectants",
      "High-touch surface treatment",
      "Kitchen & bathroom focus",
      "Suitable for homes & offices",
    ],
    popular: false,
  },
];

export const getServiceBySlug = (slug) =>
  SERVICES.find((service) => service.slug === slug) ?? null;
