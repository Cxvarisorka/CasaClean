/*
 * HTTP client
 * -----------
 * A single, pre-configured axios instance shared across the app. Centralizing
 * base URL, credentials and interceptors here means feature code never touches
 * transport concerns — it just calls typed endpoint functions.
 */

import axios from "axios";
import { attachInterceptors } from "./interceptors";

// Exported so assets.js can derive the API origin from the same single source
// (uploaded files are served from /uploads, outside the /api/v1 prefix).
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const baseURL = API_BASE_URL;

/**
 * Budget for the few endpoints that await an external SMTP handshake inside the
 * request (currently the admin contact reply). The mailer's own worst case is
 * ~40s — 10s to connect, 10s for the greeting, 20s on the socket — so the
 * default 15s aborts the request while the server is still sending. That abort
 * yields no response, which normalizes to NETWORK_ERROR and reports a reachable
 * server as unreachable, hiding the actual mail failure. Stay above the mailer
 * so the server's own 502 (with its real reason) is what reaches the UI.
 */
export const MAIL_REQUEST_TIMEOUT = 45000;

export const apiClient = attachInterceptors(
  axios.create({
    baseURL,
    timeout: 15000,
    withCredentials: true, // send the http-only auth cookie set by the API
    headers: {
      "Content-Type": "application/json",
      // CSRF defense: the API rejects state-changing requests without this
      // header. Cross-site forms can't set custom headers, so its presence
      // proves the request came from our own code (paired with strict CORS).
      "X-Requested-With": "XMLHttpRequest",
    },
  })
);

/**
 * Thin helper that unwraps the API's `{ status, data }` envelope so callers
 * receive the payload directly. Returns the raw body when no envelope is used.
 */
export async function request(config) {
  const response = await apiClient.request(config);
  return response.data?.data ?? response.data;
}
