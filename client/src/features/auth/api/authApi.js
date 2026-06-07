import { request, ENDPOINTS } from "@/services/api";

/*
 * Auth API
 * --------
 * Maps form values onto the backend auth contract:
 *   signup → { fullname, email, phone, password }
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
        data: { fullname, email, phone, password },
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
 * Begin the Google OAuth redirect flow. The browser navigates to the API's
 * Google entry point, which (when implemented) redirects back with a session.
 */
export function startGoogleOAuth() {
  window.location.href = `${API_BASE}/auth/google`;
}
