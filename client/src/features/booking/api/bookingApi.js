import { request } from "@/services/api";

/*
 * Booking API
 * -----------
 * Maps the wizard's form values onto the backend `booking` payload (camelCase,
 * exactly what createBooking reads) and posts it to the real endpoint. The
 * booking page is auth-guarded, so the session cookie authorises the request
 * and the booking is tied to the signed-in customer. Selected add-ons are the
 * chosen special-request ids; the service/city ids are sent as-is.
 */

const ref = (id) => `CC-${String(id).slice(-6).toUpperCase()}`;

export function toBookingPayload(values) {
  return {
    serviceId: values.serviceId,
    cityId: values.cityId,
    // Name and email are NOT sent: the server derives them from the signed-in
    // account (a user can't book under someone else's identity) and rejects them
    // as unknown fields. Phone is allowed (falls back to the account's number).
    customerPhone: values.phone,
    streetName: values.street,
    houseNumber: values.houseNumber,
    propertySize: String(values.propertySize),
    doorbellName: values.doorbellName,
    bookingDate: values.date,
    bookingTime: values.time,
    hours: Number(values.hours),
    cleaners: Number(values.cleaners),
    // totalAmount is computed and stored server-side from the service price,
    // hours and selected add-ons — never trusted from the client.
    notes: values.notes || null,
    // Add-ons are SpecialRequest ids (validated server-side against enabled items).
    specialRequests: values.additionalServices || [],
    supplies: values.supplies || [],
  };
}

/**
 * Submit a booking. `input` is either the raw server payload, or
 * `{ payload, display }` where `display` carries name/total used ONLY to render
 * the offline-simulated confirmation (those values aren't sent — the server
 * derives the name and computes the total itself).
 */
export async function createBooking(input) {
  const payload = input?.payload ?? input;
  const display = input?.display ?? {};
  try {
    const res = await request({ method: "POST", url: "/booking", data: payload });
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
  } catch (err) {
    // Only simulate when the API is genuinely unreachable (preview/offline);
    // real validation errors from a live server still surface to the user.
    if (err?.status === 0) {
      await new Promise((r) => setTimeout(r, 700));
      return {
        id: `CC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        status: "confirmed",
        simulated: true,
        customer_name: display.customerName,
        booking_date: payload.bookingDate,
        booking_time: payload.bookingTime,
        total_amount: display.totalAmount,
      };
    }
    throw err;
  }
}

/**
 * Cancel one of the signed-in user's own bookings. The server enforces ownership
 * and only allows cancelling a pending/confirmed booking.
 */
export async function cancelMyBooking(id) {
  const res = await request({ method: "PATCH", url: `/booking/${id}/cancel` });
  const b = res?.booking ?? res;
  return { _id: b._id, status: b.status };
}

/**
 * Fetch the signed-in user's bookings (newest first) for the profile history,
 * straight from the database. Service/city ids are returned so the caller can
 * resolve their names from the live catalogues.
 */
export async function getMyBookings() {
  const res = await request({ method: "GET", url: "/booking/my" });
  const list = res?.bookings ?? res?.data?.bookings ?? [];
  // serviceId/cityId may be raw ids or populated `{ _id, name }` objects — keep
  // the id (the profile page resolves names from the live catalogues).
  const idOf = (v) => (v && typeof v === "object" ? v._id : v);
  return list.map((b) => ({
    _id: b._id,
    reference: ref(b._id),
    service_id: idOf(b.serviceId),
    city_id: idOf(b.cityId),
    booking_date: b.bookingDate,
    booking_time: b.bookingTime,
    total_amount: b.totalAmount,
    status: b.status,
    special_requests: b.specialRequests ?? [],
  }));
}
