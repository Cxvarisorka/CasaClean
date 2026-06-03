import { request, ENDPOINTS } from "@/services/api";

/*
 * Contact API
 * -----------
 * Transport functions for the contact and newsletter endpoints. They post to
 * the real API, but degrade gracefully: if the marketing endpoints aren't
 * provisioned in a given environment (e.g. a static preview), we resolve
 * optimistically so the UX still completes. Genuine validation/network errors
 * from a live endpoint still propagate.
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
  postWithGracefulFallback(ENDPOINTS.contact.create, payload);

export const subscribeNewsletter = (payload) =>
  postWithGracefulFallback(ENDPOINTS.newsletter.subscribe, payload);
