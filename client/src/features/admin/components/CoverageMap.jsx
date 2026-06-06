import { useEffect, useRef } from "react";
import { MapPin, AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { ITALY_CENTER, CITY_IMAGE_FALLBACK } from "@/data/cityGeo";

/*
 * CoverageMap
 * -----------
 * Plots a Google Map marker for every city that has completed turnovers. Hovering
 * a marker opens a styled InfoWindow with the city photo and its completion stats
 * (count, distinct services, revenue). All marker/InfoWindow labels arrive
 * pre-translated via `labels`, so the component stays locale-agnostic.
 *
 * Degrades gracefully: with no API key (or a load failure) it renders an inline
 * notice instead of a broken map — the page still lists the same data below.
 */

// Lightly de-saturated map styling so the brand-coloured markers pop.
const MAP_STYLES = [
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
];

// Brand-coloured teardrop marker (data-URI SVG) so we don't depend on map ids.
const markerIcon = () => ({
  path: "M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z",
  fillColor: "#1dae9f",
  fillOpacity: 1,
  strokeColor: "#ffffff",
  strokeWeight: 2,
  scale: 1.4,
  anchor: { x: 12, y: 36 },
  labelOrigin: { x: 12, y: 12 },
});

const infoContent = (city, labels, formatCurrency) => `
  <div style="width:240px;font-family:inherit">
    <img src="${city.image}" alt="${city.name}"
      onerror="this.onerror=null;this.src='${CITY_IMAGE_FALLBACK}'"
      style="width:100%;height:120px;object-fit:cover;border-radius:10px;display:block" />
    <div style="padding:10px 2px 2px">
      <div style="font-weight:700;font-size:15px;color:#0e1424">${city.name}</div>
      <div style="margin-top:6px;display:flex;gap:14px;font-size:12px;color:#636c88">
        <span><strong style="color:#1dae9f;font-size:14px">${city.completed}</strong> ${labels.completed}</span>
        <span><strong style="color:#0e1424;font-size:14px">${formatCurrency(city.revenue)}</strong> ${labels.revenue}</span>
      </div>
      <div style="margin-top:8px;font-size:11px;color:#828da6;text-transform:uppercase;letter-spacing:.04em">${labels.services}</div>
      <div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px">
        ${city.services
          .map(
            (s) =>
              `<span style="background:#e7f7f4;color:#134a47;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:600">${s}</span>`
          )
          .join("")}
      </div>
    </div>
  </div>`;

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

export function CoverageMap({ cities, labels, formatCurrency }) {
  const status = useGoogleMaps();
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markers = useRef([]);
  const infoWindow = useRef(null);

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
    cities.forEach((city) => {
      const position = { lat: city.lat, lng: city.lng };
      const marker = new g.Marker({
        position,
        map: mapObj.current,
        title: city.name,
        icon: markerIcon(),
        label: {
          text: String(city.completed),
          color: "#ffffff",
          fontSize: "11px",
          fontWeight: "700",
        },
      });

      marker.addListener("mouseover", () => {
        infoWindow.current.setContent(infoContent(city, labels, formatCurrency));
        infoWindow.current.open({ map: mapObj.current, anchor: marker });
      });
      marker.addListener("mouseout", () => infoWindow.current.close());

      markers.current.push(marker);
      bounds.extend(position);
    });

    // Frame all markers (guard against a single-point zoom blow-out).
    if (cities.length > 1) {
      mapObj.current.fitBounds(bounds, 64);
    } else if (cities.length === 1) {
      mapObj.current.setCenter({ lat: cities[0].lat, lng: cities[0].lng });
      mapObj.current.setZoom(8);
    }
  }, [status, cities, labels, formatCurrency]);

  if (status === "no-key") {
    return (
      <MapNotice
        icon={MapPin}
        title={labels.noKeyTitle}
        body={labels.noKeyBody}
      />
    );
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
      <div ref={mapRef} className="size-full" />
    </div>
  );
}

export default CoverageMap;
