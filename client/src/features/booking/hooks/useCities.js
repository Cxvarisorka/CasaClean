import { useQuery } from "@tanstack/react-query";
import { request } from "@/services/api";

/*
 * useCities
 * ---------
 * Loads the bookable cities straight from the backend (`GET /city`, a public
 * endpoint) so the booking wizard always offers exactly the cities an admin has
 * enabled in the database — no static/hardcoded list. Only enabled cities are
 * returned, normalised to `{ id, name }` (id is the city's Mongo `_id`). Shared
 * via the query cache so the dropdown and the review step issue one request.
 */

async function fetchCities() {
  const data = await request({ method: "GET", url: "/city?limit=100" });
  const cities = data?.cities ?? [];
  return cities
    .filter((c) => c.enabled)
    .map((c) => ({ id: c._id, name: c.name }));
}

export function useCities() {
  return useQuery({
    queryKey: ["cities"],
    queryFn: fetchCities,
    staleTime: 5 * 60 * 1000, // cities change rarely; avoid refetch churn
  });
}

export default useCities;
