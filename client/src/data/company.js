/*
 * Company content
 * ---------------
 * Values, leadership and differentiators used on the About and Home pages.
 */

import { PORTRAITS } from "@/constants/images";

export const WHY_CASACLEAN = [
  {
    id: "reliability",
    icon: "ShieldCheck",
    title: "Reliability you can schedule around",
    description:
      "Vetted crews, calendar sync and a 99.6% on-time rate mean turnovers happen — even on same-day back-to-backs.",
  },
  {
    id: "standards",
    icon: "ClipboardCheck",
    title: "A standard you can prove",
    description:
      "Every clean follows a 50-point checklist and ends in a photo report, so quality is documented, not assumed.",
  },
  {
    id: "allinone",
    icon: "Layers",
    title: "One vendor, every turnover task",
    description:
      "Cleaning, linens, restocking and inspections under one roof — and one dashboard across all your listings.",
  },
  {
    id: "guarantee",
    icon: "BadgeCheck",
    title: "The Guest-Ready Guarantee",
    description:
      "If a turnover isn't right, we re-clean within 24 hours or refund the visit. Your reviews are protected.",
  },
];

export const COMPANY_VALUES = [
  {
    id: "hospitality",
    icon: "HeartHandshake",
    title: "Hospitality first",
    description:
      "We treat every property like a five-star stay — because your guests' reviews depend on it.",
  },
  {
    id: "accountability",
    icon: "ClipboardCheck",
    title: "Radical accountability",
    description:
      "Photo reports on every visit. If we miss something, we own it and make it right, fast.",
  },
  {
    id: "craft",
    icon: "Sparkles",
    title: "Pride in the craft",
    description:
      "Cleaning is a skill. We train, certify and reward the professionals who do it brilliantly.",
  },
  {
    id: "scale",
    icon: "TrendingUp",
    title: "Built to scale with you",
    description:
      "From one listing to a hundred, our operations and tooling grow without dropping a turnover.",
  },
];

export const LEADERSHIP = [
  {
    id: "founder",
    name: "Lela Gorelishvili",
    role: "Co-founder & CEO",
    avatar: "LG",
    photo: PORTRAITS.w2,
    bio: "Former hospitality operations lead who scaled turnover teams across 200+ short-term rentals.",
  },
  {
    id: "ops",
    name: "Marco Bianchi",
    role: "Co-founder & COO",
    avatar: "MB",
    photo: PORTRAITS.m1,
    bio: "Built and ran multi-city field operations for an on-demand logistics company.",
  },
  {
    id: "product",
    name: "Nina Petrova",
    role: "Head of Product",
    avatar: "NP",
    photo: PORTRAITS.w3,
    bio: "Product leader focused on tools that make complex operations feel effortless.",
  },
  {
    id: "quality",
    name: "Daniele Conti",
    role: "Head of Quality",
    avatar: "DC",
    photo: PORTRAITS.m3,
    bio: "Defined the 50-point standard that every CasaClean turnover is measured against.",
  },
];

export const COMPANY_MILESTONES = [
  { id: "m1", year: "2021", title: "Founded in Rome", description: "Started with three crews and a five-star obsession." },
  { id: "m2", year: "2022", title: "1,000th turnover", description: "Expanded to Florence and Milan within the first year." },
  { id: "m3", year: "2023", title: "Inspection platform", description: "Launched photo-documented 50-point inspections." },
  { id: "m4", year: "2024", title: "12 cities, 48k+ cleans", description: "Became the operations partner of choice for managers." },
];
