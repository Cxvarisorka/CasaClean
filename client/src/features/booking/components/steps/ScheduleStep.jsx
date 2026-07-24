import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { useTranslation } from "@/i18n";
import { OptionGroup } from "../fields/OptionGroup";
import { RECURRENCE_OPTIONS, TIME_SLOTS } from "../../constants";
import { todayDateString } from "../../utils/recurrence";

/*
 * ScheduleStep
 * ------------
 * Step 3 — date and time. The date uses a native date input (min = today so
 * past dates can't be chosen); the time is a slot picker for a guided feel.
 */

export function ScheduleStep() {
  const { t } = useTranslation();
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext();

  const today = todayDateString();
  const recurrenceOptions = RECURRENCE_OPTIONS.map((value) => ({
    value,
    label:
      value === 0
        ? t("booking.schedule.repeat.oneTime")
        : t("booking.schedule.repeat.everyDays", { days: value }),
  }));

  return (
    <div className="space-y-7">
      <Input
        label={t("booking.schedule.date")}
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
            label={t("booking.schedule.time")}
            options={TIME_SLOTS}
            value={field.value}
            onChange={field.onChange}
            columns={4}
            error={errors.time?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="intervalDays"
        render={({ field }) => (
          <OptionGroup
            label={t("booking.schedule.repeat.label")}
            options={recurrenceOptions}
            value={field.value}
            onChange={field.onChange}
            columns={3}
            error={errors.intervalDays?.message}
          />
        )}
      />

      <p className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-body-sm text-brand-800">
        {t("booking.schedule.repeat.hint")}
      </p>

      <p className="rounded-xl bg-ink-50 px-4 py-3 text-body-sm text-ink-500">
        {t("booking.schedule.note")}
      </p>
    </div>
  );
}

export default ScheduleStep;
