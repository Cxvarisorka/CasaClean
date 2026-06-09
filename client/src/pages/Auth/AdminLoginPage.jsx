import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useSignIn, makeSignInSchema } from "@/features/auth";
import { useAuth } from "@/features/admin/context";
import { Seo } from "@/seo";
import { useTranslation } from "@/i18n";
import { ROUTES } from "@/constants/routes";

/*
 * AdminLoginPage
 * --------------
 * Dedicated entry point for the admin console, separate from the customer
 * sign-in. It authenticates with the same email/password endpoint, then enforces
 * the admin role client-side: a non-admin who authenticates is immediately
 * signed back out and shown an access error, so the panel never renders for a
 * regular customer (the API still enforces the role on every write).
 *
 * Already-authenticated admins are redirected straight to the dashboard, so the
 * login screen is never shown to someone who can already get in.
 */

const AdminLoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refresh, logout, isLoading, isAdmin } = useAuth();
  const [roleError, setRoleError] = useState("");

  const schema = useMemo(() => makeSignInSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: true },
  });

  const { mutateAsync, isPending, error } = useSignIn({
    onSuccess: async () => {
      // Pull the freshly-established session and gate on its role. `refresh`
      // returns the resolved user (or null), so we can branch without waiting
      // for a re-render.
      const me = await refresh();
      if (me?.role === "admin") {
        navigate(ROUTES.admin.dashboard, { replace: true });
      } else {
        // Authenticated, but not an admin — drop the session and explain why.
        setRoleError(t("admin.login.notAdmin"));
        await logout();
      }
    },
  });

  const onSubmit = (values) => {
    setRoleError("");
    return mutateAsync(values);
  };

  // Someone who's already an admin shouldn't see the login form at all.
  if (!isLoading && isAdmin) {
    return <Navigate to={ROUTES.admin.dashboard} replace />;
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-night-soft px-5 py-12">
      <Seo title="Admin · CasaClean" path={ROUTES.admin.login} noIndex />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <div className="rounded-3xl border border-white/10 bg-surface p-8 shadow-large sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-caption font-semibold uppercase tracking-wide text-brand-700">
            <ShieldCheck className="size-4" />
            {t("admin.login.badge")}
          </span>

          <h1 className="mt-5 text-heading-lg text-ink-900">
            {t("admin.login.title")}
          </h1>
          <p className="mt-2 text-body-md text-ink-500">
            {t("admin.login.subtitle")}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
            <Input
              label={t("admin.login.email")}
              type="email"
              leftIcon={Mail}
              placeholder={t("admin.login.emailPlaceholder")}
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label={t("admin.login.password")}
              type="password"
              leftIcon={Lock}
              placeholder={t("admin.login.passwordPlaceholder")}
              error={errors.password?.message}
              {...register("password")}
            />

            {(roleError || error) && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-body-sm text-red-700">
                <AlertCircle className="mt-0.5 size-4.5 shrink-0" />
                {roleError || error?.message || t("auth.errors.generic")}
              </div>
            )}

            <Button type="submit" size="lg" fullWidth loading={isPending} rightIcon={ArrowRight}>
              {t("admin.login.submit")}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            to={ROUTES.home}
            className="inline-flex items-center gap-1.5 text-body-sm font-medium text-ink-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" /> {t("admin.login.backToSite")}
          </Link>
        </div>
      </motion.div>
    </main>
  );
};

export default AdminLoginPage;
