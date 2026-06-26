import { useState } from "react";
import {
  Star,
  Trash2,
  Eye,
  MessageSquareQuote,
  ThumbsUp,
  CalendarDays,
  Clock,
  MapPin,
  Home,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  PageHeader,
  StatCard,
  DataTable,
  ConfirmDialog,
  useCollection,
  useAdminData,
  BOOKING_STATUS_META,
} from "@/features/admin";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/cn";

/*
 * Quality & reviews
 * -----------------
 * The admin view over customer feedback. Reviews are authored by customers and
 * — enforced server-side — only after a *completed* booking, and one review per
 * booking. This page is read-only apart from moderation: it surfaces the score +
 * comment, the author and exactly which booking was rated (open a row for full
 * booking detail), with aggregate quality metrics. An admin can delete a review.
 */

const DISTRIBUTION_ROWS = [5, 4, 3, 2, 1];

const eur = (n) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    Number(n) || 0
  );

/** Five-star score, filled up to `value`. */
function Stars({ value, className }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={cn(
            "size-4",
            n <= value
              ? "fill-amber-400 text-amber-400"
              : "fill-none text-ink-300"
          )}
        />
      ))}
    </span>
  );
}

export default function QualityPage() {
  const { items, remove } = useCollection("reviews");
  const { stats } = useAdminData();
  const { t, locale } = useTranslation();
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);

  const fmtDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString(locale === "ka" ? "ka-GE" : locale, {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const avg = stats.avgRating || 0;
  const positive =
    (stats.ratingDistribution?.[5] || 0) + (stats.ratingDistribution?.[4] || 0);
  // Tallest bar drives the relative widths (min 1 so an empty feed doesn't /0).
  const maxBar = Math.max(
    1,
    ...DISTRIBUTION_ROWS.map((s) => stats.ratingDistribution?.[s] || 0)
  );

  const columns = [
    {
      key: "customer_name",
      header: t("admin.quality.col.customer"),
      render: (r) => (
        <div className="min-w-0">
          <p className="font-semibold text-ink-900">{r.customer_name}</p>
          {r.customer_email && (
            <p className="truncate text-caption text-ink-400">
              {r.customer_email}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "booking_reference",
      header: t("admin.quality.col.booking"),
      render: (r) => {
        const meta = BOOKING_STATUS_META[r.booking_status];
        return (
          <div className="min-w-0">
            <p className="font-medium text-ink-800">{r.service_name}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-ink-400">
              <span className="font-semibold text-ink-500">
                {r.booking_reference}
              </span>
              {r.booking_date && <span>{fmtDate(r.booking_date)}</span>}
              {meta && (
                <Badge variant={meta.variant} size="sm">
                  {t(meta.labelKey)}
                </Badge>
              )}
            </p>
          </div>
        );
      },
    },
    {
      key: "rating",
      header: t("admin.quality.col.rating"),
      render: (r) => (
        <div className="flex items-center gap-2">
          <Stars value={r.rating} />
          <span className="text-caption font-semibold tabular-nums text-ink-500">
            {r.rating.toFixed(0)}
          </span>
        </div>
      ),
    },
    {
      key: "comment",
      header: t("admin.quality.col.comment"),
      render: (r) =>
        r.comment ? (
          <p className="line-clamp-2 max-w-md text-body-sm text-ink-700">
            {r.comment}
          </p>
        ) : (
          <span className="text-ink-300">—</span>
        ),
    },
    {
      key: "createdAt",
      header: t("admin.quality.col.date"),
      render: (r) => (
        <span className="whitespace-nowrap text-ink-500">
          {fmtDate(r.createdAt)}
        </span>
      ),
    },
  ];

  const viewMeta = viewing && BOOKING_STATUS_META[viewing.booking_status];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Star}
        title={t("admin.quality.title")}
        description={t("admin.quality.description")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Star}
          label={t("admin.quality.stat.avg")}
          value={stats.reviews ? `${avg.toFixed(1)} / 5` : "—"}
          hint={t("admin.quality.stat.avgHint", { count: stats.reviews || 0 })}
          accent="accent"
        />
        <StatCard
          icon={MessageSquareQuote}
          label={t("admin.quality.stat.total")}
          value={stats.reviews || 0}
          hint={t("admin.quality.stat.totalHint")}
          accent="brand"
        />
        <StatCard
          icon={ThumbsUp}
          label={t("admin.quality.stat.positive")}
          value={positive}
          hint={t("admin.quality.stat.positiveHint", {
            count: positive,
            total: stats.reviews || 0,
          })}
          accent="success"
        />
      </div>

      <Card className="p-6">
        <h2 className="text-heading-sm text-ink-900">
          {t("admin.quality.distribution")}
        </h2>
        <p className="mt-1 text-body-sm text-ink-500">
          {t("admin.quality.distributionSub")}
        </p>
        <ul className="mt-6 space-y-4">
          {DISTRIBUTION_ROWS.map((score) => {
            const count = stats.ratingDistribution?.[score] || 0;
            return (
              <li key={score} className="flex items-center gap-3">
                <span className="flex w-14 shrink-0 items-center gap-1 text-body-sm font-medium text-ink-700">
                  {score}
                  <Star
                    className="size-3.5 fill-amber-400 text-amber-400"
                    aria-hidden="true"
                  />
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${(count / maxBar) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-body-sm font-semibold tabular-nums text-ink-900">
                  {count}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <DataTable
        columns={columns}
        data={items}
        searchKeys={[
          "customer_name",
          "customer_email",
          "service_name",
          "comment",
          "booking_reference",
        ]}
        searchPlaceholder={t("admin.quality.search")}
        emptyTitle={t("admin.quality.emptyTitle")}
        emptyDescription={t("admin.quality.emptyDescription")}
        onRowClick={(r) => setViewing(r)}
        actions={(r) => (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("admin.action.view")}
              onClick={() => setViewing(r)}
            >
              <Eye className="size-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("admin.action.delete")}
              className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300"
              onClick={() => setDeleting(r)}
            >
              <Trash2 className="size-4.5" />
            </Button>
          </>
        )}
      />

      {/* Review + rated-booking detail */}
      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={t("admin.quality.detail.title")}
        size="lg"
      >
        {viewing && (
          <div className="space-y-6">
            {/* The review */}
            <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-5">
              <div className="flex items-center justify-between gap-3">
                <Stars value={viewing.rating} />
                <span className="text-caption text-ink-400">
                  {fmtDate(viewing.createdAt)}
                </span>
              </div>
              <p className="mt-3 text-body-sm text-ink-800">
                {viewing.comment || "—"}
              </p>
              <p className="mt-4 text-caption text-ink-500">
                {viewing.customer_name}
                {viewing.customer_email ? ` · ${viewing.customer_email}` : ""}
              </p>
            </div>

            {/* The rated booking */}
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-body-md font-semibold text-ink-900">
                  {t("admin.quality.detail.booking")}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-caption font-semibold text-ink-500">
                    {viewing.booking_reference}
                  </span>
                  {viewMeta && (
                    <Badge variant={viewMeta.variant} size="sm">
                      {t(viewMeta.labelKey)}
                    </Badge>
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <DetailRow
                  icon={Star}
                  label={t("admin.quality.col.service")}
                  value={viewing.service_name}
                />
                <DetailRow
                  icon={CalendarDays}
                  label={t("admin.quality.detail.date")}
                  value={
                    viewing.booking_date
                      ? `${fmtDate(viewing.booking_date)}${
                          viewing.booking_time ? ` · ${viewing.booking_time}` : ""
                        }`
                      : "—"
                  }
                />
                <DetailRow
                  icon={MapPin}
                  label={t("admin.quality.detail.location")}
                  value={
                    [viewing.booking_address, viewing.booking_city]
                      .filter(Boolean)
                      .join(", ") || "—"
                  }
                />
                <DetailRow
                  icon={Home}
                  label={t("admin.quality.detail.property")}
                  value={viewing.booking_property_size || "—"}
                />
                <DetailRow
                  icon={Clock}
                  label={t("admin.quality.detail.duration")}
                  value={
                    viewing.booking_hours
                      ? t("admin.quality.detail.durationValue", {
                          hours: viewing.booking_hours,
                          cleaners: viewing.booking_cleaners || 1,
                        })
                      : "—"
                  }
                />
                <DetailRow
                  icon={MessageSquareQuote}
                  label={t("admin.quality.detail.total")}
                  value={
                    viewing.booking_total != null
                      ? eur(viewing.booking_total)
                      : "—"
                  }
                />
              </dl>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          remove(deleting._id);
          setDeleting(null);
        }}
        title={t("admin.quality.deleteTitle")}
        description={t("admin.quality.deleteConfirm", {
          name: deleting?.customer_name,
        })}
        confirmLabel={t("admin.action.delete")}
        danger
      />
    </div>
  );
}

/** One labelled field in the booking detail grid. */
function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-500">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-caption text-ink-400">{label}</dt>
        <dd className="text-body-sm font-medium text-ink-800">{value}</dd>
      </div>
    </div>
  );
}
