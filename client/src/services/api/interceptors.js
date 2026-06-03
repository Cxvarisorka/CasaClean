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

  // Request made but no response (network/CORS/timeout).
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
