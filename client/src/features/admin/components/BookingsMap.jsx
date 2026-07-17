import { useEffect, useRef, useState } from "react";
import { MapPin, AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { ITALY_CENTER } from "@/data/cityGeo";
import { STATUS_COLORS } from "../constants";

/*
 * BookingsMap
 * -----------
 * Plots one marker per booking at the booking's EXACT street address. Bookings
 * only store a textual address (streetName + houseNumber + city), so each one is
 * geocoded client-side with the Google Geocoder; results are cached in
 * localStorage keyed by the full address string, which means each distinct
 * address is geocoded exactly once across sessions. When an address can't be
 * geocoded the marker falls back to the booking's city centre (flagged as
 * approximate in its card) rather than silently disappearing.
 *
 * Clicking a marker opens a booking card (InfoWindow) with the customer,
 * address, service, schedule, status and total. Markers are colour-coded by
 * booking status; the page renders a matching legend from STATUS_COLORS.
 *
 * Degrades gracefully: with no API key (or a load failure) it renders an inline
 * notice instead of a broken map — the page still lists the same bookings below.
 */

// Lightly de-saturated map styling so the status-coloured markers pop.
const MAP_STYLES = [
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

// Teardrop marker (inline SVG path) coloured by status so we don't depend on
// cloud-configured map ids.
const markerIcon = (status) => ({
  path: "M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z",
  fillColor: STATUS_COLORS[status] || STATUS_COLORS.confirmed,
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 2,
  scale: 1.1,
  anchor: { x: 12, y: 36 },
});

/* ------------------------------------------------------------ Geocode cache */

// address string → {lat,lng} | null (null = the geocoder found nothing, cached
// so we never re-ask for a known-bad address). Transient failures (quota,
// network) are NOT cached so they retry on the next visit.
const CACHE_KEY = "cc.bookingGeo.v1";

const readCache = () => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
  } catch {
    return {};
  }
};

const writeCache = (cache) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* storage full/unavailable — geocoding still works, just uncached */
  }
};

/* -------------------------------------------------------------- Card markup */

// Booking fields are end-user input rendered into InfoWindow HTML — escape them.
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const cardRow = (label, value) => `
  <div style="display:flex;justify-content:space-between;gap:12px;margin-top:5px;font-size:12px">
    <span style="color:#828da6">${esc(label)}</span>
    <span style="color:#0e1424;font-weight:600;text-align:right">${esc(value)}</span>
  </div>`;

const cardContent = (p, labels, formatCurrency) => {
  const color = STATUS_COLORS[p.status] || STATUS_COLORS.confirmed;
  return `
  <div style="min-width:220px;max-width:264px;font-family:inherit;padding:2px">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
      <div style="font-weight:700;font-size:15px;color:#0e1424">${esc(p.customerName)}</div>
      <span style="background:${color}1f;color:${color};border-radius:999px;padding:2px 9px;font-size:11px;font-weight:700;white-space:nowrap">${esc(p.statusLabel)}</span>
    </div>
    <div style="margin-top:4px;font-size:12px;color:#636c88">
      ${esc(p.addressLabel)}${p.approx ? ` <em style="color:#a36a14">· ${esc(labels.approx)}</em>` : ""}
    </div>
    <div style="margin-top:7px;border-top:1px solid #eceef4;padding-top:3px">
      ${cardRow(labels.service, p.serviceName)}
      ${cardRow(labels.schedule, p.schedule)}
      ${cardRow(labels.total, formatCurrency(p.totalAmount))}
    </div>
  </div>`;
};

function MapNotice({ icon: Icon, title, body }) {
  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-sand-50 p-8 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-ink-100 text-ink-400">
        <Icon className="size-6" />
      </span>
      <div>
        <p className="text-body-md font-semibold text-ink-900">{title}</p>
        <p className="mx-auto mt-1 max-w-md text-body-sm text-ink-500">{body}</p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Component */

/**
 * @param bookings Array of page-prepared points:
 *   { id, address, addressLabel, cityFallback: {lat,lng}|null, customerName,
 *     serviceName, schedule, totalAmount, status, statusLabel }
 *   `address` is the full geocodable string ("Via Roma 12, Milan, Italy").
 */
export function BookingsMap({ bookings, labels, formatCurrency }) {
  const status = useGoogleMaps();
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markers = useRef([]);
  const infoWindow = useRef(null);
  const [points, setPoints] = useState([]);
  const [locating, setLocating] = useState(false);

  // Resolve each booking's address to coordinates (cache-first, then Geocoder).
  useEffect(() => {
    if (status !== "ready") return;
    let active = true;

    (async () => {
      const g = window.google.maps;
      const geocoder = new g.Geocoder();
      const cache = readCache();
      const resolved = [];
      let needsGeocoder = false;

      for (const b of bookings) {
        let pos = cache[b.address];

        if (pos === undefined) {
          needsGeocoder = true;
          if (active) setLocating(true);
          try {
            const { results } = await geocoder.geocode({
              address: b.address,
              region: "it",
            });
            const loc = results?.[0]?.geometry?.location;
            pos = loc ? { lat: loc.lat(), lng: loc.lng() } : null;
            cache[b.address] = pos;
          } catch (err) {
            pos = null;
            // Only a definitive "no such address" is cached; quota/network
            // errors stay uncached so they retry on the next mount.
            if (String(err?.code || err?.message || "").includes("ZERO_RESULTS")) {
              cache[b.address] = null;
            }
          }
          if (!active) return;
        }

        if (pos) {
          resolved.push({ ...b, lat: pos.lat, lng: pos.lng, approx: false });
        } else if (b.cityFallback) {
          resolved.push({ ...b, ...b.cityFallback, approx: true });
        }
        // No geocode AND no known city centre → the booking simply isn't
        // plotted (it still shows in the list under the map).
      }

      if (needsGeocoder) writeCache(cache);
      if (active) {
        setPoints(resolved);
        setLocating(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [status, bookings]);

  // Draw the map + markers whenever the resolved points change.
  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    const g = window.google.maps;

    // Create the map + a single reused InfoWindow once.
    if (!mapObj.current) {
      mapObj.current = new g.Map(mapRef.current, {
        center: ITALY_CENTER,
        zoom: 5.5,
        styles: MAP_STYLES,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: "cooperative",
      });
      infoWindow.current = new g.InfoWindow();
    }

    // Clear previous markers, then plot the current set.
    markers.current.forEach((m) => m.setMap(null));
    markers.current = [];

    const bounds = new g.LatLngBounds();
    // Bookings at the same building would stack into one invisible pile — fan
    // duplicates out in a tiny circle (~15m) so every marker stays clickable.
    const seen = new Map();

    points.forEach((p) => {
      const key = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
      const dupes = seen.get(key) || 0;
      seen.set(key, dupes + 1);
      const angle = dupes * (Math.PI / 3);
      const position = {
        lat: p.lat + (dupes ? 0.00014 * Math.sin(angle) : 0),
        lng: p.lng + (dupes ? 0.00014 * Math.cos(angle) : 0),
      };

      const marker = new g.Marker({
        position,
        map: mapObj.current,
        title: `${p.customerName} — ${p.addressLabel}`,
        icon: markerIcon(p.status),
      });

      marker.addListener("click", () => {
        infoWindow.current.setContent(cardContent(p, labels, formatCurrency));
        infoWindow.current.open({ map: mapObj.current, anchor: marker });
      });

      markers.current.push(marker);
      bounds.extend(position);
    });

    // Frame all markers (guard against a single-point zoom blow-out).
    if (points.length > 1) {
      mapObj.current.fitBounds(bounds, 64);
    } else if (points.length === 1) {
      mapObj.current.setCenter({ lat: points[0].lat, lng: points[0].lng });
      mapObj.current.setZoom(14);
    }
  }, [status, points, labels, formatCurrency]);

  if (status === "no-key") {
    return <MapNotice icon={MapPin} title={labels.noKeyTitle} body={labels.noKeyBody} />;
  }

  if (status === "error") {
    return <MapNotice icon={AlertTriangle} title={labels.errorTitle} body={labels.errorBody} />;
  }

  return (
    <div className="relative h-[360px] overflow-hidden rounded-2xl border border-ink-100 sm:h-[460px]">
      {status === "loading" && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-sand-50">
          <Spinner size="lg" />
        </div>
      )}
      {status === "ready" && locating && (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 shadow-soft">
          <Spinner size="sm" />
          <span className="text-caption font-medium text-ink-600">{labels.locating}</span>
        </div>
      )}
      <div ref={mapRef} className="size-full" />
    </div>
  );
}

export default BookingsMap;
