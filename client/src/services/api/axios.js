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
