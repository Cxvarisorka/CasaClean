/*
 * Testimonials
 * ------------
 * Social proof for the carousel and review sections. `rating` is 1–5.
 */

import { PORTRAITS } from "@/constants/images";

export const TESTIMONIALS = [
  {
    id: "t1",
    name: "Sofia Marchetti",
    role: "Working parent · Weekly clean",
    location: "Rome, IT",
    avatar: "SM",
    photo: PORTRAITS.w1,
    rating: 5,
    quote:
      "Coming home on Friday to a spotless apartment has genuinely changed our week. Same cleaner every visit, and she knows exactly how we like things.",
    metric: "Weekly customer for 2 years",
  },
  {
    id: "t2",
    name: "James Whitlock",
    role: "Office Manager · Design studio",
    location: "Florence, IT",
    avatar: "JW",
    photo: PORTRAITS.m1,
    rating: 5,
    quote:
      "Our studio is cleaned before the team arrives, invoiced once a month, zero chasing. Switching to CasaClean removed a whole task from my job.",
    metric: "3 locations, one invoice",
  },
  {
    id: "t3",
    name: "Aisha Rahman",
    role: "Expat professional",
    location: "Milan, IT",
    avatar: "AR",
    photo: PORTRAITS.w2,
    rating: 5,
    quote:
      "I booked in English in about a minute, and my cleaner spoke English too — no awkward translation apps. My flat has never looked better.",
    metric: "Booked in under a minute",
  },
  {
    id: "t4",
    name: "Marco De Luca",
    role: "Landlord · 6 apartments",
    location: "Naples, IT",
    avatar: "MD",
    photo: PORTRAITS.m2,
    rating: 5,
    quote:
      "Their move-out cleans are so thorough my tenants get their deposits back without a single dispute. I book one for every changeover now.",
    metric: "Full deposits returned",
  },
  {
    id: "t5",
    name: "Elena Novak",
    role: "Retired teacher",
    location: "Venice, IT",
    avatar: "EN",
    photo: PORTRAITS.w3,
    rating: 5,
    quote:
      "The deep clean reached places I haven't managed in years — inside the oven, behind the furniture, all of it. Kind, careful people.",
    metric: "4.97★ after 40+ visits",
  },
];
