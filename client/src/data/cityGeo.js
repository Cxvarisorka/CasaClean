/*
 * City geo + imagery
 * ------------------
 * Map coordinates and a representative photo for each service city, keyed by the
 * same English name used across the booking data and the admin store. Kept here
 * (not in the admin store) because these are static facts about a place, not
 * editable business records. The admin coverage map joins this with live booking
 * data to plot where turnovers have been completed.
 */

import { img } from "@/constants/images";

// A small pool of known-valid Unsplash photos, assigned per city. Using vetted
// ids guarantees the hover cards never show a broken image; the map's InfoWindow
// also has an onerror fallback as a second line of defence.
const PHOTOS = [
  img("photo-1552832230-c0197dd311b5", { w: 320, h: 200 }), // Rome — Colosseum
  img("photo-1541370976299-4d24ebbc9077", { w: 320, h: 200 }), // Florence
  img("photo-1520440229-6469a149ac59", { w: 320, h: 200 }), // Milan — Duomo
  img("photo-1518730518541-d0843268c287", { w: 320, h: 200 }), // Naples
  img("photo-1514890547357-a9ee288728e0", { w: 320, h: 200 }), // Venice
  img("photo-1559682468-a6a29e7d9517", { w: 320, h: 200 }), // Bologna
  img("photo-1601581875309-fafbf2d3ed3a", { w: 320, h: 200 }), // Turin
  img("photo-1592906209472-a36b1f3782ef", { w: 320, h: 200 }), // Verona
  img("photo-1610016302534-6f67f1c968d8", { w: 320, h: 200 }), // Genoa
  img("photo-1583774248251-1d3f5b4d2f4a", { w: 320, h: 200 }), // Palermo
  img("photo-1597692493647-7d8b1a9f6f1f", { w: 320, h: 200 }), // Bari
  img("photo-1591287083773-9a4e3d4f5c5b", { w: 320, h: 200 }), // Catania
  img("photo-1531572753322-ad063cecc140", { w: 320, h: 200 }), // Vatican — St. Peter's
];

/**
 * name → geo + image. Coordinates are city centres (lat/lng). The map falls back
 * gracefully for any city missing here (it simply isn't plotted).
 */
export const CITY_GEO = {
  Rome: { lat: 41.9028, lng: 12.4964, image: PHOTOS[0] },
  Florence: { lat: 43.7696, lng: 11.2558, image: PHOTOS[1] },
  Milan: { lat: 45.4642, lng: 9.19, image: PHOTOS[2] },
  Naples: { lat: 40.8518, lng: 14.2681, image: PHOTOS[3] },
  Venice: { lat: 45.4408, lng: 12.3155, image: PHOTOS[4] },
  Bologna: { lat: 44.4949, lng: 11.3426, image: PHOTOS[5] },
  Turin: { lat: 45.0703, lng: 7.6869, image: PHOTOS[6] },
  Verona: { lat: 45.4384, lng: 10.9916, image: PHOTOS[7] },
  Genoa: { lat: 44.4056, lng: 8.9463, image: PHOTOS[8] },
  Palermo: { lat: 38.1157, lng: 13.3615, image: PHOTOS[9] },
  Bari: { lat: 41.1171, lng: 16.8719, image: PHOTOS[10] },
  Catania: { lat: 37.5079, lng: 15.083, image: PHOTOS[11] },
  // Vatican City is its own enclave inside Rome, but gets its own St. Peter's
  // photo (PHOTOS[12]) so it never visually duplicates Rome on the map.
  "Vatican City": { lat: 41.9029, lng: 12.4534, image: PHOTOS[12] },
  Vatican: { lat: 41.9029, lng: 12.4534, image: PHOTOS[12] },
};

/**
 * Case-insensitive geo lookup: admin-entered city names are stored with a
 * single leading capital ("Vatican city"), which won't strict-match the keys
 * above, so resolve by a lowercased comparison.
 */
const GEO_BY_LOWER = Object.fromEntries(
  Object.entries(CITY_GEO).map(([name, geo]) => [name.toLowerCase(), geo])
);

export const geoForCity = (name) =>
  name ? GEO_BY_LOWER[String(name).toLowerCase()] : undefined;

// Geographic centre used to frame the map on first paint (central Italy).
export const ITALY_CENTER = { lat: 42.5, lng: 12.5 };

/** A neutral brand gradient as the ultimate image fallback (data URI, never 404s). */
export const CITY_IMAGE_FALLBACK =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%231dae9f'/><stop offset='1' stop-color='%23134a47'/></linearGradient></defs><rect width='320' height='200' fill='url(%23g)'/></svg>`
  );
