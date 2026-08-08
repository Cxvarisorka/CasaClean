import { apiClient } from "@/services/api";

/*
 * Public service reviews
 * ----------------------
 * The published reviews for one service, as shown on `/services/:slug`. Only
 * reviews an admin has approved come back from this endpoint — the moderation
 * gate lives server-side, so this layer never has to filter anything.
 *
 * `apiClient` is used directly rather than `request()` because the aggregate the
 * page header needs (total count + average across ALL published reviews, not
 * just the page) rides on the envelope next to `data`, which `request()` strips.
 */

const reviewFromApi = (r) => ({
  id: r._id,
  rating: Number(r.rating) || 0,
  comment: r.review_text ?? "",
  // Already shortened to "Giorgi K." by the API — full names are never public.
  author: r.author ?? "",
  createdAt: r.createdAt,
});

export async function fetchServiceReviews(serviceId, { page = 1, limit = 6 } = {}) {
  const response = await apiClient.request({
    method: "GET",
    url: `/review/service/${serviceId}?page=${page}&limit=${limit}`,
  });
  const body = response.data ?? {};

  return {
    reviews: (body.data?.reviews ?? []).map(reviewFromApi),
    // Totals for the whole service, independent of how many rows we asked for.
    reviewCount: Number(body.reviewCount) || 0,
    averageRating: Number(body.averageRating) || 0,
  };
}
