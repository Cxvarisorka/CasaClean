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
    title: "On time, every time",
    description:
      "Punctual professionals, live scheduling and a 99.6% on-time arrival rate — even for same-day requests.",
  },
  {
    id: "standards",
    icon: "ClipboardCheck",
    title: "Background-checked professionals",
    description:
      "Every cleaner is identity-verified, background-checked, insured and trained on our 50-point standard before their first visit.",
  },
  {
    id: "allinone",
    icon: "Layers",
    title: "One team for home and office",
    description:
      "Regular cleaning, deep cleans, offices, move-outs, laundry and disinfection — one booking, one invoice, one standard.",
  },
  {
    id: "guarantee",
    icon: "BadgeCheck",
    title: "The Spotless Guarantee",
    description:
      "Not happy with a clean? Tell us within 48 hours and we'll re-clean for free — or refund the visit.",
  },
];

export const COMPANY_VALUES = [
  {
    id: "hospitality",
    icon: "HeartHandshake",
    title: "Care in every corner",
    description:
      "We clean every home as if the owner were watching — because trust is earned in the details.",
  },
  {
    id: "accountability",
    icon: "ClipboardCheck",
    title: "Radical accountability",
    description:
      "Clear checklists and honest feedback loops. If we miss something, we own it and make it right, fast.",
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
    title: "Built to grow with you",
    description:
      "From a studio apartment to a chain of offices, our team and tooling scale without dropping a visit.",
  },
];

export const LEADERSHIP = [
  {
    id: "founder",
    name: "Lela Gorelishvili",
    role: "Co-founder & CEO",
    avatar: "LG",
    photo: PORTRAITS.w2,
    bio: "Former hotel housekeeping director who led cleaning teams across 200+ rooms and suites.",
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
    bio: "Product leader focused on tools that make booking and managing a clean feel effortless.",
  },
  {
    id: "quality",
    name: "Daniele Conti",
    role: "Head of Quality",
    avatar: "DC",
    photo: PORTRAITS.m3,
    bio: "Defined the 50-point standard that every CasaClean visit is measured against.",
  },
];

export const COMPANY_MILESTONES = [
  { id: "m1", year: "2021", title: "Founded in Rome", description: "Started with three cleaners and one promise: cleaning people can rely on." },
  { id: "m2", year: "2022", title: "1,000th booking", description: "Word of mouth carried us to Florence and Milan within the first year." },
  { id: "m3", year: "2023", title: "The Spotless Guarantee", description: "Launched our 50-point standard and re-clean-for-free guarantee." },
  { id: "m4", year: "2024", title: "12 cities, 48k+ cleans", description: "Became the go-to cleaning partner for homes and offices alike." },
];
