import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

/*
 * ContactStep
 * -----------
 * Step 4 — how to reach the customer. Maps to customer_name / email / phone and
 * optional notes on the booking model.
 */

export function ContactStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext();

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
