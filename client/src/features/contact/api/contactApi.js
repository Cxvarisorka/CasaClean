import { request, ENDPOINTS } from "@/services/api";

/*
 * Contact API
 * -----------
 * Transport functions for the contact and newsletter endpoints.
 *
 * `submitContact` posts to the real API (POST /contact) and lets every failure
 * propagate — a contact message that didn't reach the server must never be
 * reported as sent. Newsletter has no server implementation yet, so it keeps a
 * graceful fallback until POST /newsletter/subscribe exists.
 */

async function postWithGracefulFallback(url, payload) {
  try {
    return await request({ method: "POST", url, data: payload });
  } catch (err) {
    // 404/0 → endpoint not deployed in this environment; simulate acceptance.
    if (err?.status === 404 || err?.status === 0) {
      await new Promise((r) => setTimeout(r, 700));
      return { accepted: true, simulated: true };
    }
    throw err;
  }
}

export const submitContact = (payload) =>
  request({ method: "POST", url: ENDPOINTS.contact.create, data: payload });

export const subscribeNewsletter = (payload) =>
  postWithGracefulFallback(ENDPOINTS.newsletter.subscribe, payload);
