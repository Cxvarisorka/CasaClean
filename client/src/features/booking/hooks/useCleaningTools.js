import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/services/api";
import { useTranslation, localizedField } from "@/i18n";

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
 *
 * Name and description are shown in the visitor's language when the admin has
 * translated them, falling back per field to the default locale — see
 * i18n/localizeRecord.js.
 */

async function fetchCleaningTools() {
  const data = await request({
    method: "GET",
    url: "/cleaning-tool?limit=100",
  });
  const list = data?.cleaningTools ?? [];
  // Kept raw (translations included) so switching language costs no request.
  return list.filter((t) => t.enabled);
}

export function useCleaningTools() {
  const { locale } = useTranslation();

  const { data: records, ...rest } = useQuery({
    queryKey: ["cleaning-tools"],
    queryFn: fetchCleaningTools,
    staleTime: 5 * 60 * 1000, // the tool catalogue changes rarely
  });

  // Language is applied here rather than in the query so the cached list is
  // shared across languages — a switch re-derives, it doesn't re-fetch.
  const data = useMemo(
    () =>
      records?.map((t) => ({
        value: t._id,
        label: localizedField(t, "name", locale),
        price: t.price,
        description: localizedField(t, "description", locale) || undefined,
        services: (t.services ?? []).map(String),
      })),
    [records, locale]
  );

  return { ...rest, data };
}

export default useCleaningTools;
