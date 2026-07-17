import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import {
  PageHeader,
  BOOKING_STATUS_META,
  PAYMENT_STATUS_META,
  STATUS_COLORS,
  useCollection,
} from "@/features/admin";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/cn";

/*
 * Bookings calendar
 * -----------------
 * A month-grid view of every booking, placed on its bookingDate. Each entry is
 * a colour-coded chip (same STATUS_COLORS as the bookings map); clicking a chip
 * opens the booking detail, and crowded days expose a "+N" day list. The grid
 * is Monday-first (European market) and all labels come from Intl so every
 * supported locale renders its own month/weekday names.
 */

const eur = (n) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    n || 0
  );

// Local (not UTC) YYYY-MM-DD key, matching the string the API stores in
// bookingDate — grouping and lookup both go through this.
const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/** Build the visible cells for a month: full Monday-first weeks, padded with
 * leading/trailing days from the adjacent months. */
function buildMonthCells(year, month) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // days shown before the 1st
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((lead + daysInMonth) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const date = new Date(year, month, i - lead + 1);
    return { date, key: dayKey(date), inMonth: date.getMonth() === month };
  });
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-6 border-b border-ink-100 py-2.5 last:border-0">
      <span className="text-body-sm text-ink-400">{label}</span>
      <span className="text-right text-body-sm font-medium text-ink-800">{value || "—"}</span>
    </div>
  );
}

/** One booking entry inside a day cell or the day modal. */
function BookingChip({ booking, onClick, detailed }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-caption font-medium text-ink-700 transition-colors hover:bg-ink-100",
        detailed && "gap-2.5 rounded-xl px-3 py-2.5 text-body-sm"
      )}
    >
      <span
        className={cn("size-2 shrink-0 rounded-full", detailed && "size-2.5")}
        style={{ backgroundColor: STATUS_COLORS[booking.status] || STATUS_COLORS.pending }}
        aria-hidden="true"
      />
      <span className="shrink-0 tabular-nums text-ink-500">{booking.booking_time}</span>
      <span className="truncate">{booking.customer_name}</span>
      {detailed && (
        <span className="ml-auto shrink-0 text-body-sm text-ink-400">{booking.service_name}</span>
      )}
    </button>
  );
}

const MAX_CHIPS = 3;

export default function CalendarPage() {
  const { items } = useCollection("bookings");
  const { items: cities } = useCollection("cities");
  const { items: services } = useCollection("services");
  const { t, locale } = useTranslation();

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [dayOpen, setDayOpen] = useState(null); // day key whose full list is open
  const [viewing, setViewing] = useState(null);

  // Resolve service/city ids to names, same as the Bookings page.
  const cityNameById = useMemo(
    () => Object.fromEntries(cities.map((c) => [String(c._id), c.name])),
    [cities]
  );
  const serviceNameById = useMemo(
    () => Object.fromEntries(services.map((s) => [String(s._id), s.name])),
    [services]
  );

  const statusOptions = useMemo(
    () =>
      Object.keys(BOOKING_STATUS_META).map((value) => ({
        value,
        label: t(BOOKING_STATUS_META[value].labelKey),
      })),
    [t]
  );

  // bookingDate is stored as a "YYYY-MM-DD" string, so bookings group straight
  // onto the cell keys with no timezone maths.
  const bookingsByDay = useMemo(() => {
    const map = {};
    for (const b of items) {
      if (statusFilter && b.status !== statusFilter) continue;
      if (!b.booking_date) continue;
      (map[b.booking_date] ??= []).push({
        ...b,
        service_name: serviceNameById[String(b.service_id)] || b.service_name,
        city_name: cityNameById[String(b.city_id)] || b.city_name,
      });
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => String(a.booking_time).localeCompare(String(b.booking_time)));
    }
    return map;
  }, [items, statusFilter, serviceNameById, cityNameById]);

  const cells = useMemo(
    () => buildMonthCells(cursor.year, cursor.month),
    [cursor]
  );

  const monthCount = useMemo(
    () =>
      cells.reduce(
        (sum, c) => (c.inMonth ? sum + (bookingsByDay[c.key]?.length || 0) : sum),
        0
      ),
    [cells, bookingsByDay]
  );

  // Locale-aware labels straight from Intl (codes in config.js are valid BCP47).
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
        new Date(cursor.year, cursor.month, 1)
      ),
    [locale, cursor]
  );
  const weekdayLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
    // 2024-01-01 was a Monday — walk one Monday-first week.
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)));
  }, [locale]);
  const longDate = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [locale]
  );

  const todayKey = dayKey(new Date());
  const goMonth = (delta) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  const goToday = () => {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
  };

  const dayBookings = dayOpen ? bookingsByDay[dayOpen] || [] : [];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={CalendarDays}
        title={t("admin.calendar.title")}
        description={t("admin.calendar.description")}
      />

      {/* Toolbar: month switcher + status filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("admin.calendar.prevMonth")}
            onClick={() => goMonth(-1)}
          >
            <ChevronLeft className="size-4.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("admin.calendar.nextMonth")}
            onClick={() => goMonth(1)}
          >
            <ChevronRight className="size-4.5" />
          </Button>
          <div className="ml-1">
            <h2 className="text-heading-sm font-bold capitalize text-ink-900">{monthLabel}</h2>
            <p className="text-caption text-ink-400">
              {t("admin.calendar.monthCount", { count: monthCount })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>
            {t("admin.calendar.today")}
          </Button>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: "", label: t("admin.bookings.allStatuses") }, ...statusOptions]}
            className="h-9 min-w-[10rem]"
          />
        </div>
      </div>

      {/* Month grid — scrolls horizontally on narrow screens instead of crushing */}
      <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-surface">
        <div className="min-w-[52rem]">
          <div className="grid grid-cols-7 border-b border-ink-100">
            {weekdayLabels.map((label) => (
              <div
                key={label}
                className="px-2 py-2.5 text-center text-caption font-semibold uppercase tracking-wider text-ink-400"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map(({ date, key, inMonth }) => {
              const dayList = bookingsByDay[key] || [];
              const overflow = dayList.length - MAX_CHIPS;
              const isToday = key === todayKey;
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-28 border-b border-r border-ink-100 p-1.5 [&:nth-child(7n)]:border-r-0",
                    !inMonth && "bg-ink-100/40"
                  )}
                >
                  <span
                    className={cn(
                      "mb-1 grid size-6 place-items-center rounded-full text-caption font-semibold",
                      isToday
                        ? "bg-brand-600 text-white"
                        : inMonth
                          ? "text-ink-700"
                          : "text-ink-400"
                    )}
                  >
                    {date.getDate()}
                  </span>
                  <div className="space-y-0.5">
                    {dayList.slice(0, MAX_CHIPS).map((b) => (
                      <BookingChip key={b._id} booking={b} onClick={() => setViewing(b)} />
                    ))}
                    {overflow > 0 && (
                      <button
                        type="button"
                        onClick={() => setDayOpen(key)}
                        className="w-full rounded-lg px-1.5 py-1 text-left text-caption font-semibold text-brand-600 transition-colors hover:bg-brand-50"
                      >
                        {t("admin.calendar.more", { count: overflow })}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Status legend (same colours as the bookings map) */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {Object.entries(BOOKING_STATUS_META).map(([status, meta]) => (
          <span key={status} className="flex items-center gap-2 text-body-sm text-ink-600">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[status] }}
              aria-hidden="true"
            />
            {t(meta.labelKey)}
          </span>
        ))}
      </div>

      {/* Full list for a crowded day */}
      <Modal
        open={Boolean(dayOpen)}
        onClose={() => setDayOpen(null)}
        title={dayOpen ? longDate.format(new Date(`${dayOpen}T00:00:00`)) : ""}
        description={dayOpen ? t("admin.calendar.dayCount", { count: dayBookings.length }) : ""}
      >
        <div className="space-y-1">
          {dayBookings.map((b) => (
            <BookingChip
              key={b._id}
              booking={b}
              detailed
              onClick={() => {
                setDayOpen(null);
                setViewing(b);
              }}
            />
          ))}
        </div>
      </Modal>

      {/* Booking detail — same layout as the Bookings page view dialog */}
      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={t("admin.bookings.detailsTitle")}
        description={viewing?.reference}
        size="lg"
      >
        {viewing && (
          <div className="space-y-1">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={BOOKING_STATUS_META[viewing.status]?.variant}>
                  {BOOKING_STATUS_META[viewing.status] &&
                    t(BOOKING_STATUS_META[viewing.status].labelKey)}
                </Badge>
                {(() => {
                  const pm = PAYMENT_STATUS_META[viewing.payment_status] || PAYMENT_STATUS_META.unpaid;
                  return (
                    <Badge variant={pm.variant} size="sm">
                      {t(pm.labelKey)}
                    </Badge>
                  );
                })()}
              </div>
              <span className="text-heading-sm font-bold text-ink-900">
                {eur(viewing.total_amount)}
              </span>
            </div>
            <DetailRow label={t("admin.bookings.detail.customer")} value={viewing.customer_name} />
            <DetailRow label={t("admin.bookings.detail.email")} value={viewing.customer_email} />
            <DetailRow label={t("admin.bookings.detail.phone")} value={viewing.customer_phone} />
            <DetailRow label={t("admin.bookings.detail.service")} value={viewing.service_name} />
            <DetailRow label={t("admin.bookings.detail.city")} value={viewing.city_name} />
            <DetailRow
              label={t("admin.bookings.detail.address")}
              value={[viewing.street_name, viewing.house_number].filter(Boolean).join(" ")}
            />
            <DetailRow
              label={t("admin.bookings.detail.dateTime")}
              value={`${viewing.booking_date} · ${viewing.booking_time}`}
            />
            <DetailRow
              label={t("admin.bookings.detail.hoursCleaners")}
              value={`${viewing.hours || "—"} h · ${viewing.cleaners || "—"}`}
            />
            <DetailRow
              label={t("admin.bookings.detail.workers")}
              value={viewing.worker_names?.length ? viewing.worker_names.join(", ") : "—"}
            />
            <DetailRow label={t("admin.bookings.detail.notes")} value={viewing.notes} />
          </div>
        )}
      </Modal>
    </div>
  );
}
