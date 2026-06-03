import { Controller, useFormContext } from "react-hook-form";
import { Icon } from "@/components/shared/Icon";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { SERVICES } from "@/data/services";
import { OptionGroup } from "../fields/OptionGroup";
import { ToggleCard } from "../fields/ToggleCard";
import {
  ADDITIONAL_SERVICES,
  SUPPLY_OPTIONS,
  HOURS_RANGE,
  CLEANERS_RANGE,
} from "../../constants";

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
    formState: { errors },
  } = useFormContext();

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
            <div className="grid gap-3 sm:grid-cols-2">
              {SERVICES.map((service) => {
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
                        {formatCurrency(service.pricePerHour)}/hr · {service.tagline}
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
            <OptionGroup
              label="Number of cleaners"
              options={CLEANERS_RANGE.map((c) => ({ value: c, label: String(c) }))}
              value={field.value}
              onChange={(v) => field.onChange(Number(v))}
              columns={3}
              error={errors.cleaners?.message}
            />
          )}
        />
      </div>

      {/* Add-ons */}
      <Controller
        control={control}
        name="additionalServices"
        render={({ field }) => (
          <div>
            <p className="mb-3 text-body-sm font-semibold text-ink-800">
              Add-ons <span className="font-normal text-ink-400">(optional)</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {ADDITIONAL_SERVICES.map((addon) => (
                <ToggleCard
                  key={addon.value}
                  title={addon.label}
                  price={addon.price}
                  selected={(field.value || []).includes(addon.value)}
                  onToggle={() => field.onChange(toggleInArray(field.value, addon.value))}
                />
              ))}
            </div>
          </div>
        )}
      />

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
