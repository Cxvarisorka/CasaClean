import { useEffect, useMemo } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useTranslation } from "@/i18n";
import { useServices } from "@/features/services";
import { OptionGroup } from "../fields/OptionGroup";
import { recurrenceChoices } from "../../constants";
import { intervalLabel, todayDateString } from "../../utils/recurrence";
import { bookableTimeSlots } from "../../utils/timeSlots";
import { useCities } from "../../hooks/useCities";

/*
 * ScheduleStep
 * ------------
 * Step 3 — date and time. The date uses a native date input (min = today so
 * past dates can't be chosen); the time is a slot picker for a guided feel.
 *
 * Slots are derived from the CHOSEN CITY's working hours and the chosen
 * duration, not from a fixed list. The server rejects any start outside those
 * hours — and any booking that would run past closing — so a static list
 * guarantees dead options that only fail at the payment step.
 *
 * The frequency picker follows the same rule against the CHOSEN SERVICE: it is
 * hidden entirely for a service that can't repeat, and offers only the cadences
 * that service allows. The server re-checks both (assertRecurrenceAllowed).
 */

export function ScheduleStep() {
  const { t } = useTranslation();
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext();

  const { data: cities = [] } = useCities();
  const { services } = useServices();
  const cityId = useWatch({ control, name: "cityId" });
  const serviceId = useWatch({ control, name: "serviceId" });
  const hours = useWatch({ control, name: "hours" });
  const date = useWatch({ control, name: "date" });
  const time = useWatch({ control, name: "time" });
  const intervalDays = useWatch({ control, name: "intervalDays" });

  const city = useMemo(
    () => cities.find((c) => String(c.id) === String(cityId)),
    [cities, cityId]
  );

  const service = useMemo(
    () => services.find((s) => String(s.id) === String(serviceId)) ?? null,
    [services, serviceId]
  );

  // [] when the chosen service is one-off only; otherwise its allowed cadences.
  const cadences = useMemo(() => recurrenceChoices(service), [service]);

  const slots = useMemo(
    () => bookableTimeSlots({ city, hours, date }),
    [city, hours, date]
  );

  // A slot that was valid can stop being valid: the user lengthens the booking,
  // switches city, or picks today after the slot has passed. Clear it so a stale
  // value can't be carried into checkout and rejected server-side.
  useEffect(() => {
    if (time && !slots.includes(time)) {
      setValue("time", "", { shouldValidate: true });
    }
  }, [slots, time, setValue]);

  // A cadence stops being valid when the customer goes back and switches to a
  // service that doesn't repeat, or that pins a different set of cadences. Fall
  // back to one-time so a stale value can't reach checkout and be rejected.
  useEffect(() => {
    const chosen = Number(intervalDays) || 0;
    if (chosen > 0 && !cadences.includes(chosen)) {
      setValue("intervalDays", 0, { shouldValidate: true });
    }
  }, [cadences, intervalDays, setValue]);

  const today = todayDateString();
  const recurrenceOptions = [0, ...cadences].map((value) => ({
    value,
    label: intervalLabel(t, value),
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
          <>
            {slots.length > 0 ? (
              <OptionGroup
                label={t("booking.schedule.time")}
                options={slots.map((slot) => ({ value: slot, label: slot }))}
                value={field.value}
                onChange={field.onChange}
                columns={4}
                error={errors.time?.message}
              />
            ) : (
              <div>
                <p className="mb-3 text-body-sm font-semibold text-ink-800">
                  {t("booking.schedule.time")}
                </p>
                <p className="rounded-xl border border-dashed border-ink-200 px-4 py-3 text-body-sm text-ink-500">
                  {!city
                    ? t("booking.schedule.noCity")
                    : t("booking.schedule.noSlots")}
                </p>
                {errors.time && (
                  <p className="mt-1.5 text-body-sm text-red-600">
                    {errors.time.message}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      />

      {city && slots.length > 0 && (
        <p className="text-caption text-ink-400">
          {t("booking.schedule.cityHours", {
            city: city.name,
            start: city.workingHourStarts,
            end: city.workingHourEnds,
          })}
        </p>
      )}

      {/* Only shown for a service that can actually be booked on repeat. A
          native select rather than a button grid: an unrestricted service
          offers fifteen choices, which is a list, not a set of tiles. */}
      {cadences.length > 0 && (
        <>
          <Controller
            control={control}
            name="intervalDays"
            render={({ field }) => (
              <Select
                label={t("booking.schedule.repeat.label")}
                options={recurrenceOptions}
                value={field.value ?? 0}
                onBlur={field.onBlur}
                onChange={(e) => field.onChange(Number(e.target.value))}
                error={errors.intervalDays?.message}
              />
            )}
          />

          {Number(intervalDays) > 0 && (
            <p className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-body-sm text-brand-800">
              {t("booking.schedule.repeat.hint")}
            </p>
          )}
        </>
      )}

      <p className="rounded-xl bg-ink-50 px-4 py-3 text-body-sm text-ink-500">
        {t("booking.schedule.note")}
      </p>
    </div>
  );
}

export default ScheduleStep;
