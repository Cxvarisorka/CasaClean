import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/services/api";
import { useTranslation, localizedField } from "@/i18n";

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
 *
 * Title and description are shown in the visitor's language when the admin has
 * translated them, falling back per field to the default locale — see
 * i18n/localizeRecord.js.
 */

export async function fetchSpecialRequests() {
  const data = await request({
    method: "GET",
    url: "/special-request?limit=100",
  });
  const list = data?.specialRequests ?? [];
  // Kept raw (translations included) so switching language costs no request.
  return list.filter((s) => s.enabled);
}

export function useSpecialRequests() {
  const { locale } = useTranslation();

  const { data: records, ...rest } = useQuery({
    queryKey: ["special-requests"],
    queryFn: fetchSpecialRequests,
    staleTime: 5 * 60 * 1000, // add-ons change rarely
  });

  // Language is applied here rather than in the query so the cached list is
  // shared across languages — a switch re-derives, it doesn't re-fetch.
  const data = useMemo(
    () =>
      records?.map((s) => ({
        value: s._id,
        label: localizedField(s, "name", locale),
        price: s.price,
        description: localizedField(s, "description", locale) || undefined,
      })),
    [records, locale]
  );

  return { ...rest, data };
}

export default useSpecialRequests;
