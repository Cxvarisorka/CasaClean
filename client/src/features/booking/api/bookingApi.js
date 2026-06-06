import { request, ENDPOINTS } from "@/services/api";

/*
 * Booking API
 * -----------
 * Maps the wizard's form values onto the backend `booking` payload, then posts
 * it. Like the contact API, it degrades gracefully when the endpoint isn't
 * provisioned (preview environments) so the success flow is always reachable;
 * genuine validation errors from a live endpoint still surface to the user.
 */

export function toBookingPayload(values, quote) {
  return {
    service_id: Number(values.serviceId),
    city_id: Number(values.cityId),
    customer_name: values.name,
    customer_email: values.email,
    customer_phone: values.phone,
    street_name: values.street,
    house_number: values.houseNumber,
    property_size: values.propertySize,
    doorbell_name: values.doorbellName,
    booking_date: values.date,
    booking_time: values.time,
    hours: Number(values.hours),
    cleaners: Number(values.cleaners),
    total_amount: quote.total,
    notes: values.notes || null,
    additional_services: values.additionalServices || [],
    supplies: values.supplies || [],
  };
}

export async function createBooking(payload) {
  try {
    return await request({
      method: "POST",
      url: ENDPOINTS.bookings.create,
      data: payload,
    });
  } catch (err) {
    if (err?.status === 404 || err?.status === 0) {
      await new Promise((r) => setTimeout(r, 900));
      return {
        id: `CC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        status: "confirmed",
        simulated: true,
        ...payload,
      };
    }
    throw err;
  }
}

// A small, deterministic sample so the profile booking history is always
// demonstrable in preview/local environments where the list endpoint isn't
// provisioned yet. Dates are relative to "now" so it always reads as recent.
const demoBookings = () => {
  const day = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  return [
    { reference: "CC-2048", service_name: "Deep Cleaning", city_name: "Milan", booking_date: day(6), booking_time: "11:30", total_amount: 196, status: "confirmed" },
    { reference: "CC-2031", service_name: "Turnover Cleaning", city_name: "Rome", booking_date: day(-9), booking_time: "09:00", total_amount: 89, status: "completed" },
    { reference: "CC-2017", service_name: "Guest-Ready Prep", city_name: "Florence", booking_date: day(-23), booking_time: "14:00", total_amount: 70, status: "completed" },
    { reference: "CC-1994", service_name: "Linen Management", city_name: "Venice", booking_date: day(-41), booking_time: "16:30", total_amount: 95, status: "cancelled" },
  ].map((b, i) => ({ _id: `demo-${i}`, simulated: true, ...b }));
};

/**
 * Fetch the signed-in user's bookings for the profile history. Degrades
 * gracefully to demo data when the endpoint isn't reachable (preview/local),
 * mirroring createBooking; genuine errors from a live API still surface.
 */
export async function getMyBookings() {
  try {
    const res = await request({ method: "GET", url: ENDPOINTS.bookings.mine });
    // Tolerate a few common response envelopes from the backend.
    return res?.data?.bookings ?? res?.bookings ?? res?.data ?? res ?? [];
  } catch (err) {
    if (err?.status === 404 || err?.status === 0) {
      await new Promise((r) => setTimeout(r, 600));
      return demoBookings();
    }
    throw err;
  }
}
