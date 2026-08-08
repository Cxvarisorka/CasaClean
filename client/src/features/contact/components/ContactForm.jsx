import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { CheckCircle2, Send } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/i18n";
import { contactSchema, CONTACT_TOPICS } from "../validation/contactSchema";
import { useSubmitContact } from "../hooks/useContactMutations";

/*
 * ContactForm
 * -----------
 * The full contact form. Validation, submission and a success state are all
 * handled here so the Contact page stays a thin composition. Errors from the
 * schema and the network surface inline.
 */

export function ContactForm() {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "", topic: "", message: "", website: "" },
  });

  const { mutateAsync, isPending, isSuccess, error } = useSubmitContact();

  const onSubmit = (values) => mutateAsync(values);

  // Schema messages are i18n keys (see contactSchema.js) — resolve them here.
  const fieldError = (field) => (field?.message ? t(field.message) : undefined);

  // Translate the topic labels while keeping the stable submission values.
  const topicOptions = CONTACT_TOPICS.map((topic) => ({
    value: topic.value,
    label: t(`pages.contact.topics.${topic.value}`),
  }));

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center rounded-2xl border border-ink-200 bg-white px-6 py-14 text-center"
      >
        <span className="grid size-14 place-items-center rounded-2xl bg-surface shadow-soft">
          <CheckCircle2 className="size-7 text-black" />
        </span>
        <h3 className="mt-5 text-heading-md text-black">
          {t("pages.contact.successTitle")}
        </h3>
        <p className="mt-2 max-w-sm text-body-md text-black">
          {t("pages.contact.successBody")}
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {/*
        Honeypot. Kept out of the layout with absolute positioning rather than
        `display:none` — some bots skip hidden inputs but happily fill this one.
        A non-empty value makes the server drop the submission silently.
      */}
      <div
        className="pointer-events-none absolute h-0 w-0 overflow-hidden"
        style={{ left: "-9999px" }}
        aria-hidden="true"
      >
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label={t("pages.contact.fields.name")}
          placeholder={t("pages.contact.fields.namePlaceholder")}
          required
          error={fieldError(errors.name)}
          {...register("name")}
        />
        <Input
          label={t("pages.contact.fields.email")}
          type="email"
          placeholder={t("pages.contact.fields.emailPlaceholder")}
          required
          error={fieldError(errors.email)}
          {...register("email")}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label={t("pages.contact.fields.phone")}
          type="tel"
          placeholder={t("pages.contact.fields.phonePlaceholder")}
          hint={t("common.optional")}
          error={fieldError(errors.phone)}
          {...register("phone")}
        />
        <Select
          label={t("pages.contact.fields.topic")}
          placeholder={t("pages.contact.fields.topicPlaceholder")}
          required
          options={topicOptions}
          error={fieldError(errors.topic)}
          {...register("topic")}
        />
      </div>

      <Textarea
        label={t("pages.contact.fields.message")}
        placeholder={t("pages.contact.fields.messagePlaceholder")}
        rows={5}
        required
        error={fieldError(errors.message)}
        {...register("message")}
      />

      {/*
        The submission genuinely failed — the message was NOT stored. Show the
        translated apology rather than the API's English-only error text.
      */}
      {error && (
        <p className="text-body-sm text-red-600">{t("pages.contact.errorBody")}</p>
      )}

      <Button type="submit" size="lg" loading={isPending} rightIcon={Send}>
        {t("common.send")}
      </Button>
    </form>
  );
}

export default ContactForm;
