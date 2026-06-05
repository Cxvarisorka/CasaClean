/*
 * API endpoints
 * -------------
 * Centralized, typo-proof map of every backend path. Functions are used for
 * parameterized routes so call sites never hand-build URL strings.
 */

export const ENDPOINTS = {
  auth: {
    signup: "/auth/signup",
    signin: "/auth/signin",
    logout: "/auth/logout",
    me: "/auth/me",
  },
  services: {
    list: "/services",
    detail: (slug) => `/services/${slug}`,
  },
  cities: {
    list: "/cities",
  },
  bookings: {
    create: "/bookings",
    mine: "/bookings/me",
    detail: (id) => `/bookings/${id}`,
    availability: "/bookings/availability",
  },
  leads: {
    create: "/leads",
  },
  contact: {
    create: "/contact",
  },
  newsletter: {
    subscribe: "/newsletter/subscribe",
  },
  blog: {
    list: "/blog",
    detail: (slug) => `/blog/${slug}`,
  },
};
