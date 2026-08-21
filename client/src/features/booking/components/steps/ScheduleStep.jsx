import { useEffect, useMemo } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useTranslation } from "@/i18n";
import { useServices } from "@/features/services";
import { ADVANCE_BOOKING_HOURS, recurrenceChoices } from "../../constants";
import { combineDuration, formatDuration } from "../../utils/duration";
import { intervalLabel } from "../../utils/recurrence";
import { earliestBookableDate, startWindow } from "../../utils/timeWindow";
import { useStepGuard } from "../../store/BookingContext";
import { useTimeIssue } from "../../hooks/useTimeIssue";
import { useCities } from "../../hooks/useCities";

/*
 * ScheduleStep
 * ------------
 * Step 3 — date and start time. Both are native inputs: the date has a `min`
 * that already accounts for the advance notice, so a day that cannot hold a
 * valid start can't be chosen at all, and the time is TYPED to the minute,
 * because a crew arriving at 12:20 is an ordinary request and a grid of whole
 * hours silently refuses it.
 *
 * Typing means validating rather than enumerating. Three things define the
 * bookable window (utils/timeWindow.js): the CHOSEN SERVICE decides whether the
 * 48-hour notice applies at all (`allowInstantBooking` waives it), and the
 * CHOSEN CITY's working hours plus the entered duration decide which minutes of
 * an eligible day are left. The step shows that as the allowed range, marks the
 * input's own min/max, and blocks Continue through a step guard while the
 * entered time falls outside it.
 *
 * The duration is entered a step earlier, so this is also where a duration that
 * no longer fits surfaces: the check re-runs on every change to the date, time,
 * city or duration, and reports "the selected duration exceeds the city's
 * working hours" rather than quietly shortening what the customer typed.
 *
 * Every rule here mirrors `assertBookingWindow` server-side, which is the
 * authority — the wizard just reports the problem before the payment step does.
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
  const durationHours = useWatch({ control, name: "durationHours" });
  const durationMins = useWatch({ control, name: "durationMins" });
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
  // Non-empty also means the service is recurring-ONLY: a service that offers a
  // plan is sold as a plan, so there is no one-time option to fall back to.
  const cadences = useMemo(() => recurrenceChoices(service), [service]);
  const recurringOnly = cadences.length > 0;

  const durationMinutes = combineDuration(durationHours, durationMins);
  const durationLabel = formatDuration(t, durationMinutes);

  // The range this booking may start in. null = the duration doesn't fit the
  // city's day at all (or no city yet), which is a different message. Recomputed
  // whenever the duration changes, so lengthening the visit on the previous step
  // immediately narrows the times offered here.
  const startRange = useMemo(
    () => startWindow({ city, durationMinutes: combineDuration(durationHours, durationMins) }),
    [city, durationHours, durationMins]
  );

  // The first day that can hold a valid start: today for an instant service,
  // otherwise the day the notice period lands on. Recomputed per render rather
  // than memoised on the clock — it only has to be right when the picker opens.
  const earliestDate = earliestBookableDate({ service });

  // Re-derived whenever the inputs change, so a time that stops fitting — the
  // customer lengthens the booking, switches city, or picks today — reports
  // itself immediately. The value is deliberately NOT cleared: silently emptying
  // a field the customer typed reads as a bug, and the message says exactly what
  // to change.
  const { message: timeIssueMessage, describe } = useTimeIssue({
    city,
    service,
    durationMinutes,
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

  // A cadence stops being valid when the customer goes back and switches
  // service — to one that doesn't repeat, or that pins a different set. Snap to
  // something the chosen service actually sells so a stale value can't reach
  // checkout and be rejected: one-time for a one-off service, and the shortest
  // offered cadence for a recurring one, which has no one-time option at all.
  useEffect(() => {
    const chosen = Number(intervalDays) || 0;
    if (!recurringOnly) {
      if (chosen !== 0) setValue("intervalDays", 0, { shouldValidate: true });
      return;
    }
    if (!cadences.includes(chosen)) {
      setValue("intervalDays", cadences[0], { shouldValidate: true });
    }
  }, [cadences, recurringOnly, intervalDays, setValue]);

  // No 0 sentinel: the picker only appears for a recurring-only service, so
  // every option is a real cadence.
  const recurrenceOptions = cadences.map((value) => ({
    value,
    label: intervalLabel(t, value),
  }));

  return (
    <div className="space-y-7">
      <Input
        label={t("booking.schedule.date")}
        type="date"
        min={earliestDate}
        required
        hint={
          service && !service.allowInstantBooking
            ? t("booking.schedule.noticeHint", {
                hours: ADVANCE_BOOKING_HOURS,
                date: earliestDate,
              })
            : service
            ? t("booking.schedule.instantHint")
            : undefined
        }
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

      {/* Only shown for a service that can actually be booked on repeat — and
          such a service is subscription-only, so this picks WHICH plan, never
          whether to have one. A native select rather than a button grid: an
          unrestricted service offers fourteen choices, which is a list, not a
          set of tiles. */}
      {recurringOnly && (
        <>
          <Controller
            control={control}
            name="intervalDays"
            render={({ field }) => (
              <Select
                label={t("booking.schedule.repeat.label")}
                options={recurrenceOptions}
                value={field.value || cadences[0]}
                onBlur={field.onBlur}
                onChange={(e) => field.onChange(Number(e.target.value))}
                error={errors.intervalDays?.message}
                hint={t("booking.schedule.repeat.required")}
              />
            )}
          />

          <p className="rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-body-sm text-brand-800">
            {t("booking.schedule.repeat.hint")}
          </p>
        </>
      )}

      <p className="rounded-xl bg-ink-50 px-4 py-3 text-body-sm text-ink-500">
        {t("booking.schedule.note")}
      </p>
    </div>
  );
}

export default ScheduleStep;
