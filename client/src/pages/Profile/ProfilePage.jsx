import { useState } from "react";
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
} from "lucide-react";
import { Page } from "@/components/shared/Page";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/features/admin/context";
import { updateProfile } from "@/features/auth/api/authApi";
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

const ProfilePage = () => {
  const { t, locale } = useTranslation();
  const { user, isAdmin, updateUser, logout } = useAuth();

  const [form, setForm] = useState({
    fullname: user?.fullname || "",
    phone: user?.phone || "",
  });
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const [errorMsg, setErrorMsg] = useState("");

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
            <span className="grid size-20 shrink-0 place-items-center rounded-3xl bg-brand-600 text-heading-md font-bold text-white shadow-soft">
              {initials(user.fullname)}
            </span>
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
                  className="text-red-600 hover:bg-red-50"
                >
                  {t("common.signOut")}
                </Button>
              </Card>
            </div>
          </div>
        </Container>
      </section>
    </Page>
  );
};

export default ProfilePage;
