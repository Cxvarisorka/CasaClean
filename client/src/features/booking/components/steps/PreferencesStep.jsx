import { useEffect, useMemo } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Icon } from "@/components/shared/Icon";
import { Input } from "@/components/ui/Input";
import { useTranslation } from "@/i18n";
import { useServices } from "@/features/services";
import { useBookingNav } from "../../store/BookingContext";
import { ToggleCard } from "../fields/ToggleCard";
import { useSpecialRequests } from "../../hooks/useSpecialRequests";
import { useCleaningTools } from "../../hooks/useCleaningTools";
import { useCities } from "../../hooks/useCities";
import { MAX_DURATION_HOURS_PART, MAX_MINUTES_PART } from "../../constants";
import { combineDuration, formatDuration } from "../../utils/duration";
import { describeDurationIssue } from "../../utils/timeWindow";

/*
 * PreferencesStep
 * ---------------
 * Step 2 — sizing (duration × cleaners) and the optional add-ons/tools the
 * chosen service unlocks. The service itself is picked in step 1, alongside the
 * city that constrains it; here it's only echoed, with a link back to change it.
 * Multi-selects manage arrays via Controller + ToggleCard.
 *
 * Duration is TYPED, as an Hours field and a Minutes field, because a visit is
 * booked to the minute: 1 h 25 min is an ordinary request, and a dropdown of
 * round numbers silently refuses it. Two plain numeric inputs also beat a
 * free-text "1h 25m" — there is nothing to parse and nothing to mistype — and
 * they open a number pad on a phone. The pair is combined into total minutes at
 * submission (utils/duration.js), which is what the API takes.
 *
 * The city's working day bounds the total: a city open 10:00–15:00 can't hold a
 * six-hour visit whatever the start time, and saying so here is better than
 * letting the customer pick a date first and be refused there. The tighter rule
 * — that the visit fits between the CHOSEN START and closing — needs a start
 * time, so ScheduleStep applies it and the server enforces both.
 */

function toggleInArray(arr = [], value) {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function PreferencesStep() {
  const { t } = useTranslation();
  const {
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext();
  const { goTo } = useBookingNav();
  const { services } = useServices();
  const { data: addons = [] } = useSpecialRequests();
  const { data: cleaningTools = [] } = useCleaningTools();

  // The two duration inputs, combined. Watched rather than read on submit so
  // the summary, the total and the working-hours check all move with the typing.
  const durationHours = useWatch({ control, name: "durationHours" });
  const durationMins = useWatch({ control, name: "durationMins" });
  const cityId = useWatch({ control, name: "cityId" });
  const durationMinutes = combineDuration(durationHours, durationMins);

  const { data: cities = [] } = useCities();
  const city = useMemo(
    () => cities.find((c) => String(c.id) === String(cityId)) ?? null,
    [cities, cityId]
  );

  // The one city rule knowable without a start time: the whole working day has
  // to be long enough to hold the visit. Reported here rather than silently
  // shortening what the customer typed.
  const durationIssue = useMemo(
    () => describeDurationIssue({ city, durationMinutes }),
    [city, durationMinutes]
  );
  const durationIssueMessage = durationIssue
    ? t(`booking.schedule.timeIssue.${durationIssue.code}`, durationIssue.params)
    : null;

  // Step 1 guarantees the chosen service is offered in the chosen city, so all
  // this step needs is to resolve it — for display and to filter the extras.
  const serviceId = useWatch({ control, name: "serviceId" });
  const selectedService = useMemo(
    () => services.find((s) => String(s.id) === String(serviceId)) ?? null,
    [services, serviceId]
  );

  // Only offer the add-ons enabled on the chosen service. Static (non-DB)
  // services and any service set to "all special requests" offer them all;
  // otherwise restrict to the service's explicit special-request ids. Before a
  // service is picked, offer nothing — the choice is what unlocks the add-ons.
  const visibleAddons = useMemo(() => {
    if (!selectedService) return [];
    if (!selectedService.fromDb || selectedService.allSpecialRequests)
      return addons;
    const allowed = new Set(selectedService.specialRequests || []);
    return addons.filter((a) => allowed.has(String(a.value)));
  }, [addons, selectedService]);

  // Drop any previously-selected add-ons the chosen service no longer offers,
  // so a stale selection can't be priced or submitted after switching services.
  useEffect(() => {
    const allowed = new Set(visibleAddons.map((a) => a.value));
    const current = getValues("additionalServices") || [];
    const pruned = current.filter((v) => allowed.has(v));
    if (pruned.length !== current.length) {
      setValue("additionalServices", pruned, { shouldValidate: true });
    }
  }, [visibleAddons, getValues, setValue]);

  // Only offer the cleaning tools usable on the chosen service. The restriction
  // lives on the TOOL side (mirror of the add-ons): a tool with an empty
  // `services` list works everywhere, otherwise the chosen service must be
  // listed. Static (non-DB) services offer every tool — a restricted tool can't
  // reference them anyway. Nothing is offered before a service is picked.
  const visibleTools = useMemo(() => {
    if (!selectedService) return [];
    if (!selectedService.fromDb) return cleaningTools;
    return cleaningTools.filter(
      (t) =>
        t.services.length === 0 || t.services.includes(String(selectedService.id))
    );
  }, [cleaningTools, selectedService]);

  // Same staleness guard for the tools after switching services.
  useEffect(() => {
    const allowed = new Set(visibleTools.map((t) => t.value));
    const current = getValues("cleaningTools") || [];
    const pruned = current.filter((v) => allowed.has(v));
    if (pruned.length !== current.length) {
      setValue("cleaningTools", pruned, { shouldValidate: true });
    }
  }, [visibleTools, getValues, setValue]);

  return (
    <div className="space-y-8">
      {/* The service, decided in step 1 — echoed read-only, with a way back. */}
      <div className="flex items-center gap-3 rounded-xl border border-ink-200 bg-surface p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <Icon name={selectedService?.icon || "Sparkles"} className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-caption text-ink-500">
            {t("booking.preferences.chosenService")}
          </span>
          <span className="block truncate text-body-sm font-semibold text-ink-900">
            {selectedService
              ? selectedService.name
              : t("booking.preferences.noServiceChosen")}
          </span>
        </span>
        <button
          type="button"
          onClick={() => goTo(0)}
          className="shrink-0 text-body-sm font-semibold text-brand-600 transition-colors hover:text-brand-700"
        >
          {t("booking.preferences.changeService")}
        </button>
      </div>

      {/* Sizing */}
      <div className="space-y-2">
        <p className="text-body-sm font-semibold text-ink-800">
          {t("booking.preferences.duration")}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="durationHours"
            render={({ field }) => (
              <Input
                label={t("booking.preferences.durationHours")}
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_DURATION_HOURS_PART}
                step={1}
                required
                value={field.value ?? ""}
                onBlur={field.onBlur}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                error={errors.durationHours?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="durationMins"
            render={({ field }) => (
              <Input
                label={t("booking.preferences.durationMinutes")}
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_MINUTES_PART}
                step={1}
                required
                value={field.value ?? ""}
                onBlur={field.onBlur}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                error={errors.durationMins?.message}
              />
            )}
          />
        </div>
        {/* The combined total, echoed back so the pair reads as one value —
            and the city-day rule when the typed length can't fit at all. */}
        <p
          className={
            durationIssueMessage
              ? "text-caption text-red-600 dark:text-red-400"
              : "text-caption text-ink-400"
          }
        >
          {durationIssueMessage ||
            (formatDuration(t, durationMinutes)
              ? t("booking.preferences.durationTotal", {
                  duration: formatDuration(t, durationMinutes),
                })
              : t("booking.preferences.durationHint"))}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Controller
          control={control}
          name="cleaners"
          render={({ field }) => (
            <Input
              label={t("booking.preferences.cleaners")}
              type="number"
              min={1}
              max={3}
              step={1}
              required
              hint={t("booking.preferences.cleanersHint")}
              value={field.value ?? ""}
              onBlur={field.onBlur}
              onChange={(e) =>
                field.onChange(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              error={errors.cleaners?.message}
            />
          )}
        />
      </div>

      {/* Add-ons — only those enabled on the chosen service (special requests) */}
      {visibleAddons.length > 0 && (
        <Controller
          control={control}
          name="additionalServices"
          render={({ field }) => (
            <div>
              <p className="mb-3 text-body-sm font-semibold text-ink-800">
                {t("booking.fields.addons")}{" "}
                <span className="font-normal text-ink-400">
                  {t("booking.optional")}
                </span>
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleAddons.map((addon) => (
                  <ToggleCard
                    key={addon.value}
                    title={addon.label}
                    price={addon.price}
                    description={addon.description}
                    selected={(field.value || []).includes(addon.value)}
                    onToggle={() => field.onChange(toggleInArray(field.value, addon.value))}
                  />
                ))}
              </div>
            </div>
          )}
        />
      )}

      {/* Cleaning tools — catalogue-backed equipment usable on the chosen service */}
      {visibleTools.length > 0 && (
        <Controller
          control={control}
          name="cleaningTools"
          render={({ field }) => (
            <div>
              <p className="mb-3 text-body-sm font-semibold text-ink-800">
                {t("booking.fields.tools")}{" "}
                <span className="font-normal text-ink-400">
                  {t("booking.optional")}
                </span>
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleTools.map((tool) => (
                  <ToggleCard
                    key={tool.value}
                    title={tool.label}
                    price={tool.price}
                    description={tool.description}
                    selected={(field.value || []).includes(tool.value)}
                    onToggle={() => field.onChange(toggleInArray(field.value, tool.value))}
                  />
                ))}
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}

export default PreferencesStep;
