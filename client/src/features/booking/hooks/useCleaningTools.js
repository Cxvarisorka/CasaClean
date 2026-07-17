import { useQuery } from "@tanstack/react-query";
import { request } from "@/services/api";

/*
 * useCleaningTools
 * ----------------
 * Loads the bookable cleaning tools straight from the backend
 * (`GET /cleaning-tool`, a public endpoint) so the booking wizard always offers
 * exactly the tools an admin has created and enabled — each with its real name
 * and surcharge. Only enabled items are returned, normalised to the option
 * shape the toggle cards and the price engine consume
 * (`{ value, label, price, description, services }`). `services` carries the
 * Service ids the tool is restricted to (empty = usable on every service) so
 * the preferences step can filter by the chosen service. Shared via the query
 * cache so the preferences step, summary and review issue one request.
 */

async function fetchCleaningTools() {
  const data = await request({
    method: "GET",
    url: "/cleaning-tool?limit=100",
  });
  const list = data?.cleaningTools ?? [];
  return list
    .filter((t) => t.enabled)
    .map((t) => ({
      value: t._id,
      label: t.name,
      price: t.price,
      description: t.description || undefined,
      services: (t.services ?? []).map(String),
    }));
}

export function useCleaningTools() {
  return useQuery({
    queryKey: ["cleaning-tools"],
    queryFn: fetchCleaningTools,
    staleTime: 5 * 60 * 1000, // the tool catalogue changes rarely
  });
}

export default useCleaningTools;
