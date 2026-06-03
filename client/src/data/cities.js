/*
 * Service cities
 * --------------
 * Mirrors the backend `city` model. Used to populate the booking flow's
 * location step and the coverage areas shown across the site.
 */

export const CITIES = [
  { id: 1, name: "Rome", enabled: true },
  { id: 2, name: "Florence", enabled: true },
  { id: 3, name: "Milan", enabled: true },
  { id: 4, name: "Naples", enabled: true },
  { id: 5, name: "Venice", enabled: true },
  { id: 6, name: "Bologna", enabled: true },
  { id: 7, name: "Turin", enabled: true },
  { id: 8, name: "Verona", enabled: true },
  { id: 9, name: "Genoa", enabled: true },
  { id: 10, name: "Palermo", enabled: true },
  { id: 11, name: "Bari", enabled: true },
  { id: 12, name: "Catania", enabled: true },
];

export const ENABLED_CITIES = CITIES.filter((c) => c.enabled);
