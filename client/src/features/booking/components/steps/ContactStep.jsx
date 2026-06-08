import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
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
        label="Full name"
        placeholder="Lela Gorelishvili"
        required
        error={errors.name?.message}
        {...register("name")}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Email"
          type="email"
          placeholder="you@email.com"
          required
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Phone"
          type="tel"
          placeholder="+39 ..."
          required
          error={errors.phone?.message}
          {...register("phone")}
        />
      </div>

      <Textarea
        label="Access notes"
        hint="Optional — gate codes, parking, pets, where to find keys, etc."
        rows={4}
        placeholder="Anything the crew should know before arriving…"
        error={errors.notes?.message}
        {...register("notes")}
      />
    </div>
  );
}

export default ContactStep;
