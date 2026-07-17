/*
 * API endpoints
 * -------------
 * Centralized, typo-proof map of backend paths that are consumed through this
 * module. Only the sections below are actually used — the booking, payment and
 * admin features keep their paths in their own api/ files
 * (features/<domain>/api/*Api.js). The old services/cities/bookings/leads/blog
 * sections pointed at routes that never existed on the API and were removed.
 *
 * NOTE: contact/newsletter have no server implementation yet; contactApi.js
 * calls them with a graceful fallback that simulates success while the API
 * returns 404 (see postWithGracefulFallback).
 */

export const ENDPOINTS = {
  auth: {
    signup: "/auth/signup",
    signin: "/auth/signin",
    logout: "/auth/logout",
    me: "/auth/me",
    forgotPassword: "/auth/forgot-password",
    resetPassword: (token) => `/auth/reset-password/${token}`,
    changePassword: "/auth/me/password",
    deleteMe: "/auth/me",
  },
  contact: {
    create: "/contact",
  },
  newsletter: {
    subscribe: "/newsletter/subscribe",
  },
};
