import { useMemo } from "react";
import { Map as MapIcon, MapPin, CalendarCheck, Euro } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  PageHeader,
  StatCard,
  useAdminData,
  BOOKING_STATUS_META,
  STATUS_COLORS,
} from "@/features/admin";
import { BookingsMap } from "@/features/admin/components/BookingsMap";
import { geoForCity } from "@/data/cityGeo";
import { useTranslation } from "@/i18n";

/*
 * Admin · Bookings map
 * --------------------
 * A geographic view of every booking at its EXACT address. Bookings store only
 * a textual address (street + house number + city id), so each point is built
 * here — city/service ids resolved to names from the loaded catalogues — and
 * the map component geocodes the address string to real coordinates (cached).
 * Clicking a marker opens the booking's card; the list below shows the same
 * bookings and doubles as the fallback when the map can't render (no API key).
 */

const eur = (n) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

export default function CoverageMapPage() {
  const { bookings, cities: cityList, services } = useAdminData();
  const { t } = useTranslation();

  // Bookings store only the city/service ids, so resolve real names from the
  // loaded catalogues. The city name also feeds the geocoded address string —
  // without it the geocoder would only see the street and could match anywhere.
  const cityNameById = useMemo(
    () => Object.fromEntries(cityList.map((c) => [String(c._id), c.name])),
    [cityList]
  );
  const serviceNameById = useMemo(
    () => Object.fromEntries(services.map((s) => [String(s._id), s.name])),
    [services]
  );

  // One map point per booking: the geocodable address, display fields for the
  // marker card, and the city centre as a fallback position when the exact
  // address can't be geocoded.
  const points = useMemo(
    () =>
      bookings.map((b) => {
        const cityName = cityNameById[String(b.city_id)] || "";
        const street = [b.street_name, b.house_number].filter(Boolean).join(" ");
        const geo = geoForCity(cityName);
        const meta = BOOKING_STATUS_META[b.status];
        // No hard-coded country in the geocode query: the city name plus the
        // geocoder's region bias is enough for Italian addresses, and a fixed
        // ", Italy" suffix would break bookings made for cities elsewhere.
        const address = [street, cityName].filter(Boolean).join(", ");
        return {
          id: b._id,
          address,
          addressLabel: address,
          cityName,
          cityFallback: geo ? { lat: geo.lat, lng: geo.lng } : null,
          customerName: b.customer_name,
          serviceName: serviceNameById[String(b.service_id)] || b.service_name,
          schedule: `${b.booking_date} · ${b.booking_time}`,
          totalAmount: Number(b.total_amount) || 0,
          status: b.status,
          statusLabel: meta ? t(meta.labelKey) : b.status,
        };
      }),
    [bookings, cityNameById, serviceNameById, t]
  );

  const totals = useMemo(
    () => ({
      bookings: points.length,
      cities: new Set(points.map((p) => p.cityName).filter(Boolean)).size,
      revenue: points
        .filter((p) => p.status !== "cancelled")
        .reduce((s, p) => s + p.totalAmount, 0),
    }),
    [points]
  );

  // Memoised: this object is a dependency of the map's marker-drawing effect,
  // so a fresh identity every render would redraw all markers needlessly.
  const mapLabels = useMemo(
    () => ({
      locating: t("admin.coverage.locating"),
      approx: t("admin.coverage.approx"),
      service: t("admin.bookings.detail.service"),
      schedule: t("admin.bookings.detail.dateTime"),
      total: t("admin.bookings.col.total"),
      noKeyTitle: t("admin.coverage.noKeyTitle"),
      noKeyBody: t("admin.coverage.noKeyBody"),
      errorTitle: t("admin.coverage.errorTitle"),
      errorBody: t("admin.coverage.errorBody"),
    }),
    [t]
  );

  return (
    <div className="space-y-8">
      <PageHeader
        icon={MapIcon}
        title={t("admin.coverage.title")}
        description={t("admin.coverage.description")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={CalendarCheck}
          label={t("admin.coverage.statBookings")}
          value={totals.bookings}
          accent="brand"
        />
        <StatCard
          icon={MapPin}
          label={t("admin.coverage.statCities")}
          value={totals.cities}
          accent="success"
        />
        <StatCard
          icon={Euro}
          label={t("admin.coverage.statRevenue")}
          value={eur(totals.revenue)}
          accent="accent"
        />
      </div>

      <Card className="p-2 sm:p-3">
        <BookingsMap bookings={points} labels={mapLabels} formatCurrency={eur} />
        {/* Status legend — marker colours map 1:1 to booking statuses. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-2 py-3">
          {Object.entries(BOOKING_STATUS_META).map(([status, meta]) => (
            <span key={status} className="flex items-center gap-1.5 text-caption text-ink-500">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[status] }}
              />
              {t(meta.labelKey)}
            </span>
          ))}
        </div>
      </Card>

      {/* Per-booking roll-up — also the graceful fallback when the map can't render. */}
      <Card className="p-6">
        <h2 className="text-heading-sm text-ink-900">{t("admin.coverage.listTitle")}</h2>
        {points.length === 0 ? (
          <p className="mt-4 text-body-sm text-ink-500">{t("admin.coverage.empty")}</p>
        ) : (
          <ul className="mt-5 divide-y divide-ink-100">
            {points.map((p) => (
              <li key={p.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-400">
                  <MapPin className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink-900">{p.customerName}</span>
                    <Badge
                      variant={BOOKING_STATUS_META[p.status]?.variant ?? "neutral"}
                      size="sm"
                    >
                      {p.statusLabel}
                    </Badge>
                  </p>
                  <p className="mt-0.5 truncate text-body-sm text-ink-500">
                    {p.addressLabel} · {p.serviceName}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-body-sm font-bold text-ink-900">{eur(p.totalAmount)}</p>
                  <p className="text-caption text-ink-400">{p.schedule}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
