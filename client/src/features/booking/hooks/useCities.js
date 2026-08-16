import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { request } from "@/services/api";
import { useTranslation, localizedField } from "@/i18n";

/*
 * useCities
 * ---------
 * Loads the bookable cities straight from the backend (`GET /city`, a public
 * endpoint) so the booking wizard always offers exactly the cities an admin has
 * enabled in the database — no static/hardcoded list. Only enabled cities are
 * returned, normalised to `{ id, name, workingHourStarts, workingHourEnds }`
 * (id is the city's Mongo `_id`). Shared via the query cache so the dropdown,
 * the schedule step and the review step issue one request.
 *
 * The name is shown in the visitor's language when the admin has translated it
 * ("Rome" → "Roma"), falling back to the default-locale name — see
 * i18n/localizeRecord.js.
 *
 * The working hours are part of the contract, not decoration: the server rejects
 * any booking that starts outside them or runs past closing
 * (assertBookingWindow), so the schedule step MUST build its slots from these
 * values rather than a hardcoded list.
 */

export async function fetchCities() {
  const data = await request({ method: "GET", url: "/city?limit=100" });
  const cities = data?.cities ?? [];
  // Kept raw (translations included) so switching language costs no request.
  return cities.filter((c) => c.enabled);
}

export function useCities() {
  const { locale } = useTranslation();

  const { data: records, ...rest } = useQuery({
    queryKey: ["cities"],
    queryFn: fetchCities,
    staleTime: 5 * 60 * 1000, // cities change rarely; avoid refetch churn
  });

  // Language is applied here rather than in the query so the cached list is
  // shared across languages — a switch re-derives, it doesn't re-fetch.
  const data = useMemo(
    () =>
      records?.map((c) => ({
        id: c._id,
        name: localizedField(c, "name", locale),
        workingHourStarts: c.workingHourStarts,
        workingHourEnds: c.workingHourEnds,
      })),
    [records, locale]
  );

  return { ...rest, data };
}

export default useCities;
