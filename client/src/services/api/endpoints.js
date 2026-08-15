/*
 * API endpoints
 * -------------
 * Centralized, typo-proof map of backend paths that are consumed through this
 * module. Only the sections below are actually used — the booking, payment and
 * admin features keep their paths in their own api/ files
 * (features/<domain>/api/*Api.js). The old services/cities/bookings/leads/blog
 * sections pointed at routes that never existed on the API and were removed.
 *
 * NOTE: contact is live (POST /api/v1/contact stores the message and notifies
 * the team). Newsletter is NOT implemented server-side yet — contactApi.js still
 * calls it through a graceful fallback that simulates success while the API
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
    // Billing/VAT profile: individual vs business, and the VAT number Stripe
    // verifies against VIES.
    taxProfile: "/auth/me/tax-profile",
    taxProfileRefresh: "/auth/me/tax-profile/refresh",
    deleteMe: "/auth/me",
  },
  contact: {
    create: "/contact",
  },
  newsletter: {
    subscribe: "/newsletter/subscribe",
  },
};
