/*
 * Admin API
 * ---------
 * The single bridge between the admin panel and the real backend. Every admin
 * collection (cities, services, special requests, bookings) is read from and
 * written to MongoDB through these functions — there is no local/seed data.
 *
 * The backend models use camelCase (workingHourStarts, pricePerHour, …) while
 * the admin UI was built around snake_case fields. Rather than rewrite every
 * page, the mapping lives here: `fromApi` adapts a DB document to the shape the
 * pages render, and the `create`/`update` builders translate the form values
 * back into the exact payload each endpoint accepts (the server validates with
 * strict Zod schemas, so we must send only the allowed keys).
 *
 * Endpoints are the backend's singular routes:
 *   /city  /service  /special-request  /booking
 */

import { request } from "@/services/api";

// Pull a big page so the panel shows the whole catalogue in one go (the lists
// are small; pagination on the admin side isn't needed yet).
const LIST_QS = "?limit=100";

// Keep an object to only the keys whose value is defined — used so a partial
// edit (e.g. just toggling `enabled`) never sends `undefined` into a strict
// schema, which would be rejected as an unknown/invalid field.
const definedOnly = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

/* ------------------------------------------------------------------ Cities */

const cityFromApi = (c) => ({
  _id: c._id,
  name: c.name,
  working_hours_start: c.workingHourStarts,
  working_hours_end: c.workingHourEnds,
  enabled: c.enabled,
  createdAt: c.createdAt,
});

export const cityApi = {
  async list() {
    const data = await request({ method: "GET", url: `/city${LIST_QS}` });
    return (data.cities ?? []).map(cityFromApi);
  },
  async create(v) {
    // addCitySchema is strict: ONLY these three keys are allowed on create.
    const data = await request({
      method: "POST",
      url: "/city",
      data: {
        name: v.name,
        workingHourStarts: v.working_hours_start,
        workingHourEnds: v.working_hours_end,
      },
    });
    return cityFromApi(data.city);
  },
  async update(id, patch) {
    // editCitySchema allows name / workingHourStarts / workingHourEnds / enabled.
    const data = await request({
      method: "PATCH",
      url: `/city/${id}`,
      data: definedOnly({
        name: patch.name,
        workingHourStarts: patch.working_hours_start,
        workingHourEnds: patch.working_hours_end,
        enabled: patch.enabled,
      }),
    });
    return cityFromApi(data.city);
  },
  remove: (id) => request({ method: "DELETE", url: `/city/${id}` }),
};

/* ---------------------------------------------------------------- Services */

const serviceFromApi = (s) => ({
  _id: s._id,
  name: s.name,
  subtitle: s.subtitle ?? "",
  description: s.description,
  image: s.image ?? "",
  includes: Array.isArray(s.includes) ? s.includes : [],
  price_per_hour: s.pricePerHour,
  all_cities: Boolean(s.allCities),
  // `cities` may arrive populated (objects) or as raw ids depending on the
  // endpoint — normalise to an array of id strings for the multiselect.
  cities: (s.cities ?? []).map((c) => (c && c._id ? c._id : c)),
  // Special-request add-ons enabled for this service (same normalisation).
  all_special_requests: Boolean(s.allSpecialRequests),
  special_requests: (s.specialRequests ?? []).map((r) =>
    r && r._id ? r._id : r
  ),
  enabled: s.enabled,
  createdAt: s.createdAt,
});

export const serviceApi = {
  async list() {
    const data = await request({ method: "GET", url: `/service${LIST_QS}` });
    return (data.services ?? []).map(serviceFromApi);
  },
  async create(v) {
    const allCities = Boolean(v.all_cities);
    const allSpecialRequests = Boolean(v.all_special_requests);
    // createServiceSchema is strict. `enabled` is NOT accepted here (defaults to
    // true server-side); the special-request keys are optional.
    const data = await request({
      method: "POST",
      url: "/service",
      data: {
        name: v.name,
        subtitle: v.subtitle || "",
        description: v.description,
        image: v.image || "",
        includes: Array.isArray(v.includes) ? v.includes.filter(Boolean) : [],
        pricePerHour: Number(v.price_per_hour),
        allCities,
        cities: allCities ? [] : (v.cities ?? []),
        allSpecialRequests,
        specialRequests: allSpecialRequests ? [] : (v.special_requests ?? []),
      },
    });
    return serviceFromApi(data.service);
  },
  async update(id, patch) {
    // editServiceSchema is strict: name / description / pricePerHour /
    // allCities / cities / allSpecialRequests / specialRequests / enabled.
    const body = definedOnly({
      name: patch.name,
      subtitle: patch.subtitle,
      description: patch.description,
      image: patch.image,
      includes: Array.isArray(patch.includes)
        ? patch.includes.filter(Boolean)
        : undefined,
      pricePerHour:
        patch.price_per_hour !== undefined
          ? Number(patch.price_per_hour)
          : undefined,
      allCities: patch.all_cities,
      cities: patch.cities,
      allSpecialRequests: patch.all_special_requests,
      specialRequests: patch.special_requests,
      // Soft on/off switch — a disabled service is hidden from the public site.
      enabled: patch.enabled,
    });
    const data = await request({
      method: "PATCH",
      url: `/service/${id}`,
      data: body,
    });
    return serviceFromApi(data.service);
  },
  remove: (id) => request({ method: "DELETE", url: `/service/${id}` }),
};

/* -------------------------------------------------------- Special requests */

const specialRequestFromApi = (s) => ({
  _id: s._id,
  name: s.name,
  description: s.description ?? "",
  price: s.price,
  enabled: s.enabled,
  createdAt: s.createdAt,
});

export const specialRequestApi = {
  async list() {
    const data = await request({
      method: "GET",
      url: `/special-request${LIST_QS}`,
    });
    return (data.specialRequests ?? []).map(specialRequestFromApi);
  },
  async create(v) {
    const data = await request({
      method: "POST",
      url: "/special-request",
      data: { name: v.name, description: v.description, price: Number(v.price) },
    });
    return specialRequestFromApi(data.specialRequest);
  },
  async update(id, patch) {
    const data = await request({
      method: "PATCH",
      url: `/special-request/${id}`,
      data: definedOnly({
        name: patch.name,
        description: patch.description,
        price: patch.price !== undefined ? Number(patch.price) : undefined,
        enabled: patch.enabled,
      }),
    });
    return specialRequestFromApi(data.specialRequest);
  },
  remove: (id) => request({ method: "DELETE", url: `/special-request/${id}` }),
};

/* ------------------------------------------------------------------ Workers */

const workerFromApi = (w) => ({
  _id: w._id,
  fullname: w.fullname,
  email: w.email ?? "",
  phone: w.phone ?? "",
  enabled: w.enabled,
  createdAt: w.createdAt,
});

export const workerApi = {
  async list() {
    const data = await request({ method: "GET", url: `/worker${LIST_QS}` });
    return (data.workers ?? []).map(workerFromApi);
  },
  async create(v) {
    // addWorkerSchema is strict: fullname required, email/phone optional. Blank
    // contact fields are omitted so the strict schema doesn't see empty noise.
    const data = await request({
      method: "POST",
      url: "/worker",
      data: definedOnly({
        fullname: v.fullname,
        email: v.email ? v.email : undefined,
        phone: v.phone ? v.phone : undefined,
      }),
    });
    return workerFromApi(data.worker);
  },
  async update(id, patch) {
    // editWorkerSchema allows fullname / email / phone / enabled. Email and phone
    // are sent even when blanked (empty string) so the admin can clear them.
    const data = await request({
      method: "PATCH",
      url: `/worker/${id}`,
      data: definedOnly({
        fullname: patch.fullname,
        email: patch.email,
        phone: patch.phone,
        enabled: patch.enabled,
      }),
    });
    return workerFromApi(data.worker);
  },
  remove: (id) => request({ method: "DELETE", url: `/worker/${id}` }),
};

/* ---------------------------------------------------------------- Bookings */

// serviceId/cityId arrive either as a raw id string OR as a populated
// `{ _id, name }` object (the booking read endpoints populate them). Normalise
// to a plain id string + an optional name so the page can resolve/display both.
const refId = (v) => (v && typeof v === "object" ? v._id : v);
const refName = (v) => (v && typeof v === "object" ? v.name : null);

const bookingFromApi = (b) => ({
  _id: b._id,
  // Short human-readable reference derived from the id (bookings have no
  // dedicated reference field server-side).
  reference: `CC-${String(b._id).slice(-6).toUpperCase()}`,
  customer_name: b.customerName,
  customer_email: b.customerEmail,
  customer_phone: b.customerPhone,
  // The page resolves names from the loaded catalogues by id; the populated name
  // (when present) is the fallback, then the id form.
  service_id: refId(b.serviceId),
  city_id: refId(b.cityId),
  service_name:
    refName(b.serviceId) || (b.serviceId != null ? `Service #${refId(b.serviceId)}` : "—"),
  city_name:
    refName(b.cityId) || (b.cityId != null ? `City #${refId(b.cityId)}` : "—"),
  street_name: b.streetName,
  house_number: b.houseNumber,
  property_size: b.propertySize,
  doorbell_name: b.doorbellName,
  booking_date: b.bookingDate,
  booking_time: b.bookingTime,
  hours: b.hours,
  cleaners: b.cleaners,
  total_amount: b.totalAmount,
  status: b.status,
  // Payment posture (read-only in the admin UI): how it was paid and where the
  // money currently sits. 'manual' = offline/cash booking (no Stripe).
  payment_method: b.paymentMethod ?? "card",
  payment_status: b.paymentStatus ?? "unpaid",
  refund_id: b.refundId ?? null,
  notes: b.notes ?? "",
  supplies: b.supplies ?? [],
  special_requests: b.specialRequests ?? [],
  // Assigned staff arrive populated as { _id, fullname } objects (or raw ids).
  // Keep the ids for the assignment multiselect and the names for display.
  workers: (b.workers ?? []).map((w) => (w && w._id ? w._id : w)),
  worker_names: (b.workers ?? []).map((w) =>
    w && w.fullname ? w.fullname : `#${w}`
  ),
  createdAt: b.createdAt,
});

export const bookingApi = {
  async list() {
    const data = await request({ method: "GET", url: `/booking${LIST_QS}` });
    return (data.bookings ?? []).map(bookingFromApi);
  },
  async create(v) {
    // Admin-entered booking, on a customer's behalf. The admin may either link a
    // registered account (userId) and/or type the contact details directly; the
    // server fills any omitted contact field from the linked account. serviceId/
    // cityId must be real, enabled Service/City ObjectIds (server-validated).
    // totalAmount is NOT sent — the server computes it from the service price,
    // hours and add-ons.
    const data = await request({
      method: "POST",
      url: "/booking",
      data: definedOnly({
        // Empty string from the optional account picker → omit so the strict
        // schema doesn't reject it (objectId validation would fail on "").
        userId: v.customer_user_id ? String(v.customer_user_id).trim() : undefined,
        customerName: v.customer_name || undefined,
        customerEmail: v.customer_email || undefined,
        customerPhone: v.customer_phone || undefined,
        serviceId: String(v.service_id).trim(),
        cityId: String(v.city_id).trim(),
        streetName: v.street_name,
        houseNumber: v.house_number,
        propertySize: v.property_size,
        doorbellName: v.doorbell_name,
        bookingDate: v.booking_date,
        bookingTime: v.booking_time,
        hours: Number(v.hours),
        cleaners: Number(v.cleaners),
        notes: v.notes || null,
        supplies: v.supplies || [],
        workers: v.workers || [],
      }),
    });
    return bookingFromApi(data.booking);
  },
  async update(id, patch) {
    // editBooking whitelists these fields server-side. totalAmount is omitted —
    // the server recomputes it whenever hours or add-ons change.
    const data = await request({
      method: "PATCH",
      url: `/booking/${id}`,
      data: definedOnly({
        status: patch.status,
        bookingDate: patch.booking_date,
        bookingTime: patch.booking_time,
        hours: patch.hours !== undefined ? Number(patch.hours) : undefined,
        cleaners:
          patch.cleaners !== undefined ? Number(patch.cleaners) : undefined,
        streetName: patch.street_name,
        houseNumber: patch.house_number,
        propertySize: patch.property_size,
        doorbellName: patch.doorbell_name,
        customerPhone: patch.customer_phone,
        notes: patch.notes,
        supplies: patch.supplies,
        workers: patch.workers,
      }),
    });
    return bookingFromApi(data.booking);
  },
  remove: (id) => request({ method: "DELETE", url: `/booking/${id}` }),
};

/* ------------------------------------------------------------------- Users */

const userFromApi = (u) => ({
  _id: u._id,
  fullname: u.fullname,
  email: u.email,
  phone: u.phone ?? "",
  role: u.role,
  isVerified: Boolean(u.isVerified),
  provider: u.provider,
  avatar: u.avatar,
  createdAt: u.createdAt,
});

export const userApi = {
  async list() {
    const data = await request({ method: "GET", url: `/auth/users${LIST_QS}` });
    return (data.users ?? []).map(userFromApi);
  },
  async create(v) {
    const data = await request({
      method: "POST",
      url: "/auth/users",
      data: {
        fullname: v.fullname,
        email: v.email,
        phone: v.phone,
        password: v.password,
        role: v.role || "user",
        isVerified: Boolean(v.isVerified),
      },
    });
    return userFromApi(data.user);
  },
  async update(id, patch) {
    // A blank password is omitted so editing other fields never wipes it.
    const data = await request({
      method: "PATCH",
      url: `/auth/users/${id}`,
      data: definedOnly({
        fullname: patch.fullname,
        email: patch.email,
        phone: patch.phone,
        password: patch.password ? patch.password : undefined,
        role: patch.role,
        isVerified: patch.isVerified,
      }),
    });
    return userFromApi(data.user);
  },
  remove: (id) => request({ method: "DELETE", url: `/auth/users/${id}` }),
};

/* ----------------------------------------------------------------- Reviews */

// Reviews are written by customers (and only after a completed booking — that
// gate is enforced server-side). The admin panel is read-only here apart from
// moderation: it lists scores + comments and can delete an inappropriate
// review. `user`, `service_id` and the rated `booking` arrive populated from the
// admin feed (GET /review), so reuse the booking ref helpers to normalise them.
const reviewFromApi = (r) => {
  // The rated booking is populated so the admin can see exactly which booking a
  // review is for; it may be null if the booking was later deleted.
  const b = r.booking && typeof r.booking === "object" ? r.booking : null;
  return {
    _id: r._id,
    rating: Number(r.rating) || 0,
    comment: r.review_text ?? "",
    service_id: refId(r.service_id),
    service_name: refName(r.service_id) || "—",
    // The author is populated; fall back to the booking's contact, then a dash.
    customer_name: (r.user && r.user.fullname) || b?.customerName || "—",
    customer_email: (r.user && r.user.email) || b?.customerEmail || "",
    // Rated booking — a short reference (same scheme as the Bookings page) plus
    // the details the admin needs to identify it.
    booking_id: refId(r.booking),
    booking_reference: r.booking
      ? `CC-${String(refId(r.booking)).slice(-6).toUpperCase()}`
      : "—",
    booking_date: b?.bookingDate || "",
    booking_time: b?.bookingTime || "",
    booking_status: b?.status || "",
    booking_total: b?.totalAmount,
    booking_hours: b?.hours,
    booking_cleaners: b?.cleaners,
    booking_property_size: b?.propertySize || "",
    booking_doorbell: b?.doorbellName || "",
    booking_city: refName(b?.cityId) || "",
    booking_address: b
      ? [b.streetName, b.houseNumber].filter(Boolean).join(" ")
      : "",
    createdAt: r.createdAt,
  };
};

export const reviewApi = {
  async list() {
    const data = await request({ method: "GET", url: `/review${LIST_QS}` });
    return (data.reviews ?? []).map(reviewFromApi);
  },
  remove: (id) => request({ method: "DELETE", url: `/review/${id}` }),
};

/* ----------------------------------------------------------------- Registry */

// Collection name (as used by the admin pages) → its API module. The data
// context dispatches generic create/update/remove calls through this map.
export const RESOURCES = {
  cities: cityApi,
  services: serviceApi,
  specialRequests: specialRequestApi,
  bookings: bookingApi,
  users: userApi,
  workers: workerApi,
  reviews: reviewApi,
};
