import { useQuery } from "@tanstack/react-query";
import { request } from "@/services/api";
import { IMAGES } from "@/constants/images";

/*
 * useServices
 * -----------
 * The service catalogue shown across the marketing site = the existing,
 * fully-designed static services PLUS any services an admin creates in the
 * database. The static ones are kept verbatim (their imagery, copy and
 * translations); new database services are normalised into the same shape so
 * ServiceCard renders them with identical design. A database service whose name
 * already matches a static one is skipped, so the curated originals always win.
 */

// Database services carry no presentation metadata (image/icon/features), so we
// rotate through the existing service photos to keep the grid visually
// consistent with the static cards.
const FALLBACK_IMAGES = [
  IMAGES.turnover,
  IMAGES.deepClean,
  IMAGES.guestReady,
  IMAGES.linens,
  IMAGES.inspection,
  IMAGES.restock,
];

function normalizeDbService(s, index) {
  return {
    id: s._id, // string id → no i18n entry, so ServiceCard uses these fields directly
    name: s.name,
    description: s.description,
    // Admin-authored sub-title and inclusion list drive the card's tagline and
    // ticked features; fall back to neutral empties when not provided.
    tagline: s.subtitle || "",
    features: Array.isArray(s.includes) ? s.includes : [],
    icon: "Sparkles",
    // Prefer the admin-uploaded image; otherwise rotate through the curated
    // photos so the grid stays visually consistent.
    image: s.image || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
    pricePerHour: s.pricePerHour,
    startingAt: s.pricePerHour,
    popular: false,
    fromDb: true,
    // City coverage: either every city, or the explicit subset the admin chose.
    // The API populates `cities`, so entries are objects ({ _id, ... }); fall
    // back to the raw value in case it ever arrives as a plain id string.
    allCities: Boolean(s.allCities),
    cities: Array.isArray(s.cities)
      ? s.cities.map((c) => String(c?._id ?? c))
      : [],
    // Add-on coverage: either every special request, or the explicit subset the
    // admin enabled. The booking wizard uses this to filter the add-ons offered.
    // The API populates `specialRequests`, so entries are objects ({ _id, ... });
    // fall back to the raw value in case it ever arrives as a plain id string.
    allSpecialRequests: Boolean(s.allSpecialRequests),
    specialRequests: Array.isArray(s.specialRequests)
      ? s.specialRequests.map((sr) => String(sr?._id ?? sr))
      : [],
  };
}

async function fetchDbServices() {
  const data = await request({ method: "GET", url: "/service?limit=100" });
  const list = data?.services ?? [];
  // Every enabled service the admin created — these are what the marketing pages
  // actually render now (no static seed data is shown there anymore).
  return list.filter((s) => s.enabled).map(normalizeDbService);
}

export function useServices() {
  const { data: dbServices = [], ...rest } = useQuery({
    queryKey: ["services"],
    queryFn: fetchDbServices,
    staleTime: 5 * 60 * 1000, // catalogue changes rarely
  });

  return { services: dbServices, dbServices, ...rest };
}

export default useServices;
