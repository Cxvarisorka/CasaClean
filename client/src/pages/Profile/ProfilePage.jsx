import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  CalendarDays,
  LogOut,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import { Page } from "@/components/shared/Page";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/features/admin/context";
import { BOOKING_STATUS_META } from "@/features/admin/constants";
import { updateProfile } from "@/features/auth/api/authApi";
import { getMyBookings } from "@/features/booking";
import { useCities } from "@/features/booking/hooks/useCities";
import { useServices } from "@/features/services";
import { Seo } from "@/seo";
import { useTranslation } from "@/i18n";
import { ROUTES } from "@/constants/routes";

/*
 * ProfilePage
 * -----------
 * The signed-in user's account home. Renders identity + account metadata and
 * lets the user edit their personal details (name, phone). The route is wrapped
 * in <RequireAuth>, so this only ever renders for a real, registered user.
 */

const initials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

const fmtDate = (iso, locale) =>
  iso
    ? new Date(iso).toLocaleDateString(locale === "ka" ? "ka-GE" : locale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

const eur = (n) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    Number(n) || 0
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

  // Booking history for the signed-in user — straight from the database.
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["my-bookings", user?.email],
    queryFn: getMyBookings,
    enabled: Boolean(user),
  });

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

  if (!user) return null;

  const dirty =
    form.fullname !== (user.fullname || "") || form.phone !== (user.phone || "");

  const onChange = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (status !== "idle") setStatus("idle");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");
    try {
      const res = await updateProfile({
        fullname: form.fullname.trim(),
        phone: form.phone.trim(),
      });
      const updated = res?.user ?? res ?? form;
      updateUser({ fullname: updated.fullname, phone: updated.phone });
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
                    fullWidth
                    leftIcon={LayoutDashboard}
                    className="mt-6"
                  >
                    {t("profile.adminConsole")}
                  </Button>
                )}
              </Card>

              <Card className="p-2.5 sm:p-6">
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
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
          </Card>
        </Container>
      </section>
    </Page>
  );
};

export default ProfilePage;
