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
        title={`Welcome back, ${user?.fullname?.split(" ")[0] || "Admin"}`}
        description="Here's what's happening across CasaClean today."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={CalendarCheck}
          label="Bookings"
          value={stats.bookings}
          hint={`${stats.byStatus.pending || 0} pending`}
          accent="brand"
        />
        <StatCard
          icon={Euro}
          label="Revenue"
          value={eur(stats.revenue)}
          hint="Confirmed + completed"
          accent="success"
        />
        <StatCard
          icon={Sparkles}
          label="Services"
          value={stats.services}
          hint={`${stats.activeServices} active`}
          accent="accent"
        />
        <StatCard
          icon={MapPin}
          label="Cities"
          value={stats.cities}
          hint={`${stats.activeCities} active`}
          accent="neutral"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Pipeline */}
        <Card className="p-6 lg:col-span-2">
          <h2 className="text-heading-sm text-ink-900">Booking pipeline</h2>
          <p className="mt-1 text-body-sm text-ink-500">By current status</p>
          <ul className="mt-6 space-y-4">
            {statusEntries.map(([key, meta]) => {
              const count = stats.byStatus[key] || 0;
              return (
                <li key={key}>
                  <div className="mb-1.5 flex items-center justify-between text-body-sm">
                    <span className="font-medium text-ink-700">{meta.label}</span>
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
        <Card className="p-6 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-heading-sm text-ink-900">Recent bookings</h2>
            <Users className="size-5 text-ink-300" />
          </div>
          <div className="mt-4 divide-y divide-ink-100">
            {recent.map((b) => {
              const meta = BOOKING_STATUS_META[b.status];
              return (
                <div key={b._id} className="flex items-center justify-between gap-4 py-3">
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
                      {meta?.label}
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
