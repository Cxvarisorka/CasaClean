/*
 * Admin seed data
 * ---------------
 * Builds the initial admin dataset from the existing marketing data files so
 * the panel reflects the live site on first run. After that, all mutations are
 * persisted to localStorage (see AdminDataContext) — this only runs once.
 *
 * Shapes intentionally mirror the backend Mongoose models (snake_case fields,
 * `_id`, multilingual `*_it` / `*_ka` columns) so this layer can be swapped for
 * real API calls later without touching any page or component.
 */

import { SERVICES } from "@/data/services";
import { CITIES } from "@/data/cities";

/** Stable-ish id generator (crypto.randomUUID with a fallback for old envs). */
export const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();
const daysAhead = (n) => {
  const d = new Date(Date.now() + n * 86_400_000);
  return d.toISOString().slice(0, 10);
};

// --- Services --------------------------------------------------------------
const seedServices = (cityIds = []) =>
  SERVICES.map((s, i) => ({
    _id: uid(),
    name: s.name,
    description: s.description,
    name_it: "",
    name_ka: "",
    description_it: "",
    description_ka: "",
    price_per_hour: s.pricePerHour,
    // Default a new catalog to "available everywhere"; admins narrow it down.
    cities: cityIds,
    enabled: true,
    popular: Boolean(s.popular),
    createdAt: daysAgo(60 - i),
  }));

// --- Cities ----------------------------------------------------------------
const seedCities = () =>
  CITIES.map((c, i) => ({
    _id: uid(),
    name: c.name,
    name_it: "",
    name_ka: "",
    enabled: c.enabled,
    working_days: "1,2,3,4,5,6",
    working_hours_start: "09:00",
    working_hours_end: "18:00",
    createdAt: daysAgo(90 - i),
  }));

// --- Users -----------------------------------------------------------------
const seedUsers = () => [
  {
    _id: uid(),
    fullname: "CasaClean Admin",
    email: "admin@casaclean.com",
    phone: "+39 351 000 0000",
    role: "admin",
    isVerified: true,
    createdAt: daysAgo(120),
  },
  {
    _id: uid(),
    fullname: "Lela Gorelishvili",
    email: "llgorelishvili@gmail.com",
    phone: "+39 389 149 6149",
    role: "user",
    isVerified: true,
    createdAt: daysAgo(42),
  },
  {
    _id: uid(),
    fullname: "Marco Rossi",
    email: "marco.rossi@example.it",
    phone: "+39 333 221 8890",
    role: "user",
    isVerified: true,
    createdAt: daysAgo(31),
  },
  {
    _id: uid(),
    fullname: "Giulia Bianchi",
    email: "giulia.bianchi@example.it",
    phone: "+39 340 778 1245",
    role: "user",
    isVerified: false,
    createdAt: daysAgo(12),
  },
  {
    _id: uid(),
    fullname: "Nino Kapanadze",
    email: "nino.kapanadze@example.ge",
    phone: "+995 599 12 34 56",
    role: "user",
    isVerified: true,
    createdAt: daysAgo(5),
  },
];

// --- Bookings --------------------------------------------------------------
const STATUSES = ["pending", "confirmed", "in_progress", "completed", "cancelled"];

const seedBookings = () => {
  const samples = [
    ["Turnover Cleaning", "Rome", "Lela Gorelishvili", "llgorelishvili@gmail.com", "+39 389 149 6149", "Via Giovanni Giorgi", "5", 40, 2, 2, 49, "confirmed", 1, daysAhead(2)],
    ["Deep Cleaning", "Milan", "Marco Rossi", "marco.rossi@example.it", "+39 333 221 8890", "Corso Buenos Aires", "112", 85, 4, 2, 196, "completed", 9, daysAgo(3)],
    ["Linen Management", "Florence", "Giulia Bianchi", "giulia.bianchi@example.it", "+39 340 778 1245", "Via dei Calzaiuoli", "27", 60, 3, 1, 88, "pending", 0, daysAhead(5)],
    ["Guest-Ready Prep", "Venice", "Sofia Conti", "sofia.conti@example.it", "+39 366 901 4423", "Calle Larga", "1410", 55, 2, 1, 70, "in_progress", 2, daysAhead(1)],
    ["Property Inspection", "Naples", "Luca Romano", "luca.romano@example.it", "+39 320 556 7781", "Via Toledo", "210", 70, 2, 1, 52, "confirmed", 4, daysAhead(3)],
    ["Turnover Cleaning", "Turin", "Anna Ferrari", "anna.ferrari@example.it", "+39 348 112 9087", "Via Roma", "88", 45, 3, 2, 119, "cancelled", 6, daysAgo(8)],
    ["Supply Restocking", "Bologna", "Davide Greco", "davide.greco@example.it", "+39 351 778 2210", "Via Indipendenza", "33", 38, 1, 1, 19, "completed", 12, daysAgo(14)],
    ["Deep Cleaning", "Rome", "Elena Russo", "elena.russo@example.it", "+39 333 009 1122", "Via del Corso", "401", 95, 5, 2, 240, "confirmed", 1, daysAhead(7)],
    ["Turnover Cleaning", "Genoa", "Paolo Marino", "paolo.marino@example.it", "+39 347 220 8841", "Via Garibaldi", "12", 50, 2, 1, 49, "pending", 11, daysAhead(4)],
    ["Linen Management", "Palermo", "Chiara Costa", "chiara.costa@example.it", "+39 366 554 7712", "Via Maqueda", "59", 65, 3, 1, 95, "completed", 13, daysAgo(20)],
    ["Guest-Ready Prep", "Verona", "Matteo Gallo", "matteo.gallo@example.it", "+39 340 661 4490", "Via Mazzini", "6", 48, 2, 1, 70, "confirmed", 7, daysAhead(6)],
    ["Property Inspection", "Bari", "Francesca Lombardi", "francesca.lombardi@example.it", "+39 351 990 2218", "Via Sparano", "120", 72, 2, 1, 52, "in_progress", 10, daysAgo(1)],
  ];

  return samples.map((r, i) => ({
    _id: uid(),
    reference: `CC-${(1000 + i).toString(36).toUpperCase()}${i}`,
    service_name: r[0],
    city_name: r[1],
    customer_name: r[2],
    customer_email: r[3],
    customer_phone: r[4],
    street_name: r[5],
    house_number: r[6],
    property_size: r[7],
    hours: r[8],
    cleaners: r[9],
    total_amount: r[10],
    status: r[11],
    booking_date: r[13],
    booking_time: ["09:00", "11:30", "14:00", "16:30"][i % 4],
    notes: "",
    createdAt: daysAgo((i % 6) + 1),
  }));
};

/** Build the full initial dataset. */
export const buildSeed = () => {
  const cities = seedCities();
  const enabledCityIds = cities.filter((c) => c.enabled).map((c) => c._id);
  return {
    services: seedServices(enabledCityIds),
    cities,
    users: seedUsers(),
    bookings: seedBookings(),
  };
};

export const BOOKING_STATUSES = STATUSES;
