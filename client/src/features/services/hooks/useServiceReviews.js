import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchServiceReviews } from "../api/serviceReviewsApi";

/*
 * useServiceReviews
 * -----------------
 * Published reviews for one service, for the public detail page. The list is
 * intentionally short by default; asking for more just re-runs the query with a
 * bigger `limit` (the API is a single page, newest first), and the previous
 * result stays on screen while that resolves so the section never collapses.
 *
 * Reviews are moderated, so an unapproved one simply isn't in the response —
 * there is nothing to filter here.
 */

/** How many reviews the page shows before "show all". */
export const REVIEWS_PREVIEW_SIZE = 6;

/** The API clamps `limit` at 50; asking for more would silently return 50. */
export const REVIEWS_MAX = 50;

export function useServiceReviews(serviceId, { limit = REVIEWS_PREVIEW_SIZE } = {}) {
  const { data, ...rest } = useQuery({
    queryKey: ["service-reviews", String(serviceId ?? ""), limit],
    queryFn: () => fetchServiceReviews(serviceId, { limit }),
    // Nothing to fetch until the catalogue has resolved the service.
    enabled: Boolean(serviceId),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  return {
    reviews: data?.reviews ?? [],
    reviewCount: data?.reviewCount ?? 0,
    averageRating: data?.averageRating ?? 0,
    ...rest,
  };
}

export default useServiceReviews;
