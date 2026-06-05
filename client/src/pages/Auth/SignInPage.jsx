import { useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Lock, Mail } from "lucide-react";
import { Page } from "@/components/shared/Page";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { AuthShell, GoogleButton, useSignIn, makeSignInSchema } from "@/features/auth";
import { useAuth } from "@/features/admin/context";
import { Seo } from "@/seo";
import { useTranslation } from "@/i18n";
import { ROUTES } from "@/constants/routes";

/*
 * SignInPage
 * ----------
 * Localized sign-in: Google OAuth + email/password with translated validation.
 * On success it routes home; a failed attempt surfaces the API error inline.
 */

const SignInPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();
  // Return the user to the page they were gated from (e.g. /booking), else home.
  const from = location.state?.from?.pathname || ROUTES.home;
  const schema = useMemo(() => makeSignInSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: false },
  });

  const { mutateAsync, isPending, error } = useSignIn({
    onSuccess: async () => {
      // Sync auth state from the freshly-set session cookie, then continue.
      await refresh();
      navigate(from, { replace: true });
    },
  });

  const onSubmit = (values) => mutateAsync(values);

  return (
    <Page>
      <Seo title={`${t("auth.signin.title")} · CasaClean`} path={ROUTES.signin} noIndex />
      <AuthShell>
        <h1 className="text-heading-lg text-ink-900">{t("auth.signin.title")}</h1>
        <p className="mt-2 text-body-md text-ink-500">{t("auth.signin.subtitle")}</p>

        <div className="mt-8">
          <GoogleButton />
        </div>

        <div className="my-6 flex items-center gap-4">
          <span className="h-px flex-1 bg-ink-100" />
          <span className="text-caption uppercase tracking-wider text-ink-400">
            {t("auth.orContinueWith")}
          </span>
          <span className="h-px flex-1 bg-ink-100" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <Input
            label={t("auth.fields.email")}
            type="email"
            leftIcon={Mail}
            placeholder={t("auth.placeholders.email")}
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label={t("auth.fields.password")}
            type="password"
            leftIcon={Lock}
            placeholder={t("auth.placeholders.password")}
            error={errors.password?.message}
            {...register("password")}
          />

          <div className="flex items-center justify-between">
            <Checkbox label={t("auth.fields.rememberMe")} {...register("remember")} />
            <Link
              to={ROUTES.contact}
              className="text-body-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              {t("auth.signin.forgot")}
            </Link>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-body-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4.5 shrink-0" />
              {error.message || t("auth.errors.generic")}
            </div>
          )}

          <Button type="submit" size="lg" fullWidth loading={isPending} rightIcon={ArrowRight}>
            {t("auth.signin.submit")}
          </Button>
        </form>

        <p className="mt-8 text-center text-body-sm text-ink-500">
          {t("auth.signin.noAccount")}{" "}
          <Link to={ROUTES.signup} className="font-semibold text-brand-600 hover:text-brand-700">
            {t("auth.signin.createAccount")}
          </Link>
        </p>
      </AuthShell>
    </Page>
  );
};

export default SignInPage;
