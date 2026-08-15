import { useMemo } from "react";
import { useServices } from "./useServices";

/*
 * useService
 * ----------
 * Resolves a single service for the detail page (`/services/:slug`). It reads
 * from the same cached catalogue `useServices` loads, so opening a service from
 * a card costs no extra request and the shapes stay identical to the grid.
 *
 * The param is matched against the slug first (the canonical, shareable URL) and
 * then against the raw Mongo id, so an id-based link keeps working.
 */

export function useService(slugOrId) {
  const { services, isLoading, isError } = useServices();

  const service = useMemo(() => {
    if (!slugOrId) return null;
    const key = String(slugOrId).toLowerCase();
    return (
      services.find((s) => s.slug === key) ??
      services.find((s) => String(s.id) === String(slugOrId)) ??
      null
    );
  }, [services, slugOrId]);

  // A few sibling offerings to keep the user browsing when this one isn't it.
  const related = useMemo(
    () =>
      service
        ? services.filter((s) => String(s.id) !== String(service.id)).slice(0, 3)
        : [],
    [services, service]
  );

  return {
    service,
    related,
    isLoading,
    isError,
    // Distinguish "still loading" from "the catalogue loaded and has no such
    // service" so the page shows a skeleton rather than a false 404.
    notFound: !isLoading && !isError && !service,
  };
}

export default useService;
