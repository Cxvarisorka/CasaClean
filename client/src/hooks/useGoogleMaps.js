import { useEffect, useState } from "react";

/*
 * useGoogleMaps
 * -------------
 * Loads the Google Maps JS API exactly once for the whole app (a module-level
 * singleton promise), then reports a simple status to the caller. No npm
 * dependency — we inject the official script tag and resolve when it's ready.
 *
 * The API key is read from VITE_GOOGLE_MAPS_API_KEY. When it's absent we report
 * status "no-key" so the UI can show setup instructions instead of a broken map.
 */

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let loaderPromise = null;

// What "ready" means: `loading=async` only attaches the libraries that were
// asked for, so "the script tag ran" is not the same thing as "the API is
// usable". Deliberately the two classes a map CANNOT be drawn without — a
// missing `Marker` costs pins, a missing `Map` costs the whole feature, so
// gating readiness on the former would trade a working map for an error card.
const librariesReady = () =>
  Boolean(window.google?.maps?.Map && window.google?.maps?.Geocoder);

// "marker" carries `Marker`, which the bookings map and its clusterer both
// build; without importing it they'd construct `undefined`.
const LIBRARIES = ["maps", "marker", "geocoding"];

const SCRIPT_ID = "google-maps-js";

/**
 * Inject the bootstrap loader once. Re-uses an existing tag rather than adding
 * a second: the API refuses to be included twice on one page, and a cleared
 * `loaderPromise` (below) would otherwise append another on the next attempt.
 */
function injectScript() {
  const existing = document.getElementById(SCRIPT_ID);
  // A tag with no promise on it can only be one someone else added; assume it
  // has already run rather than racing a second copy into the page.
  if (existing) return existing.__ccLoaded || Promise.resolve();

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&v=weekly&loading=async`;
  script.async = true;
  script.defer = true;

  script.__ccLoaded = new Promise((resolve, reject) => {
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove(); // nothing usable was defined — let a retry re-add it
      reject(new Error("Failed to load Google Maps"));
    };
  });

  document.head.appendChild(script);
  return script.__ccLoaded;
}

function loadGoogleMaps() {
  if (librariesReady()) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = injectScript()
    // With `loading=async`, `onload` only means the bootstrap loader is ready —
    // the Map/Marker/etc. classes aren't on `google.maps` until we import the
    // libraries. `allSettled`, because one library failing to import says
    // nothing about the others, and the check below is the real verdict.
    .then(() =>
      Promise.allSettled(
        LIBRARIES.map((lib) => window.google.maps.importLibrary(lib))
      )
    )
    .then(() => {
      if (!librariesReady())
        throw new Error("Google Maps loaded without the expected libraries");
    })
    .catch((err) => {
      loaderPromise = null; // allow a retry rather than latching the failure
      throw err;
    });

  return loaderPromise;
}

// How long to keep waiting before calling it a failure. Without this a load
// that never settles leaves the caller on a spinner indefinitely.
const READY_TIMEOUT_MS = 15000;

/** @returns {"no-key"|"loading"|"ready"|"error"} */
export function useGoogleMaps() {
  const [status, setStatus] = useState(() =>
    API_KEY ? (librariesReady() ? "ready" : "loading") : "no-key"
  );

  useEffect(() => {
    if (!API_KEY || status !== "loading") return undefined;
    let active = true;

    loadGoogleMaps()
      .then(() => active && setStatus("ready"))
      .catch(() => {
        /* the poll below decides — see why */
      });

    /*
     * `librariesReady()` is the ground truth; the promise above is only the
     * fast path. That distinction is the whole fix for "the map is blank the
     * first time and fine when I come back": the FIRST visit's outcome used to
     * rest entirely on that one promise, so a single `importLibrary` rejecting
     * (or never settling) left the page mapless — while every LATER visit never
     * consulted the promise at all, found the classes already on `google.maps`
     * and worked. Polling what the API actually exposes gives a cold visit the
     * same verdict a warm one gets, whatever the promise did.
     */
    const startedAt = Date.now();
    const poll = setInterval(() => {
      if (librariesReady()) {
        clearInterval(poll);
        if (active) setStatus("ready");
      } else if (Date.now() - startedAt > READY_TIMEOUT_MS) {
        clearInterval(poll);
        if (active) setStatus("error");
      }
    }, 150);

    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [status]);

  return status;
}

export default useGoogleMaps;
