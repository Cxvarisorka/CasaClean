import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useTranslation } from "@/i18n";
import { useCities } from "../../hooks/useCities";

/*
 * PropertyStep
 * ------------
 * Step 1 — where the turnover happens. Fields map directly to the backend
 * booking model (city_id, street_name, house_number, property_size,
 * doorbell_name). Reads/writes the shared RHF form via context. The city list
 * is loaded live from the database (enabled cities only).
 */

export function PropertyStep() {
  const { t } = useTranslation();
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const { data: cities = [], isLoading } = useCities();

  return (
    <div className="space-y-5">
      <Select
        label={t("booking.property.city")}
        placeholder={
          isLoading
            ? t("booking.property.cityLoading")
            : t("booking.property.cityPlaceholder")
        }
        required
        options={cities.map((c) => ({ value: String(c.id), label: c.name }))}
        error={errors.cityId?.message}
        {...register("cityId")}
      />

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
    </div>
  );
}

export default PropertyStep;
