import { request } from "@/services/api";

/*
 * Payment API (Stripe)
 * --------------------
 * Talks to the server's /payment/* endpoints. The booking flow is pay-first:
 *   1. createBookingIntent — server validates + prices the booking, stores a
 *      pending draft, and returns a PaymentIntent clientSecret.
 *   2. (client confirms the card payment with Stripe.js)
 *   3. finalizeBooking — promotes the paid intent into a real booking.
 * The session cookie authorises every call (withCredentials + X-Requested-With
 * are set on the shared axios instance).
 */

const ref = (id) => `CC-${String(id).slice(-6).toUpperCase()}`;

/**
 * Create a PaymentIntent for the booking described by `payload` (the same
 * camelCase shape createBooking expects). Optionally save the card, or pay with a
 * previously-saved one. Returns { clientSecret, paymentIntentId, paymentStatus,
 * amount, currency } — amount/total are authoritative (server-computed).
 */
export async function createBookingIntent({ payload, savePaymentMethod, savedPaymentMethodId }) {
  const data = { ...payload };
  if (savePaymentMethod) data.savePaymentMethod = true;
  if (savedPaymentMethodId) data.savedPaymentMethodId = savedPaymentMethodId;

  return request({ method: "POST", url: "/payment/booking/intent", data });
}

/**
 * Promote a succeeded PaymentIntent into a real booking. Returns the normalised
 * booking shape the ConfirmationStep renders. The server is idempotent, so the
 * webhook backstop creating the same booking first is harmless.
 */
export async function finalizeBooking(paymentIntentId) {
  const res = await request({
    method: "POST",
    url: "/payment/booking/finalize",
    data: { paymentIntentId },
  });
  const b = res?.booking ?? res;
  return {
    _id: b._id,
    id: ref(b._id),
    customer_name: b.customerName,
    booking_date: b.bookingDate,
    booking_time: b.bookingTime,
    total_amount: b.totalAmount,
    status: b.status,
  };
}

/** List the signed-in user's saved cards. */
export async function listSavedCards() {
  const res = await request({ method: "GET", url: "/payment/methods" });
  return res?.paymentMethods ?? [];
}

/** Create a SetupIntent to add a new card (no charge). Returns its clientSecret. */
export async function createSetupIntent() {
  const res = await request({ method: "POST", url: "/payment/methods/setup-intent" });
  return res?.clientSecret;
}

/** Remove a saved card. */
export async function deleteSavedCard(id) {
  return request({ method: "DELETE", url: `/payment/methods/${id}` });
}
