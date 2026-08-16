import { fetchCities } from "./hooks/useCities";
import { fetchSpecialRequests } from "./hooks/useSpecialRequests";
import { fetchCleaningTools } from "./hooks/useCleaningTools";
import { fetchDbServices } from "@/features/services/hooks/useServices";

/*
 * Booking catalogue prefetch
 * --------------------------
 * /booking is a protected route, so RequireAuth holds the page behind
 * `GET /auth/me`. Left alone that serialises the whole entry: the session
 * resolves, THEN the page chunk is fetched, THEN the four catalogue requests it
 * needs go out — three round trips before the first field can be populated.
 *
 * None of this data is user-specific, so none of it has to wait. The router
 * warms it the moment the route is entered, alongside the session check, and by
 * the time the wizard mounts the cache is usually already warm.
 *
 * The keys and staleTime deliberately mirror the hooks that consume them
 * (useCities / useServices / useSpecialRequests / useCleaningTools) — a
 * mismatch would just fetch everything twice.
 */

const CATALOGUE_STALE_TIME = 5 * 60 * 1000;

const QUERIES = [
  ["cities", fetchCities],
  ["services", fetchDbServices],
  ["special-requests", fetchSpecialRequests],
  ["cleaning-tools", fetchCleaningTools],
];

export function prefetchBookingCatalogue(queryClient) {
  return Promise.all(
    QUERIES.map(([key, queryFn]) =>
      // prefetchQuery never rejects and no-ops on a fresh cache entry, so this
      // is safe to call on every entry to the route.
      queryClient.prefetchQuery({
        queryKey: [key],
        queryFn,
        staleTime: CATALOGUE_STALE_TIME,
      })
    )
  );
}
