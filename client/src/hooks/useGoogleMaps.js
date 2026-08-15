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

const librariesReady = () =>
  Boolean(window.google?.maps?.Map && window.google?.maps?.Geocoder);

function loadGoogleMaps() {
  if (librariesReady()) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;
    // With `loading=async`, `onload` only means the bootstrap loader is ready —
    // the Map/Marker/etc. classes aren't on `google.maps` until we import the
    // library. Await it here so callers can safely use `new google.maps.Map(...)`.
    // "geocoding" is loaded alongside so the admin bookings map can resolve
    // street addresses to coordinates via `new google.maps.Geocoder()`.
    script.onload = () => {
      Promise.all([
        window.google.maps.importLibrary("maps"),
        window.google.maps.importLibrary("geocoding"),
      ])
        .then(() => resolve())
        .catch((err) => {
          loaderPromise = null;
          reject(err);
        });
    };
    script.onerror = () => {
      loaderPromise = null; // allow a retry on next mount
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(script);
  });

  return loaderPromise;
}

/** @returns {"no-key"|"loading"|"ready"|"error"} */
export function useGoogleMaps() {
  const [status, setStatus] = useState(() =>
    API_KEY ? (librariesReady() ? "ready" : "loading") : "no-key"
  );

  useEffect(() => {
    if (!API_KEY) return;
    let active = true;

    loadGoogleMaps()
      .then(() => active && setStatus("ready"))
      .catch(() => active && setStatus("error"));

    return () => {
      active = false;
    };
  }, []);

  return status;
}

export default useGoogleMaps;
