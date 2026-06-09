import { useMemo } from "react";
import { Map as MapIcon, MapPin, CheckCircle2, Euro } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Image } from "@/components/ui/Image";
import { Badge } from "@/components/ui/Badge";
import { PageHeader, StatCard, useAdminData } from "@/features/admin";
import { CoverageMap } from "@/features/admin/components/CoverageMap";
import { geoForCity } from "@/data/cityGeo";
import { useTranslation } from "@/i18n";

/*
 * Admin · Coverage map
 * --------------------
 * A geographic view of where CasaClean has actually delivered. We roll up every
 * COMPLETED booking by city, join it with static geo/imagery, and plot a marker
 * per city — hovering reveals the city photo and its completion stats. The same
 * roll-up powers the summary tiles and the list below (which also stands in when
 * the map can't render, e.g. no API key configured).
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
  // loaded catalogues. The geo lookup is keyed by the city's English name, so
  // without this every completed booking falls through and the map stays empty.
  const cityNameById = useMemo(
    () => Object.fromEntries(cityList.map((c) => [String(c._id), c.name])),
    [cityList]
  );
  const serviceNameById = useMemo(
    () => Object.fromEntries(services.map((s) => [String(s._id), s.name])),
    [services]
  );

  // Roll up completed bookings → one entry per city that has geo data.
  const cities = useMemo(() => {
    const byCity = new Map();

    for (const b of bookings) {
      if (b.status !== "completed") continue;
      const cityName = cityNameById[String(b.city_id)] || b.city_name;
      const geo = geoForCity(cityName);
      if (!geo) continue; // city without coordinates simply isn't plotted

      const entry = byCity.get(cityName) || {
        name: cityName,
        ...geo,
        completed: 0,
        revenue: 0,
        services: new Set(),
      };
      entry.completed += 1;
      entry.revenue += Number(b.total_amount) || 0;
      entry.services.add(serviceNameById[String(b.service_id)] || b.service_name);
      byCity.set(cityName, entry);
    }

    return [...byCity.values()]
      .map((c) => ({ ...c, services: [...c.services] }))
      .sort((a, b) => b.completed - a.completed);
  }, [bookings, cityNameById, serviceNameById]);

  const totals = useMemo(
    () => ({
      cities: cities.length,
      completed: cities.reduce((s, c) => s + c.completed, 0),
      revenue: cities.reduce((s, c) => s + c.revenue, 0),
    }),
    [cities]
  );

  const mapLabels = {
    completed: t("admin.coverage.completedShort"),
    revenue: t("admin.coverage.revenueShort"),
    services: t("admin.coverage.services"),
    noKeyTitle: t("admin.coverage.noKeyTitle"),
    noKeyBody: t("admin.coverage.noKeyBody"),
    errorTitle: t("admin.coverage.errorTitle"),
    errorBody: t("admin.coverage.errorBody"),
  };

  return (
    <div className="space-y-8">
      <PageHeader
        icon={MapIcon}
        title={t("admin.coverage.title")}
        description={t("admin.coverage.description")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={MapPin}
          label={t("admin.coverage.statCities")}
          value={totals.cities}
          accent="brand"
        />
        <StatCard
          icon={CheckCircle2}
          label={t("admin.coverage.statCompleted")}
          value={totals.completed}
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
        <CoverageMap cities={cities} labels={mapLabels} formatCurrency={eur} />
      </Card>

      {/* City roll-up — also the graceful fallback when the map can't render. */}
      <Card className="p-6">
        <h2 className="text-heading-sm text-ink-900">{t("admin.coverage.listTitle")}</h2>
        {cities.length === 0 ? (
          <p className="mt-4 text-body-sm text-ink-500">{t("admin.coverage.empty")}</p>
        ) : (
          <ul className="mt-5 divide-y divide-ink-100">
            {cities.map((c) => (
              <li key={c.name} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <Image
                  src={c.image}
                  alt={c.name}
                  rounded="rounded-xl"
                  className="size-14 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-900">{c.name}</p>
                  <p className="mt-0.5 flex flex-wrap gap-1.5">
                    {c.services.map((s) => (
                      <Badge key={s} variant="neutral" size="sm">
                        {s}
                      </Badge>
                    ))}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-body-sm font-bold text-ink-900">
                    {c.completed} {t("admin.coverage.completedShort")}
                  </p>
                  <p className="text-caption text-ink-400">{eur(c.revenue)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
