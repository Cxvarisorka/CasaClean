import { useSyncExternalStore } from "react";

/*
 * useMediaQuery
 * -------------
 * Subscribes to a CSS media query via useSyncExternalStore — the canonical way
 * to read from an external store (matchMedia) without effects or tearing. SSR
 * safe via the server snapshot.
 *
 * @param {string} query - e.g. "(min-width: 768px)"
 * @returns {boolean}
 */
export function useMediaQuery(query) {
  const subscribe = (callback) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
  };

  const getSnapshot = () => window.matchMedia(query).matches;
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Convenience wrappers mirroring the Tailwind breakpoint scale. */
export const useIsMobile = () => !useMediaQuery("(min-width: 768px)");
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)");
export const usePrefersReducedMotion = () =>
  useMediaQuery("(prefers-reduced-motion: reduce)");
