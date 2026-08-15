import { request, ENDPOINTS } from "@/services/api";

/*
 * Auth API
 * --------
 * Maps form values onto the backend auth contract:
 *   signup → { fullname, email, password, phone? }
 *   signin → { email, password }  (sets an http-only cookie server-side)
 * Like the rest of the app, these degrade gracefully when the API isn't
 * reachable (preview environments) so the flows are always demonstrable;
 * real validation/auth errors from a live server still surface to the user.
 */

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

async function withFallback(fn, simulated) {
  try {
    return await fn();
  } catch (err) {
    if (err?.status === 404 || err?.status === 0) {
      await new Promise((r) => setTimeout(r, 800));
      return { simulated: true, ...simulated };
    }
    throw err;
  }
}

export function signIn({ email, password, remember = false }) {
  return withFallback(
    () =>
      request({
        method: "POST",
        url: ENDPOINTS.auth.signin,
        // `remember` tells the server whether to set a persistent or a
        // session-only cookie (dropped on browser close when unchecked).
        data: { email, password, remember },
      }),
    { user: { email, fullname: email.split("@")[0] } }
  );
}

export function signUp({ fullname, email, phone, password }) {
  return withFallback(
    () =>
      request({
        method: "POST",
        url: ENDPOINTS.auth.signup,
        // Phone is optional at registration: send the key only when there is a
        // number, so a skipped field is an absent one rather than a blank.
        data: { fullname, email, password, ...(phone ? { phone } : {}) },
      }),
    { message: "User created" }
  );
}

export function signOut() {
  return request({ method: "POST", url: ENDPOINTS.auth.logout });
}

export function getMe() {
  return request({ method: "GET", url: ENDPOINTS.auth.me });
}

/**
 * Update the signed-in user's profile. Degrades gracefully when the endpoint
 * isn't provisioned yet (preview/local), echoing the patch back so the UI flow
 * stays demonstrable; real validation errors from a live server still surface.
 */
export function updateProfile(patch) {
  return withFallback(
    () => request({ method: "PATCH", url: ENDPOINTS.auth.me, data: patch }),
    { user: patch }
  );
}

/**
 * Update the signed-in user's billing/VAT profile.
 *
 * Deliberately NO graceful fallback: this decides whether the customer is
 * charged VAT, so simulating success would be misleading in exactly the way
 * that costs money. `vatStatus` is not sendable — verification is Stripe's
 * answer, and the server's strict schema rejects any attempt to set it.
 */
export function updateTaxProfile({ customerType, companyName, vatNumber }) {
  return request({
    method: "PATCH",
    url: ENDPOINTS.auth.taxProfile,
    data: { customerType, companyName, vatNumber },
  });
}

/**
 * Pull the VAT verification result from Stripe on demand.
 *
 * Verification is asynchronous and normally lands via webhook; this is the
 * button for a customer staring at a "pending" badge.
 */
export function refreshTaxStatus() {
  return request({ method: "POST", url: ENDPOINTS.auth.taxProfileRefresh });
}

/*
 * Password & account security operations.
 * Deliberately NO graceful fallback here — simulating success for a password
 * reset or an account deletion would be actively misleading; a real error
 * (including "API unreachable") must surface to the user.
 */

/** Request a password-reset email. The API replies generically either way. */
export function forgotPassword(email) {
  return request({
    method: "POST",
    url: ENDPOINTS.auth.forgotPassword,
    data: { email },
  });
}

/**
 * Consume a reset token and set a new password. On success the API signs the
 * user in (sets the session cookie), so callers should refresh() afterwards.
 */
export function resetPassword({ token, password }) {
  return request({
    method: "POST",
    url: ENDPOINTS.auth.resetPassword(token),
    data: { password },
  });
}

/**
 * Change the signed-in user's password — or set a first one.
 *
 * `currentPassword` is omitted only for an account that has none yet (created
 * through Google). The server decides which case applies from the stored hash,
 * so leaving it out can never skip the check on an account that has a password;
 * sending it for an account that has none is rejected. Either way the server
 * revokes every other session and re-issues this one's cookie.
 */
export function changePassword({ currentPassword, newPassword }) {
  return request({
    method: "PATCH",
    url: ENDPOINTS.auth.changePassword,
    data: currentPassword ? { currentPassword, newPassword } : { newPassword },
  });
}

/**
 * Delete the signed-in user's account. Local accounts confirm with their
 * password; Google accounts have none and send an empty body.
 */
export function deleteAccount(password) {
  return request({
    method: "DELETE",
    url: ENDPOINTS.auth.deleteMe,
    data: password ? { password } : {},
  });
}

/**
 * Begin the Google OAuth redirect flow. The browser navigates to the API's
 * Google entry point, which (when implemented) redirects back with a session.
 */
export function startGoogleOAuth() {
  window.location.href = `${API_BASE}/auth/google`;
}
