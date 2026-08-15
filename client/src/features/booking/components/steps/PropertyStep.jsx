import { useEffect, useMemo, useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { Icon } from "@/components/shared/Icon";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/utils/formatCurrency";
import { useTranslation } from "@/i18n";
import { useServices } from "@/features/services";
import { useCities } from "../../hooks/useCities";
import { coversCity, servicesForCity } from "../../utils/coverage";

/*
 * PropertyStep
 * ------------
 * Step 1 — the two answers that constrain everything downstream (which city,
 * which service), followed by the address. Fields map directly to the backend
 * booking model; the city list is loaded live from the database.
 *
 * City and service are deliberately co-located, because they constrain each
 * other and splitting them across a step boundary is what used to make a
 * pre-selected service vanish without explanation.
 *
 * The filtering between them is ONE-WAY on purpose:
 *   • the city list is never narrowed — where you live is a fact, and hiding a
 *     city reads as "we don't serve you" when another service may well cover it;
 *   • the service list is narrowed to what the chosen city actually offers.
 * A pre-selected service only *annotates* the city list. If a city change does
 * drop the chosen service we say so and remember it, restoring it as soon as the
 * user picks a city that covers it again.
 */

export function PropertyStep() {
  const { t } = useTranslation();
  const {
    control,
    register,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext();
  const { data: cities = [], isLoading: citiesLoading } = useCities();
  const { services, isLoading: servicesLoading } = useServices();

  const cityId = useWatch({ control, name: "cityId" });
  const serviceId = useWatch({ control, name: "serviceId" });

  // Services offered in the chosen city. Before a city is picked, everything is
  // still on the table.
  const availableServices = useMemo(
    () => servicesForCity(services, cityId),
    [services, cityId]
  );

  const selectedService = useMemo(
    () =>
      availableServices.find((s) => String(s.id) === String(serviceId)) ?? null,
    [availableServices, serviceId]
  );

  // The service a city change forced us to drop. Kept so we can explain what
  // happened instead of silently emptying the field, and so the choice survives
  // a change of mind about the city.
  const [droppedService, setDroppedService] = useState(null);

  // The conflict is born the moment the city changes, so it's resolved right
  // there rather than in an effect — that keeps the explanation synchronous with
  // the user's action (and avoids cascading renders).
  const cityField = register("cityId");
  const handleCityChange = (event) => {
    cityField.onChange(event);
    const nextCityId = event.target.value;

    // Returning to a city that offers the dropped service puts it back.
    if (droppedService && coversCity(droppedService, nextCityId)) {
      setValue("serviceId", String(droppedService.id), { shouldValidate: true });
      setDroppedService(null);
      return;
    }

    const current = services.find(
      (s) => String(s.id) === String(getValues("serviceId"))
    );
    if (!current || coversCity(current, nextCityId)) return;

    // Remember it, then clear — without validating, since the user hasn't done
    // anything wrong; the notice below explains the now-empty field.
    setDroppedService(current);
    setValue("serviceId", "", { shouldValidate: false });
  };

  // Backstop for the one path the handler can't see: a service pre-selected via
  // `/booking?service=<id>` that resolves only once the catalogue arrives, after
  // a city was already chosen. Clears silently — every user-driven conflict is
  // caught above, with an explanation.
  useEffect(() => {
    if (servicesLoading) return;
    if (serviceId && !selectedService) {
      setValue("serviceId", "", { shouldValidate: false });
    }
  }, [servicesLoading, serviceId, selectedService, setValue]);

  // With a service in hand the city list becomes a real decision, so mark the
  // cities that can't host it — never hide them.
  const referenceService = selectedService ?? droppedService;
  const cityOptions = cities.map((c) => {
    const covered = !referenceService || coversCity(referenceService, c.id);
    return {
      value: String(c.id),
      label: covered
        ? c.name
        : `${c.name} (${t("booking.property.cityNotForService")})`,
    };
  });

  const cityName = cities.find((c) => String(c.id) === String(cityId))?.name;

  return (
    <div className="space-y-10">
      {/* What we're booking */}
      <section className="space-y-5">
        <h3 className="text-body-md font-semibold text-ink-900">
          {t("booking.property.groupClean")}
        </h3>

        <Select
          label={t("booking.property.city")}
          placeholder={
            citiesLoading
              ? t("booking.property.cityLoading")
              : t("booking.property.cityPlaceholder")
          }
          required
          options={cityOptions}
          error={errors.cityId?.message}
          {...cityField}
          onChange={handleCityChange}
        />

        {/* The chosen city doesn't offer the service the user arrived with. */}
        {droppedService && (
          <p className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-body-sm text-amber-900">
            <AlertCircle className="mt-0.5 size-4.5 shrink-0" />
            <span>
              {t("booking.property.serviceDropped", {
                service: droppedService.name,
                city: cityName || t("booking.property.thisCity"),
              })}
            </span>
          </p>
        )}

        <Controller
          control={control}
          name="serviceId"
          render={({ field }) => (
            <fieldset>
              <legend className="mb-3 text-body-sm font-semibold text-ink-800">
                {t("booking.property.service")}{" "}
                <span className="text-brand-600">*</span>
              </legend>

              {!servicesLoading && availableServices.length === 0 && (
                <p className="rounded-xl border border-dashed border-ink-200 px-4 py-3 text-body-sm text-ink-500">
                  {cityId
                    ? t("booking.property.noServicesInCity", {
                        city: cityName || t("booking.property.thisCity"),
                      })
                    : t("booking.property.noServices")}
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {availableServices.map((service) => {
                  const selected = String(field.value) === String(service.id);
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => {
                        field.onChange(String(service.id));
                        setDroppedService(null); // choice made — notice resolved
                      }}
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
                          {t("booking.property.perHour", {
                            amount: formatCurrency(service.pricePerHour),
                          })}
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
      </section>

      {/* Where it happens */}
      <section className="space-y-5">
        <h3 className="text-body-md font-semibold text-ink-900">
          {t("booking.property.groupAddress")}
        </h3>

        <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
          <Input
            label={t("booking.property.street")}
            placeholder={t("booking.property.streetPlaceholder")}
            required
            error={errors.street?.message}
            {...register("street")}
          />
          <Input
            label={t("booking.property.houseNumber")}
            placeholder={t("booking.property.houseNumberPlaceholder")}
            required
            error={errors.houseNumber?.message}
            {...register("houseNumber")}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label={t("booking.property.size")}
            type="number"
            min={1}
            placeholder={t("booking.property.sizePlaceholder")}
            required
            error={errors.propertySize?.message}
            {...register("propertySize")}
          />
          <Input
            label={t("booking.property.doorbell")}
            placeholder={t("booking.property.doorbellPlaceholder")}
            required
            error={errors.doorbellName?.message}
            {...register("doorbellName")}
          />
        </div>
      </section>
    </div>
  );
}

export default PropertyStep;
