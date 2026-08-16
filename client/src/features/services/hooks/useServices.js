import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { request, assetUrl } from "@/services/api";
import { IMAGES } from "@/constants/images";
import { generateSlug } from "@/utils/generateSlug";
import { useTranslation, localizedField } from "@/i18n";

/*
 * useServices
 * -----------
 * The service catalogue shown across the marketing site, loaded from the API and
 * normalised into the shape ServiceCard renders. Copy is multilingual — see
 * i18n/localizeRecord.js for how a language is resolved per field.
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

function normalizeDbService(s, index, locale) {
  const includes = localizedField(s, "includes", locale);

  return {
    id: s._id, // string id → no i18n entry, so ServiceCard uses these fields directly
    // Readable URL key for the detail page (`/services/:slug`). Derived from the
    // *default-locale* name, which the API keeps unique, so the slug is unique
    // too — and, just as importantly, stable: a shared link keeps working when
    // the visitor switches language. The id stays the booking identifier.
    slug: generateSlug(s.name) || String(s._id),
    name: localizedField(s, "name", locale),
    description: localizedField(s, "description", locale),
    // Admin-authored sub-title and inclusion list drive the card's tagline and
    // ticked features; fall back to neutral empties when not provided.
    tagline: localizedField(s, "subtitle", locale) || "",
    features: Array.isArray(includes) ? includes : [],
    icon: "Sparkles",
    // Prefer the admin-uploaded image (stored as a relative /uploads path, so
    // resolve it against the API origin); otherwise rotate through the curated
    // photos so the grid stays visually consistent.
    image: assetUrl(s.image) || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length],
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
    // Recurrence: whether this service can be booked on a repeating schedule at
    // all, and (optionally) the exact cadences the admin pinned. An empty list
    // means the customer picks any cadence in the platform range — see
    // recurrenceChoices() in features/booking/constants.js.
    recurringEnabled: Boolean(s.recurringEnabled),
    recurringIntervalDays: Array.isArray(s.recurringIntervalDays)
      ? s.recurringIntervalDays.map(Number).filter(Number.isInteger)
      : [],
    // Same-day booking: when true this service skips the 48-hour advance
    // notice, so the wizard's date picker opens on today instead of two days
    // out. Fail-closed — an absent flag means the notice applies.
    allowInstantBooking: Boolean(s.allowInstantBooking),
  };
}

export async function fetchDbServices() {
  const data = await request({ method: "GET", url: "/service?limit=100" });
  const list = data?.services ?? [];
  // Every enabled service the admin created — these are what the marketing pages
  // actually render now (no static seed data is shown there anymore). Kept raw
  // (translations included) so switching language costs no request.
  return list.filter((s) => s.enabled);
}

export function useServices() {
  const { locale } = useTranslation();

  const { data: records = [], ...rest } = useQuery({
    queryKey: ["services"],
    queryFn: fetchDbServices,
    staleTime: 5 * 60 * 1000, // catalogue changes rarely
  });

  // Language is applied here rather than in the query so the cached catalogue is
  // shared across languages — a switch re-derives, it doesn't re-fetch.
  const dbServices = useMemo(
    () => records.map((s, index) => normalizeDbService(s, index, locale)),
    [records, locale]
  );

  return { services: dbServices, dbServices, ...rest };
}

export default useServices;
