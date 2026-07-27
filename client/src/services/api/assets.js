/*
 * Asset URLs
 * ----------
 * Files uploaded through the admin panel are stored by the API on its own disk
 * and referenced by a *relative* path (e.g. "/uploads/services/ab12….jpg"), so
 * the record stays valid if the API moves host or port. The SPA runs on a
 * different origin than the API in every environment, so those paths have to be
 * resolved against the API origin before they can go into an <img src>.
 *
 * Values that are already renderable — hosted URLs, legacy inline data URLs,
 * object URLs for a not-yet-uploaded file, bundled assets — are passed through
 * untouched.
 */

import { API_BASE_URL } from "./axios";

// The API's scheme://host:port, derived from the configured base URL, e.g.
// "http://localhost:8000/api/v1" -> "http://localhost:8000".
const API_ORIGIN = new URL(API_BASE_URL, window.location.origin).origin;

// Anything with its own scheme (or a bundled /assets/… path Vite emitted) is
// already resolvable as-is.
const ABSOLUTE = /^(https?:|data:|blob:|\/\/)/i;

export function assetUrl(path) {
  if (!path || typeof path !== "string") return "";
  if (ABSOLUTE.test(path)) return path;
  // Only server-hosted upload paths are rewritten; other relative strings are
  // app-bundled assets and must stay relative to the SPA.
  if (!path.startsWith("/uploads/")) return path;
  return `${API_ORIGIN}${path}`;
}

export default assetUrl;
