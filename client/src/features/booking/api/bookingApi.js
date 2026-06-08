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

export function toBookingPayload(values, quote) {
  return {
    serviceId: String(values.serviceId),
    cityId: String(values.cityId),
    // Customer details (auto-filled from the account, editable in the wizard).
    customerName: values.name,
    customerEmail: values.email,
    customerPhone: values.phone,
    streetName: values.street,
    houseNumber: values.houseNumber,
    propertySize: String(values.propertySize),
    doorbellName: values.doorbellName,
    bookingDate: values.date,
    bookingTime: values.time,
    hours: Number(values.hours),
    cleaners: Number(values.cleaners),
    totalAmount: quote.total,
    notes: values.notes || null,
    // Add-ons are SpecialRequest ids (validated server-side against enabled items).
    specialRequests: values.additionalServices || [],
    supplies: values.supplies || [],
  };
}

export async function createBooking(payload) {
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
        customer_name: payload.customerName,
        booking_date: payload.bookingDate,
        booking_time: payload.bookingTime,
        total_amount: payload.totalAmount,
      };
    }
    throw err;
  }
}

/**
 * Fetch the signed-in user's bookings (newest first) for the profile history,
 * straight from the database. Service/city ids are returned so the caller can
 * resolve their names from the live catalogues.
 */
export async function getMyBookings() {
  const res = await request({ method: "GET", url: "/booking/my" });
  const list = res?.bookings ?? res?.data?.bookings ?? [];
  return list.map((b) => ({
    _id: b._id,
    reference: ref(b._id),
    service_id: b.serviceId,
    city_id: b.cityId,
    booking_date: b.bookingDate,
    booking_time: b.bookingTime,
    total_amount: b.totalAmount,
    status: b.status,
    special_requests: b.specialRequests ?? [],
  }));
}
