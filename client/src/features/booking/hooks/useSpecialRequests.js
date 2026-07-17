import { useQuery } from "@tanstack/react-query";
import { request } from "@/services/api";

/*
 * useSpecialRequests
 * ------------------
 * Loads the bookable add-ons straight from the backend (`GET /special-request`,
 * a public endpoint) so the booking wizard always offers exactly the add-ons an
 * admin has created and enabled — each with its real title and price. Only
 * enabled items are returned, normalised to the option shape the add-on cards
 * and the price engine consume (`{ value, label, price, description }`). Shared
 * via the query cache so the preferences step, summary and review issue one
 * request.
 */

async function fetchSpecialRequests() {
  const data = await request({
    method: "GET",
    url: "/special-request?limit=100",
  });
  const list = data?.specialRequests ?? [];
  return list
    .filter((s) => s.enabled)
    .map((s) => ({
      value: s._id,
      label: s.name,
      price: s.price,
      description: s.description || undefined,
    }));
}

export function useSpecialRequests() {
  return useQuery({
    queryKey: ["special-requests"],
    queryFn: fetchSpecialRequests,
    staleTime: 5 * 60 * 1000, // add-ons change rarely
  });
}

export default useSpecialRequests;
