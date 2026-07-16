/*
 * Route paths
 * -----------
 * The canonical source of truth for every URL in the app. Components and the
 * router both import from here so a path is never hardcoded twice.
 */

export const ROUTES = {
  home: "/",
  services: "/services",
  serviceDetail: (slug = ":slug") => `/services/${slug}`,
  pricing: "/pricing",
  about: "/about",
  contact: "/contact",
  faq: "/faq",
  careers: "/careers",
  booking: "/booking",
  signin: "/signin",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  resetPassword: (token = ":token") => `/reset-password/${token}`,
  profile: "/profile",
  blog: "/blog",
  blogPost: (slug = ":slug") => `/blog/${slug}`,
  privacy: "/privacy",
  terms: "/terms",
  admin: {
    root: "/admin",
    login: "/admin/login",
    dashboard: "/admin",
    bookings: "/admin/bookings",
    calendar: "/admin/calendar",
    services: "/admin/services",
    specialRequests: "/admin/special-requests",
    cleaningTools: "/admin/cleaning-tools",
    cities: "/admin/cities",
    coverage: "/admin/coverage",
    users: "/admin/users",
    workers: "/admin/workers",
    quality: "/admin/quality",
  },
  notFound: "*",
};
