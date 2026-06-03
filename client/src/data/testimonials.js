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
    role: "Superhost · 8 listings",
    location: "Rome, IT",
    avatar: "SM",
    photo: PORTRAITS.w1,
    rating: 5,
    quote:
      "CasaClean turned our turnover chaos into a non-event. Same-day cleans, photo reports before each guest, and our review scores have never been higher.",
    metric: "4.97★ average rating",
  },
  {
    id: "t2",
    name: "James Whitlock",
    role: "Property Manager · 24 units",
    location: "Florence, IT",
    avatar: "JW",
    photo: PORTRAITS.m1,
    rating: 5,
    quote:
      "We replaced three vendors with one platform. The inspection photos alone have saved us thousands in disputed damage claims.",
    metric: "31% fewer guest complaints",
  },
  {
    id: "t3",
    name: "Aisha Rahman",
    role: "Airbnb Host · 3 listings",
    location: "Milan, IT",
    avatar: "AR",
    photo: PORTRAITS.w2,
    rating: 5,
    quote:
      "I book a turnover in under a minute and forget about it. Linens, restocking, the works — my guests think I have a full-time housekeeper.",
    metric: "12 hrs/week saved",
  },
  {
    id: "t4",
    name: "Marco De Luca",
    role: "Real Estate Investor · 15 units",
    location: "Naples, IT",
    avatar: "MD",
    photo: PORTRAITS.m2,
    rating: 5,
    quote:
      "Reliability is everything when you're scaling. CasaClean has never missed a turnover in 14 months — that consistency is worth a premium.",
    metric: "100% on-time turnovers",
  },
  {
    id: "t5",
    name: "Elena Novak",
    role: "Short-Term Rental Operator",
    location: "Venice, IT",
    avatar: "EN",
    photo: PORTRAITS.w3,
    rating: 5,
    quote:
      "The dashboard gives me a single view across every property. Onboarding a new listing now takes minutes instead of an afternoon.",
    metric: "9 listings, one login",
  },
];
