import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, CheckCircle2, Mail, Send } from "lucide-react";
import { Page } from "@/components/shared/Page";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AuthShell, useForgotPassword, makeForgotPasswordSchema } from "@/features/auth";
import { Seo } from "@/seo";
import { useTranslation } from "@/i18n";
import { ROUTES } from "@/constants/routes";

/*
 * ForgotPasswordPage
 * ------------------
 * Collects the account email and requests a one-time reset link. The API
 * replies with the SAME generic message whether or not the email exists
 * (anti-enumeration), so the success state mirrors that neutrality.
 */

const ForgotPasswordPage = () => {
  const { t } = useTranslation();
  const schema = useMemo(() => makeForgotPasswordSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const { mutateAsync, isPending, isSuccess, error } = useForgotPassword();

  const onSubmit = ({ email }) => mutateAsync(email);

  return (
    <Page>
      <Seo
        title={`${t("auth.forgot.title")} · CasaClean`}
        path={ROUTES.forgotPassword}
        noIndex
      />
      <AuthShell>
        <h1 className="text-heading-lg text-ink-900">{t("auth.forgot.title")}</h1>
        <p className="mt-2 text-body-md text-ink-500">{t("auth.forgot.subtitle")}</p>

        {isSuccess ? (
          <div className="mt-8 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-body-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 size-4.5 shrink-0" />
            {t("auth.forgot.success")}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-5">
            <Input
              label={t("auth.fields.email")}
              type="email"
              leftIcon={Mail}
              placeholder={t("auth.placeholders.email")}
              error={errors.email?.message}
              {...register("email")}
            />

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-body-sm text-red-700">
                <AlertCircle className="mt-0.5 size-4.5 shrink-0" />
                {error.message || t("auth.errors.generic")}
              </div>
            )}

            <Button type="submit" size="lg" fullWidth loading={isPending} rightIcon={Send}>
              {t("auth.forgot.submit")}
            </Button>
          </form>
        )}

        <p className="mt-8 text-center text-body-sm text-ink-500">
          <Link
            to={ROUTES.signin}
            className="inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-700"
          >
            <ArrowLeft className="size-4" />
            {t("auth.forgot.back")}
          </Link>
        </p>
      </AuthShell>
    </Page>
  );
};

export default ForgotPasswordPage;
