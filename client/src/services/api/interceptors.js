/*
 * Axios interceptors
 * ------------------
 * Cross-cutting request/response behavior kept out of the client definition
 * so it can be unit-tested and reasoned about in isolation.
 */

/** Normalizes any axios/network error into a consistent shape for the UI. */
export function normalizeError(error) {
  // Server responded with a non-2xx status.
  if (error.response) {
    const { data, status } = error.response;
    return {
      status,
      message:
        data?.message || data?.error || "Something went wrong. Please try again.",
      code: data?.code || "REQUEST_FAILED",
      fields: data?.fields || null,
    };
  }

  // We gave up waiting, which is not the same thing as an unreachable server:
  // the request may well have arrived and still be running. Saying "check your
  // connection" here sends the user hunting for a fault on their end, and for a
  // non-idempotent call ("send this email") it also implies nothing happened —
  // which we do not know. Report the uncertainty instead of guessing.
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return {
      status: 0,
      message:
        "The server took too long to respond, so we stopped waiting. The request may still have gone through — check before retrying.",
      code: "TIMEOUT",
      fields: null,
    };
  }

  // Request made but no response at all (network down, CORS, DNS).
  if (error.request) {
    return {
      status: 0,
      message: "We couldn't reach the server. Check your connection and retry.",
      code: "NETWORK_ERROR",
      fields: null,
    };
  }

  // Something failed while setting up the request.
  return {
    status: -1,
    message: error.message || "An unexpected error occurred.",
    code: "CLIENT_ERROR",
    fields: null,
  };
}

/** Attaches request/response interceptors to an axios instance. */
export function attachInterceptors(client) {
  client.interceptors.request.use(
    (config) => {
      // Hook point for correlation ids / auth headers if needed later.
      config.metadata = { startedAt: Date.now() };

      // A FormData payload (the service cover-image upload) must go out as
      // multipart/form-data with a boundary only the browser can generate.
      // The instance sets `Content-Type: application/json` as a default, and
      // axios 1.x takes that literally: transformRequest sees a JSON content
      // type on a FormData body and serialises it with formDataToJSON, so the
      // request arrives as JSON with every field flattened to a string and the
      // file dropped — which the API's strict schema rejects as a validation
      // error. Clearing the header lets axios/the browser negotiate multipart.
      if (typeof FormData !== "undefined" && config.data instanceof FormData) {
        if (typeof config.headers?.delete === "function") {
          config.headers.delete("Content-Type");
        } else if (config.headers) {
          delete config.headers["Content-Type"];
        }
      }

      return config;
    },
    (error) => Promise.reject(normalizeError(error))
  );

  client.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(normalizeError(error))
  );

  return client;
}
