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
    defaultValues: { name: "", email: "", phone: "", topic: "", message: "" },
  });

  const { mutateAsync, isPending, isSuccess, error } = useSubmitContact();

  const onSubmit = (values) => mutateAsync(values);

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
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label={t("pages.contact.fields.name")}
          placeholder="Jane Cooper"
          required
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          label={t("pages.contact.fields.email")}
          type="email"
          placeholder="jane@email.com"
          required
          error={errors.email?.message}
          {...register("email")}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label={t("pages.contact.fields.phone")}
          type="tel"
          placeholder="+39 ..."
          hint={t("common.optional")}
          error={errors.phone?.message}
          {...register("phone")}
        />
        <Select
          label={t("pages.contact.fields.topic")}
          placeholder={t("pages.contact.fields.topicPlaceholder")}
          required
          options={topicOptions}
          error={errors.topic?.message}
          {...register("topic")}
        />
      </div>

      <Textarea
        label={t("pages.contact.fields.message")}
        placeholder={t("pages.contact.fields.messagePlaceholder")}
        rows={5}
        required
        error={errors.message?.message}
        {...register("message")}
      />

      {error && (
        <p className="text-body-sm text-red-600">{error.message}</p>
      )}

      <Button type="submit" size="lg" loading={isPending} rightIcon={Send}>
        {t("common.send")}
      </Button>
    </form>
  );
}

export default ContactForm;
