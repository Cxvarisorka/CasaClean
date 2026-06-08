import { useEffect, useMemo } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Icon } from "@/components/shared/Icon";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { useServices } from "@/features/services";
import { OptionGroup } from "../fields/OptionGroup";
import { ToggleCard } from "../fields/ToggleCard";
import { useSpecialRequests } from "../../hooks/useSpecialRequests";
import { SUPPLY_OPTIONS, HOURS_RANGE } from "../../constants";

/*
 * PreferencesStep
 * ---------------
 * Step 2 — the heart of the configurator: choose a service, sizing (hours ×
 * cleaners) and optional add-ons/supplies. Single-selects use a Controller with
 * OptionGroup; multi-selects manage arrays via Controller + ToggleCard.
 */

function toggleInArray(arr = [], value) {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function PreferencesStep() {
  const {
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext();
  const { services } = useServices();
  const { data: addons = [] } = useSpecialRequests();

  // The city is chosen in the previous step; only services available in that
  // city may be offered. Static (non-DB) services and services set to "all
  // cities" are available everywhere; otherwise the city must be in the
  // service's explicit city list.
  const cityId = useWatch({ control, name: "cityId" });
  const availableServices = useMemo(() => {
    if (!cityId) return services;
    return services.filter(
      (s) =>
        !s.fromDb || s.allCities || (s.cities || []).includes(String(cityId))
    );
  }, [services, cityId]);

  // The currently chosen service drives which add-ons are offered.
  const serviceId = useWatch({ control, name: "serviceId" });
  const selectedService = useMemo(
    () => availableServices.find((s) => String(s.id) === String(serviceId)),
    [availableServices, serviceId]
  );

  // If switching city makes the chosen service unavailable, clear it so the
  // user can't book a service that isn't offered in their city.
  useEffect(() => {
    if (serviceId && !selectedService) {
      setValue("serviceId", "", { shouldValidate: true });
    }
  }, [serviceId, selectedService, setValue]);

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

  return (
    <div className="space-y-8">
      {/* Service */}
      <Controller
        control={control}
        name="serviceId"
        render={({ field }) => (
          <fieldset>
            <legend className="mb-3 text-body-sm font-semibold text-ink-800">
              Choose a service <span className="text-brand-600">*</span>
            </legend>
            {availableServices.length === 0 && (
              <p className="rounded-xl border border-dashed border-ink-200 px-4 py-3 text-body-sm text-ink-500">
                No services are available in the selected city yet. Try choosing
                a different city.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {availableServices.map((service) => {
                const selected = String(field.value) === String(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => field.onChange(String(service.id))}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
                      selected
                        ? "border-brand-600 bg-brand-50 ring-2 ring-brand-500/15"
                        : "border-ink-200 bg-surface hover:border-brand-300"
                    )}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-brand-600 shadow-soft">
                      <Icon name={service.icon} className="size-5" />
                    </span>
                    <span>
                      <span className="block text-body-sm font-semibold text-ink-900">
                        {service.name}
                      </span>
                      <span className="block text-caption text-ink-500">
                        {formatCurrency(service.pricePerHour)}/hr
                        {service.tagline ? ` · ${service.tagline}` : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.serviceId && (
              <p className="mt-1.5 text-body-sm text-red-600">
                {errors.serviceId.message}
              </p>
            )}
          </fieldset>
        )}
      />

      {/* Sizing */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Controller
          control={control}
          name="hours"
          render={({ field }) => (
            <OptionGroup
              label="Estimated hours"
              options={HOURS_RANGE.map((h) => ({ value: h, label: `${h}h` }))}
              value={field.value}
              onChange={(v) => field.onChange(Number(v))}
              columns={3}
              error={errors.hours?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="cleaners"
          render={({ field }) => (
            <Input
              label="Number of cleaners"
              type="number"
              min={1}
              max={3}
              step={1}
              required
              hint="Between 1 and 3 cleaners"
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
                Add-ons <span className="font-normal text-ink-400">(optional)</span>
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

      {/* Supplies */}
      <Controller
        control={control}
        name="supplies"
        render={({ field }) => (
          <div>
            <p className="mb-3 text-body-sm font-semibold text-ink-800">
              We should bring{" "}
              <span className="font-normal text-ink-400">(optional)</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {SUPPLY_OPTIONS.map((supply) => (
                <ToggleCard
                  key={supply.value}
                  title={supply.label}
                  selected={(field.value || []).includes(supply.value)}
                  onToggle={() => field.onChange(toggleInArray(field.value, supply.value))}
                />
              ))}
            </div>
          </div>
        )}
      />
    </div>
  );
}

export default PreferencesStep;
