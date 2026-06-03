import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { CheckCircle2, Send } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
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

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center rounded-2xl border border-brand-100 bg-brand-50/60 px-6 py-14 text-center"
      >
        <span className="grid size-14 place-items-center rounded-2xl bg-white shadow-soft">
          <CheckCircle2 className="size-7 text-brand-600" />
        </span>
        <h3 className="mt-5 text-heading-md text-ink-900">Message sent</h3>
        <p className="mt-2 max-w-sm text-body-md text-ink-500">
          Thanks for reaching out — a member of our team will get back to you
          within one business day.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Full name"
          placeholder="Jane Cooper"
          required
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          label="Email"
          type="email"
          placeholder="jane@email.com"
          required
          error={errors.email?.message}
          {...register("email")}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Phone"
          type="tel"
          placeholder="+39 ..."
          hint="Optional"
          error={errors.phone?.message}
          {...register("phone")}
        />
        <Select
          label="Topic"
          placeholder="Select a topic"
          required
          options={CONTACT_TOPICS}
          error={errors.topic?.message}
          {...register("topic")}
        />
      </div>

      <Textarea
        label="How can we help?"
        placeholder="Tell us about your property and what you need…"
        rows={5}
        required
        error={errors.message?.message}
        {...register("message")}
      />

      {error && (
        <p className="text-body-sm text-red-600">{error.message}</p>
      )}

      <Button type="submit" size="lg" loading={isPending} rightIcon={Send}>
        Send message
      </Button>
    </form>
  );
}

export default ContactForm;
