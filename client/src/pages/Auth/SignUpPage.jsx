import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, CheckCircle2, Lock, Mail, Phone, User } from "lucide-react";
import { motion } from "framer-motion";
import { Page } from "@/components/shared/Page";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AuthShell, GoogleButton, useSignUp, makeSignUpSchema } from "@/features/auth";
import { Seo } from "@/seo";
import { useTranslation } from "@/i18n";
import { ROUTES } from "@/constants/routes";

/*
 * SignUpPage
 * ----------
 * Localized registration mapping to the backend signup contract
 * (fullname/email/phone/password). Shows a success state on completion since
 * the backend requires email verification before sign-in.
 */

const SignUpPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const schema = useMemo(() => makeSignUpSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fullname: "", email: "", phone: "", password: "", confirmPassword: "" },
  });

  const { mutateAsync, isPending, isSuccess, error } = useSignUp();

  const onSubmit = (values) => mutateAsync(values);

  if (isSuccess) {
    return (
      <Page>
        <Seo title={`${t("auth.signup.title")} · CasaClean`} path={ROUTES.signup} noIndex />
        <AuthShell>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-50">
              <CheckCircle2 className="size-9 text-brand-600" />
            </span>
            <h1 className="mt-6 text-heading-lg text-ink-900">{t("auth.signup.title")}</h1>
            <p className="mt-3 text-body-md text-ink-500">{t("auth.signup.success")}</p>
            <Button to={ROUTES.signin} size="lg" className="mt-8" rightIcon={ArrowRight}>
              {t("auth.signin.submit")}
            </Button>
          </motion.div>
        </AuthShell>
      </Page>
    );
  }

  return (
    <Page>
      <Seo title={`${t("auth.signup.title")} · CasaClean`} path={ROUTES.signup} noIndex />
      <AuthShell>
        <h1 className="text-heading-lg text-ink-900">{t("auth.signup.title")}</h1>
        <p className="mt-2 text-body-md text-ink-500">{t("auth.signup.subtitle")}</p>

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
            label={t("auth.fields.fullName")}
            leftIcon={User}
            placeholder={t("auth.placeholders.fullName")}
            error={errors.fullname?.message}
            {...register("fullname")}
          />
          <Input
            label={t("auth.fields.email")}
            type="email"
            leftIcon={Mail}
            placeholder={t("auth.placeholders.email")}
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label={t("auth.fields.phone")}
            type="tel"
            leftIcon={Phone}
            placeholder={t("auth.placeholders.phone")}
            error={errors.phone?.message}
            {...register("phone")}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label={t("auth.fields.password")}
              type="password"
              leftIcon={Lock}
              placeholder={t("auth.placeholders.password")}
              error={errors.password?.message}
              {...register("password")}
            />
            <Input
              label={t("auth.fields.confirmPassword")}
              type="password"
              leftIcon={Lock}
              placeholder={t("auth.placeholders.password")}
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-body-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4.5 shrink-0" />
              {error.message || t("auth.errors.generic")}
            </div>
          )}

          <Button type="submit" size="lg" fullWidth loading={isPending} rightIcon={ArrowRight}>
            {t("auth.signup.submit")}
          </Button>

          <p className="text-center text-caption text-ink-400">{t("auth.signup.terms")}</p>
        </form>

        <p className="mt-6 text-center text-body-sm text-ink-500">
          {t("auth.signup.haveAccount")}{" "}
          <Link to={ROUTES.signin} className="font-semibold text-brand-600 hover:text-brand-700">
            {t("auth.signup.signInInstead")}
          </Link>
        </p>
      </AuthShell>
    </Page>
  );
};

export default SignUpPage;
