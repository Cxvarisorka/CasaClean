import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/features/admin/context";

/*
 * ContactStep
 * -----------
 * Step 4 — how to reach the customer. Maps to customer_name / email / phone and
 * optional notes on the booking model. The contact fields are pre-filled from
 * the signed-in user's account (booking is auth-only), and only when still
 * empty — so any edits the customer makes are preserved across step navigation.
 */

export function ContactStep() {
  const { t } = useTranslation();
  const {
    register,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const current = getValues();
    if (!current.name && user.fullname) setValue("name", user.fullname);
    if (!current.email && user.email) setValue("email", user.email);
    if (!current.phone && user.phone) setValue("phone", user.phone);
  }, [user, setValue, getValues]);

  return (
    <div className="space-y-5">
      <Input
        label={t("booking.contact.name")}
        placeholder={t("booking.contact.namePlaceholder")}
        required
        error={errors.name?.message}
        {...register("name")}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label={t("booking.fields.email")}
          type="email"
          placeholder={t("booking.contact.emailPlaceholder")}
          required
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label={t("booking.fields.phone")}
          type="tel"
          placeholder={t("booking.contact.phonePlaceholder")}
          required
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>

      <Textarea
        label={t("booking.contact.notes")}
        hint={t("booking.contact.notesHint")}
        rows={4}
        placeholder={t("booking.contact.notesPlaceholder")}
        error={errors.notes?.message}
        {...register("notes")}
      />
    </div>
  );
}

export default ContactStep;
