import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { OptionGroup } from "../fields/OptionGroup";
import { TIME_SLOTS } from "../../constants";

/*
 * ScheduleStep
 * ------------
 * Step 3 — date and time. The date uses a native date input (min = today so
 * past dates can't be chosen); the time is a slot picker for a guided feel.
 */

export function ScheduleStep() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext();

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-7">
      <Input
        label="Preferred date"
        type="date"
        min={today}
        required
        error={errors.date?.message}
        {...register("date")}
      />

      <Controller
        control={control}
        name="time"
        render={({ field }) => (
          <OptionGroup
            label="Preferred time slot"
            options={TIME_SLOTS}
            value={field.value}
            onChange={field.onChange}
            columns={4}
            error={errors.time?.message}
          />
        )}
      />

      <p className="rounded-xl bg-ink-50 px-4 py-3 text-body-sm text-ink-500">
        We'll confirm the exact crew arrival window by message once your booking
        is received. Same-day turnovers are subject to availability.
      </p>
    </div>
  );
}

export default ScheduleStep;
