import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  XCircle,
} from "lucide-react";
import { Page } from "@/components/shared/Page";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/features/admin/context";
import { BOOKING_STATUS_META } from "@/features/admin/constants";
import { updateProfile } from "@/features/auth/api/authApi";
import { getMyBookings, cancelMyBooking } from "@/features/booking";
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

// A booking can only be cancelled by the customer while it's still upcoming.
// Completed/cancelled bookings are terminal (matches the server-side guard).
const isCancellable = (status) => status === "pending" || status === "confirmed";

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

      <section className="bg-sand-50 pb-16 pt-28 lg:pt-32">
        <Container size="md">
          {/* Identity header */}
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.fullname}
                referrerPolicy="no-referrer"
                className="size-20 shrink-0 rounded-3xl object-cover shadow-soft"
              />
            ) : (
              <span className="grid size-20 shrink-0 place-items-center rounded-3xl bg-brand-600 text-heading-md font-bold text-white shadow-soft">
                {initials(user.fullname)}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="text-heading-lg text-ink-900">{user.fullname}</h1>
              <p className="mt-1 truncate text-body-md text-ink-500">{user.email}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
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

          <div className="mt-10 grid gap-6 lg:grid-cols-5">
            {/* Personal information (editable) */}
            <Card className="p-6 lg:col-span-3">
              <h2 className="text-heading-sm text-ink-900">
                {t("profile.personalInfo")}
              </h2>

              <form onSubmit={onSubmit} className="mt-6 space-y-5">
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
                >
                  {t("profile.save")}
                </Button>
              </form>
            </Card>

            {/* Account meta + actions */}
            <div className="space-y-6 lg:col-span-2">
              <Card className="p-6">
                <h2 className="text-heading-sm text-ink-900">
                  {t("profile.account")}
                </h2>
                <dl className="mt-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="size-5 text-ink-400" />
                    <div>
                      <dt className="text-caption text-ink-400">
                        {t("profile.memberSince")}
                      </dt>
                      <dd className="text-body-sm font-medium text-ink-800">
                        {fmtDate(user.createdAt, locale)}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="size-5 text-ink-400" />
                    <div>
                      <dt className="text-caption text-ink-400">
                        {t("profile.role")}
                      </dt>
                      <dd className="text-body-sm font-medium capitalize text-ink-800">
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

              <Card className="p-6">
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
          <Card className="mt-6 p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <CalendarCheck className="size-5" />
              </span>
              <div>
                <h2 className="text-heading-sm text-ink-900">
                  {t("profile.bookingHistory")}
                </h2>
                <p className="text-body-sm text-ink-500">
                  {t("profile.bookingHistorySubtitle")}
                </p>
              </div>
            </div>

            <div className="mt-6">
              {bookingsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Spinner size="lg" />
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-200 py-12 text-center">
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
                <ul className="divide-y divide-ink-100">
                  {history.map((b) => {
                    const meta = BOOKING_STATUS_META[b.status];
                    return (
                      <li
                        key={b._id || b.reference}
                        className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold text-ink-900">
                              {b.service_name}
                            </p>
                            {meta && (
                              <Badge variant={meta.variant} size="sm">
                                {t(meta.labelKey)}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-400">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="size-3.5" />
                              {fmtDate(b.booking_date, locale)}
                            </span>
                            {b.booking_time && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="size-3.5" />
                                {b.booking_time}
                              </span>
                            )}
                            <span>{b.city_name}</span>
                            {b.reference && (
                              <span className="font-medium text-ink-500">
                                {b.reference}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-body-md font-bold text-ink-900">
                            {eur(b.total_amount)}
                          </span>
                          {isCancellable(b.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={XCircle}
                              onClick={() => setCancelTarget(b)}
                              className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300"
                            >
                              {t("profile.cancelBooking")}
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>
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
        {cancelMutation.isError && (
          <p className="mt-3 text-body-sm text-red-600">
            {t("profile.cancelError")}
          </p>
        )}
      </Modal>
    </Page>
  );
};

export default ProfilePage;
