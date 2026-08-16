import { useMemo } from "react";
import {
  CalendarCheck,
  Euro,
  Sparkles,
  MapPin,
  Users,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader, StatCard, useAdminData, useAuth } from "@/features/admin";
import { BOOKING_STATUS_META } from "@/features/admin";
import { useTranslation } from "@/i18n";

/*
 * Admin Dashboard
 * ---------------
 * At-a-glance overview: KPI tiles, a status breakdown of the booking pipeline
 * and the latest bookings. All values are derived live from the admin store.
 */

const eur = (n) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n || 0);

export default function DashboardPage() {
  const { stats, bookings } = useAdminData();
  const { user } = useAuth();
  const { t } = useTranslation();

  const recent = useMemo(
    () =>
      [...bookings]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 6),
    [bookings]
  );

  const statusEntries = Object.entries(BOOKING_STATUS_META);
  const maxStatus = Math.max(1, ...statusEntries.map(([k]) => stats.byStatus[k] || 0));

  return (
    <div className="space-y-8">
      <PageHeader
        icon={TrendingUp}
        title={t("admin.dashboard.welcome", {
          name: user?.fullname?.split(" ")[0] || t("admin.topbar.adminFallback"),
        })}
        description={t("admin.dashboard.subtitle")}
      />

      {/* Two-up costs a tile ~156px on a 360px screen, of which the padding and
          the icon chip take 84 — leaving the revenue figure a 60px gutter to
          scroll inside. One column below `xs`; the pairs resume at 400. */}
      <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CalendarCheck}
          label={t("admin.dashboard.bookings")}
          value={stats.bookings}
          hint={t("admin.dashboard.pendingHint", { count: stats.byStatus.pending || 0 })}
          accent="brand"
        />
        <StatCard
          icon={Euro}
          label={t("admin.dashboard.revenue")}
          value={eur(stats.revenue)}
          hint={t("admin.dashboard.revenueHint")}
          accent="success"
        />
        <StatCard
          icon={Sparkles}
          label={t("admin.dashboard.services")}
          value={stats.services}
          hint={t("admin.dashboard.servicesHint", { count: stats.activeServices })}
          accent="accent"
        />
        <StatCard
          icon={MapPin}
          label={t("admin.dashboard.cities")}
          value={stats.cities}
          hint={t("admin.dashboard.citiesHint", { count: stats.activeCities })}
          accent="neutral"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Pipeline */}
        <Card className="p-4 xs:p-6 lg:col-span-2">
          <h2 className="text-heading-sm text-ink-900">{t("admin.dashboard.pipeline")}</h2>
          <p className="mt-1 text-body-sm text-ink-500">{t("admin.dashboard.pipelineSub")}</p>
          <ul className="mt-6 space-y-4">
            {statusEntries.map(([key, meta]) => {
              const count = stats.byStatus[key] || 0;
              return (
                <li key={key}>
                  <div className="mb-1.5 flex items-center justify-between text-body-sm">
                    <span className="font-medium text-ink-700">{t(meta.labelKey)}</span>
                    <span className="font-semibold text-ink-900">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${(count / maxStatus) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Recent bookings */}
        <Card className="p-4 xs:p-6 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-heading-sm text-ink-900">{t("admin.dashboard.recent")}</h2>
            <Users className="size-5 text-ink-300" />
          </div>
          <div className="mt-4 divide-y divide-ink-100">
            {recent.map((b) => {
              const meta = BOOKING_STATUS_META[b.status];
              return (
                /* The amount and the status badge want ~130px, which on a small
                   phone leaves the customer's name a truncated stub. Below `xs`
                   they drop under the name and keep their full width. */
                <div
                  key={b._id}
                  className="flex flex-col gap-1 py-3 xs:flex-row xs:items-center xs:justify-between xs:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-ink-900">
                      {b.customer_name}
                    </p>
                    <p className="truncate text-caption text-ink-400">
                      {b.service_name} · {b.city_name}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-body-sm font-semibold text-ink-700">
                      {eur(b.total_amount)}
                    </span>
                    <Badge variant={meta?.variant} size="sm">
                      {meta && t(meta.labelKey)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
