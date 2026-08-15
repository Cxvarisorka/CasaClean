import { request } from "@/services/api";

/*
 * Customer review API
 * -------------------
 * Reviews are per-booking: a customer can rate every booking they had once it's
 * COMPLETED (the server enforces ownership + completed status, and one review
 * per booking). The profile page uses `getMyReviews` to know which bookings are
 * already rated and `createBookingReview` to submit a new rating.
 */

// `booking`/`service_id` come back as raw ObjectId strings here (the /my feed
// isn't populated) — normalise defensively in case that ever changes.
const idOf = (v) => (v && typeof v === "object" ? v._id : v);

/** Fetch the signed-in user's own reviews, keyed for a bookingId → review map. */
export async function getMyReviews() {
  const res = await request({ method: "GET", url: "/review/my" });
  const list = res?.reviews ?? res?.data?.reviews ?? [];
  return list.map((r) => ({
    _id: r._id,
    booking_id: idOf(r.booking),
    service_id: idOf(r.service_id),
    rating: Number(r.rating) || 0,
    comment: r.review_text ?? "",
    createdAt: r.createdAt,
  }));
}

/** Submit a rating + comment for one of the user's own completed bookings. */
export async function createBookingReview(bookingId, { rating, comment }) {
  const res = await request({
    method: "POST",
    url: `/review/booking/${bookingId}`,
    data: { rating: Number(rating), review_text: comment },
  });
  return res?.review ?? res;
}
