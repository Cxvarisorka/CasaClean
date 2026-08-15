import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Mail,
  ShieldCheck,
  CalendarDays,
  CalendarClock,
  CreditCard,
  LogOut,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
  Clock,
  Lock,
  Sparkles,
  XCircle,
  Star,
} from "lucide-react";
import { Page } from "@/components/shared/Page";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/features/admin/context";
import { BOOKING_STATUS_META } from "@/features/admin/constants";
import { updateProfile } from "@/features/auth/api/authApi";
import { AccountSecurity, BillingProfile } from "@/features/auth";
import {
  getMyBookings,
  cancelMyBooking,
  getMyReviews,
  createBookingReview,
  MySubscriptions,
} from "@/features/booking";
import { useCities } from "@/features/booking/hooks/useCities";
import { SavedCards } from "@/features/booking/components/SavedCards";
import { useServices } from "@/features/services";
import { Seo } from "@/seo";
import { useTranslation } from "@/i18n";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/cn";
import { localDateFromDateString } from "@/features/booking/utils/recurrence";

/*
 * ProfilePage
 * -----------
 * The signed-in user's account home. The route is wrapped in <RequireAuth>, so
 * this only ever renders for a real, registered user.
 *
 * The account grew far more than two columns can carry (details, bookings,
 * subscriptions, cards, billing, security), so the page is split into sections
 * driven by one nav: a sticky rail on desktop, a horizontally scrollable pill
 * row on small screens. Only the active section mounts — each one gets the full
 * content width instead of being squeezed into a sidebar, and the queries behind
 * the hidden sections don't run until they're opened.
 *
 * The active section is mirrored in the URL hash so sections are linkable, and
 * so the existing in-page anchors keep working: MySubscriptions links to
 * "#saved-cards", which now lives in another section — HASH_ALIASES maps such an
 * anchor onto the section that owns it before scrolling to it.
 */

const SECTIONS = [
  { id: "account", icon: User, labelKey: "profile.nav.account" },
  { id: "bookings", icon: CalendarCheck, labelKey: "profile.nav.bookings" },
  { id: "subscriptions", icon: CalendarClock, labelKey: "profile.nav.subscriptions" },
  { id: "billing", icon: CreditCard, labelKey: "profile.nav.billing" },
  { id: "security", icon: Lock, labelKey: "profile.nav.security" },
];

const SECTION_IDS = SECTIONS.map((s) => s.id);

// Anchors that live inside a section rather than being one.
const HASH_ALIASES = { "saved-cards": "billing" };

const sectionForHash = (hash) => {
  const raw = hash.replace(/^#/, "");
  if (!raw) return null;
  return SECTION_IDS.includes(raw) ? raw : HASH_ALIASES[raw] || null;
};

/* One nav, two shapes: a scroll-snapping pill row until `lg`, a sticky vertical
   rail from `lg` up. Same markup, so the active section survives a resize. */
const SectionNav = ({ sections, active, onSelect, t }) => (
  /* `min-w-0` is load-bearing, not defensive. The pill row below is a row of
     `shrink-0`, `whitespace-nowrap` items, so its min-content width is the sum
     of all five pills (~780px) — and `overflow-x-auto` does NOT reduce that for
     a block box, it only allows scrolling once the box is narrower. Without
     `min-w-0` that min-content becomes the grid TRACK's floor, and because the
     layout is a single-column grid below `lg`, the content column shares the
     same track: every section card gets stretched to ~740px inside a phone
     viewport and the whole page scrolls sideways. */
  <nav aria-label={t("profile.title")} className="min-w-0 lg:sticky lg:top-28">
    {/* The negative margin must match the Container's gutter at every width it
        applies to, or the row either clips its first pill or overflows the page. */}
    <ul
      className="scrollbar-none -mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 pb-2
                 sm:-mx-6 sm:px-6
                 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0"
    >
      {sections.map(({ id, icon: Icon, labelKey, badge }) => {
        const isActive = id === active;
        return (
          <li key={id} className="shrink-0 snap-start lg:shrink lg:snap-align-none">
            <button
              type="button"
              onClick={() => onSelect(id)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-full border px-4 py-2.5 text-body-sm font-semibold transition-colors lg:rounded-2xl",
                isActive
                  ? "border-brand-200 bg-brand-50 text-brand-700"
                  : "border-transparent text-ink-500 hover:bg-ink-100 hover:text-ink-900"
              )}
            >
              <Icon className="size-4.5 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{t(labelKey)}</span>
              {badge ? (
                <span
                  className={cn(
                    "ml-auto hidden rounded-full px-2 py-0.5 text-caption font-semibold lg:inline-block",
                    isActive ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-500"
                  )}
                >
                  {badge}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  </nav>
);

const initials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

const fmtDate = (value, locale) => {
  const calendarDate = localDateFromDateString(value);
  const isCalendarDate = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const timestamp = !calendarDate && !isCalendarDate && value ? Date.parse(value) : Number.NaN;
  const date = calendarDate || (!Number.isNaN(timestamp) ? new Date(timestamp) : null);

  return date
    ? date.toLocaleDateString(locale === "ka" ? "ka-GE" : locale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";
};

const eur = (n) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    Number(n) || 0
  );

// Cancelling this close to the appointment keeps a fee worth one hour of the
// booked cleaning (server: utils/cancellation.util.js, CANCELLATION_WINDOW_HOURS
// — the deployable default, which is also what the FAQ quotes). Used only to
// warn BEFORE the customer confirms; the server decides the money either way and
// its response reports exactly what happened.
const CANCELLATION_WINDOW_HOURS = 24;

const isLateCancellation = ({ booking_date: date, booking_time: time }) => {
  const startsAt = localDateFromDateString(date);
  if (!startsAt) return false;

  const [hour, minute] = String(time || "00:00").split(":").map(Number);
  startsAt.setHours(Number.isFinite(hour) ? hour : 0, Number.isFinite(minute) ? minute : 0, 0, 0);
  return startsAt.getTime() - Date.now() < CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000;
};

// A booking can only be cancelled by the customer while it's still upcoming.
// Completed/cancelled bookings are terminal (matches the server-side guard).
const isCancellable = (status) => status === "pending" || status === "confirmed";

// Read-only five-star score (filled up to `value`).
const Stars = ({ value, className }) => (
  <span className={cn("inline-flex items-center gap-0.5", className)}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        aria-hidden="true"
        className={cn(
          "size-4",
          n <= value ? "fill-amber-400 text-amber-400" : "fill-none text-ink-300"
        )}
      />
    ))}
  </span>
);

const ProfilePage = () => {
  const { t, locale } = useTranslation();
  const { user, isAdmin, updateUser, logout } = useAuth();

  const [form, setForm] = useState({
    fullname: user?.fullname || "",
    phone: user?.phone || "",
  });
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const [errorMsg, setErrorMsg] = useState("");

  // Which section is open. Seeded from the hash so a link like /profile#billing
  // (or an in-page "#saved-cards" anchor) opens the right one on first paint.
  const [section, setSection] = useState(
    () => sectionForHash(window.location.hash) || "account"
  );

  useEffect(() => {
    // Fragment links are handled by the browser, not the router, so listen to
    // the DOM event. The target only exists once its section has rendered —
    // hence the deferred scroll rather than relying on the native jump.
    const syncFromHash = () => {
      const raw = window.location.hash.replace(/^#/, "");
      const next = sectionForHash(raw);
      if (!next) return;
      setSection(next);
      requestAnimationFrame(() => {
        document.getElementById(raw)?.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    };
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  // Nav clicks keep the hash in step (replaceState, so no history spam and no
  // hashchange echo back into the listener above).
  const openSection = (id) => {
    setSection(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  // Booking history for the signed-in user — straight from the database.
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["my-bookings", user?.email],
    queryFn: getMyBookings,
    enabled: Boolean(user),
  });

  // Self-cancel flow: confirm in a modal, then PATCH /booking/:id/cancel and
  // refresh the history so the status flips to "cancelled" in place.
  const queryClient = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState(null);
  const cancelMutation = useMutation({
    mutationFn: (id) => cancelMyBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      setCancelTarget(null);
    },
  });

  // The user's own reviews → a bookingId → review map, so each completed
  // booking shows either its rating or a "Rate" action (one review per booking).
  const { data: myReviews = [] } = useQuery({
    queryKey: ["my-reviews", user?.email],
    queryFn: getMyReviews,
    enabled: Boolean(user),
  });
  const reviewByBooking = useMemo(
    () => Object.fromEntries(myReviews.map((r) => [String(r.booking_id), r])),
    [myReviews]
  );

  // Rate flow: open a modal for a completed booking, pick stars + comment, then
  // POST /review/booking/:id and refresh so the row shows the new rating.
  const [rateTarget, setRateTarget] = useState(null);
  const [rateValue, setRateValue] = useState(0);
  const [rateHover, setRateHover] = useState(0);
  const [rateComment, setRateComment] = useState("");

  const resetRate = () => {
    setRateTarget(null);
    setRateValue(0);
    setRateHover(0);
    setRateComment("");
  };

  const reviewMutation = useMutation({
    mutationFn: ({ id, rating, comment }) =>
      createBookingReview(id, { rating, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
      resetRate();
    },
  });

  const openRate = (booking) => {
    setRateTarget(booking);
    setRateValue(0);
    setRateHover(0);
    setRateComment("");
  };

  // Bookings store the service/city id only, so resolve display names from the
  // live catalogues (same source the booking wizard offers).
  const { services } = useServices();
  const { data: cities = [] } = useCities();
  const serviceNameById = useMemo(
    () => Object.fromEntries(services.map((s) => [String(s.id), s.name])),
    [services]
  );
  const cityNameById = useMemo(
    () => Object.fromEntries(cities.map((c) => [String(c.id), c.name])),
    [cities]
  );
  const history = useMemo(
    () =>
      bookings.map((b) => ({
        ...b,
        service_name: serviceNameById[String(b.service_id)] || "Service",
        city_name: cityNameById[String(b.city_id)] || "",
      })),
    [bookings, serviceNameById, cityNameById]
  );

  // The booking count rides on the nav so the section is worth opening — the
  // history query runs page-wide, the rest only mount with their section.
  const navSections = useMemo(
    () =>
      SECTIONS.map((s) =>
        s.id === "bookings" && history.length ? { ...s, badge: history.length } : s
      ),
    [history.length]
  );

  if (!user) return null;

  const dirty =
    form.fullname !== (user.fullname || "") || form.phone !== (user.phone || "");

  // PhoneInput hands back a value, not an event (it drives two controls), so the
  // setter is split from the event adapter the plain inputs use.
  const onChangeValue = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (status !== "idle") setStatus("idle");
  };

  const onChange = (key) => (e) => onChangeValue(key, e.target.value);

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");
    try {
      const res = await updateProfile({
        fullname: form.fullname.trim(),
        // "" is sent deliberately: it clears the stored number.
        phone: form.phone.trim(),
      });
      const updated = res?.user ?? res ?? form;
      // A cleared number comes back absent, so fall back to "" rather than
      // leaving the previous value in the auth context.
      updateUser({ fullname: updated.fullname, phone: updated.phone ?? "" });
      setStatus("saved");
    } catch (err) {
      setErrorMsg(err?.message || t("auth.errors.generic"));
      setStatus("error");
    }
  };

  return (
    <Page>
      <Seo title={`${t("profile.title")} · CasaClean`} path={ROUTES.profile} noIndex />

      <section className="bg-sand-50 pb-12 pt-24 sm:pb-16 sm:pt-28 lg:pt-32">
        <Container size="md">
          {/* Identity header — stays a single row on phones so the avatar and
              name read as one unit instead of eating two stacked blocks. */}
          <div className="flex items-center gap-4 sm:gap-5">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.fullname}
                referrerPolicy="no-referrer"
                className="size-16 shrink-0 rounded-2xl object-cover shadow-soft sm:size-20 sm:rounded-3xl"
              />
            ) : (
              <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-brand-600 text-heading-sm font-bold text-white shadow-soft sm:size-20 sm:rounded-3xl sm:text-heading-md">
                {initials(user.fullname)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-heading-md text-ink-900 sm:text-heading-lg">
                {user.fullname}
              </h1>
              <p className="mt-0.5 truncate text-body-sm text-ink-500 sm:mt-1 sm:text-body-md">
                {user.email}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 sm:mt-3 sm:gap-2">
                <Badge variant={isAdmin ? "dark" : "neutral"} size="sm">
                  {user.role}
                </Badge>
                {user.isVerified ? (
                  <Badge variant="success" size="sm" icon={ShieldCheck}>
                    {t("profile.verified")}
                  </Badge>
                ) : (
                  <Badge variant="outline" size="sm">
                    {t("profile.unverified")}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:mt-10 sm:gap-6 lg:grid-cols-5">
            {/* Personal information (editable) */}
            <Card className="p-5 sm:p-6 lg:col-span-3">
              <h2 className="text-heading-sm text-ink-900">
                {t("profile.personalInfo")}
              </h2>

              <form onSubmit={onSubmit} className="mt-5 space-y-5 sm:mt-6">
                <Input
                  label={t("common.fullName")}
                  leftIcon={User}
                  value={form.fullname}
                  onChange={onChange("fullname")}
                  required
                />
                <Input
                  label={t("common.email")}
                  type="email"
                  leftIcon={Mail}
                  value={user.email}
                  disabled
                  hint="Email can't be changed here."
                />
                <Input
                  label={t("common.phone")}
                  leftIcon={Phone}
                  value={form.phone}
                  onChange={onChange("phone")}
                  placeholder="+39 ..."
                />

                {status === "saved" && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-body-sm text-emerald-700">
                    <CheckCircle2 className="size-4.5 shrink-0" />
                    {t("profile.saved")}
                  </div>
                )}
                {status === "error" && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-body-sm text-red-700">
                    <AlertCircle className="mt-0.5 size-4.5 shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <Button
                  type="submit"
                  size="md"
                  loading={status === "saving"}
                  disabled={!dirty}
                  className="w-full sm:w-auto"
                >
                  {t("profile.save")}
                </Button>
              </form>
            </Card>

            {/* Account meta + actions */}
            <div className="space-y-5 sm:space-y-6 lg:col-span-2">
              <Card className="p-5 sm:p-6">
                <h2 className="text-heading-sm text-ink-900">
                  {t("profile.account")}
                </h2>
                {/* Two-up on phones/tablets so the meta block stays compact;
                    back to a single stack inside the narrow desktop column. */}
                <dl className="mt-5 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-1">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="size-5 shrink-0 text-ink-400" />
                    <div className="min-w-0">
                      <dt className="text-caption text-ink-400">
                        {t("profile.memberSince")}
                      </dt>
                      <dd className="truncate text-body-sm font-medium text-ink-800">
                        {fmtDate(user.createdAt, locale)}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="size-5 shrink-0 text-ink-400" />
                    <div className="min-w-0">
                      <dt className="text-caption text-ink-400">
                        {t("profile.role")}
                      </dt>
                      <dd className="truncate text-body-sm font-medium capitalize text-ink-800">
                        {user.role}
                      </dd>
                    </div>
                  </div>
                </dl>

                {isAdmin && (
                  <Button
                    to={ROUTES.admin.dashboard}
                    variant="outline"
                    size="sm"
                    leftIcon={LayoutDashboard}
                  >
                    {t("profile.adminConsole")}
                  </Button>
                )}
              </Card>

              <Card className="p-2.5 sm:p-6">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={LogOut}
                  onClick={logout}
                  className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300"
                >
                  {t("common.signOut")}
                </Button>
              </Card>
            </div>
          </div>

          {/* Booking history */}
          <Card className="mt-5 p-5 sm:mt-6 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <CalendarCheck className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-heading-sm text-ink-900">
                  {t("profile.bookingHistory")}
                </h2>
                <p className="text-body-sm text-ink-500">
                  {t("profile.bookingHistorySubtitle")}
                </p>
              </div>
            </div>
          </Card>

          {/* Nav + the active section. `minmax(0,1fr)` keeps the content column
              from being widened past the grid by long, unbreakable strings. */}
          <div className="mt-8 grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8">
            <SectionNav
              sections={navSections}
              active={section}
              onSelect={openSection}
              t={t}
            />

            <div className="min-w-0">
              {section === "account" && (
                <div id="account" className="grid gap-6 xl:grid-cols-2 xl:items-start">
                  {/* Personal information (editable) */}
                  <Card className="p-5 sm:p-6">
                    <h2 className="text-heading-sm text-ink-900">
                      {t("profile.personalInfo")}
                    </h2>

            <div className="mt-5 sm:mt-6">
              {bookingsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Spinner size="lg" />
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-200 px-5 py-10 text-center sm:py-12">
                  <span className="grid size-12 place-items-center rounded-2xl bg-ink-50 text-ink-400">
                    <Sparkles className="size-6" />
                  </span>
                  <div>
                    <p className="text-body-md font-semibold text-ink-900">
                      {t("profile.noBookings")}
                    </p>
                    <p className="mt-1 text-body-sm text-ink-500">
                      {t("profile.noBookingsHint")}
                    </p>
                  </div>
                  <Button to={ROUTES.booking} size="sm" className="mt-1">
                    {t("profile.bookNow")}
                  </Button>
                </div>
              ) : (
                /* Phones: each booking is a self-contained tile with the price
                   pinned to the title row. Tablet+: back to the flat, divided
                   list with the price parked on the right. */
                <ul className="space-y-3 sm:space-y-0 sm:divide-y sm:divide-ink-100">
                  {history.map((b) => {
                    const meta = BOOKING_STATUS_META[b.status];
                    return (
                      <li
                        key={b._id || b.reference}
                        className={
                          "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 " +
                          "rounded-2xl border border-ink-100 bg-sand-50 p-4 " +
                          "sm:gap-x-4 sm:gap-y-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 " +
                          "sm:py-4 sm:first:pt-0 sm:last:pb-0"
                        }
                      >
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="max-w-full truncate font-semibold text-ink-900">
                            {b.service_name}
                          </p>
                          {meta && (
                            <Badge variant={meta.variant} size="sm">
                              {t(meta.labelKey)}
                            </Badge>
                          )}
                        </div>

                        {/* Spans both rows on sm+ so it sits centered on the
                            right of the row, exactly as before. */}
                        <span className="whitespace-nowrap text-right text-body-md font-bold text-ink-900 tabular-nums sm:row-span-2 sm:self-center">
                          {eur(b.total_amount)}
                        </span>

                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-400 sm:mt-1">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3.5 shrink-0" />
                            {fmtDate(b.booking_date, locale)}
                          </span>
                          {b.booking_time && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="size-3.5 shrink-0" />
                              {b.booking_time}
                            </span>
                          )}
                          {b.city_name && <span>{b.city_name}</span>}
                          {b.reference && (
                            <span className="font-medium text-ink-500">
                              {b.reference}
                            </span>
                          )}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* Cancel confirmation */}
      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => !cancelMutation.isPending && setCancelTarget(null)}
        title={t("profile.cancelTitle")}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setCancelTarget(null)}
              disabled={cancelMutation.isPending}
            >
              {t("profile.keepBooking")}
            </Button>
            <Button
              onClick={() => cancelMutation.mutate(cancelTarget._id)}
              loading={cancelMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("profile.cancelConfirm")}
            </Button>
          </>
        }
      >
        {cancelTarget && (
          <p className="text-body-sm text-ink-600">
            {t("profile.cancelBody", {
              service: cancelTarget.service_name,
              date: fmtDate(cancelTarget.booking_date, locale),
            })}
          </p>
        )}
        {/* Money is about to be kept — say so before they confirm, not after. */}
        {cancelTarget && isLateCancellation(cancelTarget) && (
          <p className="mt-3 text-body-sm text-amber-700">
            {t("profile.cancelFeeWarning", { hours: CANCELLATION_WINDOW_HOURS })}
          </p>
        )}
        {cancelMutation.isError && (
          <p className="mt-3 text-body-sm text-red-600">
            {t("profile.cancelError")}
          </p>
        )}
      </Modal>

      {/* Rate a completed booking */}
      <Modal
        open={Boolean(rateTarget)}
        onClose={() => !reviewMutation.isPending && resetRate()}
        title={t("profile.rateTitle")}
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={resetRate}
              disabled={reviewMutation.isPending}
            >
              {t("admin.form.cancel")}
            </Button>
            <Button
              onClick={() =>
                reviewMutation.mutate({
                  id: rateTarget._id,
                  rating: rateValue,
                  comment: rateComment.trim(),
                })
              }
              loading={reviewMutation.isPending}
              disabled={rateValue < 1 || !rateComment.trim()}
            >
              {t("profile.submitReview")}
            </Button>
          </>
        }
      >
        {rateTarget && (
          <div className="space-y-5">
            <p className="text-body-sm text-ink-600">
              {t("profile.rateSubtitle", {
                service: rateTarget.service_name,
                date: fmtDate(rateTarget.booking_date, locale),
              })}
            </p>

            <div>
              <label className="mb-1.5 block text-body-sm font-semibold text-ink-800">
                {t("profile.ratingLabel")}
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onMouseEnter={() => setRateHover(n)}
                    onMouseLeave={() => setRateHover(0)}
                    onClick={() => setRateValue(n)}
                    aria-label={t("profile.rateStars", { count: n })}
                    aria-pressed={rateValue === n}
                    className="rounded-md p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "size-8 transition-colors",
                        (rateHover || rateValue) >= n
                          ? "fill-amber-400 text-amber-400"
                          : "fill-none text-ink-300"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              label={t("profile.commentLabel")}
              rows={4}
              maxLength={500}
              value={rateComment}
              onChange={(e) => setRateComment(e.target.value)}
              placeholder={t("profile.commentPlaceholder")}
              required
            />

            {reviewMutation.isError && (
              <p className="text-body-sm text-red-600">
                {reviewMutation.error?.message || t("profile.reviewError")}
              </p>
            )}
          </div>
        )}
      </Modal>
    </Page>
  );
};

export default ProfilePage;
