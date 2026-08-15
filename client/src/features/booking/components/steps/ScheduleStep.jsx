import { useEffect, useMemo } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useTranslation } from "@/i18n";
import { useServices } from "@/features/services";
import { recurrenceChoices } from "../../constants";
import { formatDuration } from "../../utils/duration";
import { intervalLabel, todayDateString } from "../../utils/recurrence";
import { startWindow } from "../../utils/timeWindow";
import { useStepGuard } from "../../store/BookingContext";
import { useTimeIssue } from "../../hooks/useTimeIssue";
import { useCities } from "../../hooks/useCities";

/*
 * ScheduleStep
 * ------------
 * Step 3 — date and start time. Both are native inputs: the date has min=today
 * so a past day can't be chosen, and the time is TYPED to the minute, because
 * a crew arriving at 12:20 is an ordinary request and a grid of whole hours
 * silently refuses it.
 *
 * Typing means validating rather than enumerating. The CHOSEN CITY's working
 * hours and the chosen duration define a window (utils/timeWindow.js) — the
 * step shows it as the allowed range, marks the input's own min/max, and blocks
 * Continue through a step guard while the entered time falls outside it. All
 * three rules mirror `assertBookingWindow` server-side, so the wizard reports
 * the problem here instead of at the payment step.
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
    setError,
    setFocus,
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

  const durationLabel = formatDuration(t, hours);

  // The range this booking may start in. null = the duration doesn't fit the
  // city's day at all (or no city yet), which is a different message.
  const startRange = useMemo(() => startWindow({ city, hours }), [city, hours]);

  // Re-derived whenever the inputs change, so a time that stops fitting — the
  // customer lengthens the booking, switches city, or picks today — reports
  // itself immediately. The value is deliberately NOT cleared: silently emptying
  // a field the customer typed reads as a bug, and the message says exactly what
  // to change.
  const { message: timeIssueMessage, describe } = useTimeIssue({
    city,
    hours,
    date,
    time,
  });

  // Block Continue while the entered time can't be booked. Re-checked at the
  // press rather than reused from the render above, because one of the rules is
  // "not already past" — true when the customer typed it, false ten minutes
  // later. Setting the form error too puts the field in the same state as any
  // other failure, so it's styled and announced like one.
  useStepGuard("schedule", () => {
    const { issue, message } = describe();
    if (!issue) return true;
    setError("time", { type: "manual", message: message ?? "" });
    setFocus("time");
    return false;
  });

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

      <Input
        label={t("booking.schedule.time")}
        type="time"
        // Any minute is bookable, so the picker must not round to the hour.
        step={60}
        // Advisory only — the browser's own bounds help the spinner land in
        // range, but the guard above is what actually decides.
        min={startRange?.earliest}
        max={startRange?.latest}
        required
        hint={
          startRange
            ? t("booking.schedule.timeHint", {
                earliest: startRange.earliest,
                latest: startRange.latest,
                duration: durationLabel,
              })
            : city
            ? t("booking.schedule.noRoomHint", {
                city: city.name,
                start: city.workingHourStarts,
                end: city.workingHourEnds,
              })
            : t("booking.schedule.noCity")
        }
        error={errors.time?.message || timeIssueMessage || undefined}
        {...register("time")}
      />

      {city && (
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
