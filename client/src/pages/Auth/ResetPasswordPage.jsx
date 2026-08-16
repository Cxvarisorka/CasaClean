import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Lock } from "lucide-react";
import { Page } from "@/components/shared/Page";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AuthShell, useResetPassword, makeResetPasswordSchema } from "@/features/auth";
import { useAuth } from "@/features/admin/context/AuthContext";
import { Seo } from "@/seo";
import { useTranslation } from "@/i18n";
import { ROUTES } from "@/constants/routes";

/*
 * ResetPasswordPage
 * -----------------
 * Opened from the emailed reset link (/reset-password/:token). Collects the new
 * password; on success the API signs the user straight in (session cookie), so
 * we refresh the auth state and land them on the home page. An invalid/expired
 * token surfaces the API error with a shortcut to request a fresh link.
 */

const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const schema = useMemo(() => makeResetPasswordSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const { mutateAsync, isPending, error } = useResetPassword({
    onSuccess: async () => {
      // The reset response set the session cookie — sync and go home.
      await refresh();
      navigate(ROUTES.home, { replace: true });
    },
  });

  const onSubmit = ({ password }) => mutateAsync({ token, password });

  return (
    <Page>
      <Seo
        title={`${t("auth.reset.title")} · CasaClean`}
        path={ROUTES.resetPassword()}
        noIndex
      />
      <AuthShell>
        <h1 className="text-heading-lg text-ink-900">{t("auth.reset.title")}</h1>
        <p className="mt-2 text-body-md text-ink-500">{t("auth.reset.subtitle")}</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
          <Input
            label={t("auth.reset.newPassword")}
            type="password"
            leftIcon={Lock}
            placeholder={t("auth.placeholders.password")}
            error={errors.password?.message}
            {...register("password")}
          />
          <Input
            label={t("auth.reset.confirmPassword")}
            type="password"
            leftIcon={Lock}
            placeholder={t("auth.placeholders.password")}
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-body-sm text-red-700">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 size-4.5 shrink-0" />
                {error.message || t("auth.reset.invalid")}
              </div>
              <Link
                to={ROUTES.forgotPassword}
                className="mt-2 inline-block font-semibold text-brand-600 hover:text-brand-700"
              >
                {t("auth.reset.requestNew")}
              </Link>
            </div>
          )}

          <Button type="submit" size="lg" fullWidth loading={isPending} rightIcon={ArrowRight}>
            {t("auth.reset.submit")}
          </Button>
        </form>

        <p className="mt-8 text-center text-body-sm text-ink-500">
          <Link
            to={ROUTES.signin}
            className="font-semibold text-brand-600 hover:text-brand-700"
          >
            {t("auth.forgot.back")}
          </Link>
        </p>
      </AuthShell>
    </Page>
  );
};

export default ResetPasswordPage;
