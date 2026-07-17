import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const { data: cities = [], isLoading } = useCities();

  return (
    <div className="space-y-5">
      <Select
        label="City"
        placeholder={isLoading ? "Loading cities…" : "Select your city"}
        required
        options={cities.map((c) => ({ value: String(c.id), label: c.name }))}
        error={errors.cityId?.message}
        {...register("cityId")}
      />

      <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
        <Input
          label="Street name"
          placeholder="Via Giovanni Giorgi"
          required
          error={errors.street?.message}
          {...register("street")}
        />
        <Input
          label="House number"
          placeholder="5"
          required
          error={errors.houseNumber?.message}
          {...register("houseNumber")}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Property size (m²)"
          type="number"
          min={1}
          placeholder="40"
          required
          error={errors.propertySize?.message}
          {...register("propertySize")}
        />
        <Input
          label="Name on doorbell"
          placeholder="Who should the crew look for?"
          required
          error={errors.doorbellName?.message}
          {...register("doorbellName")}
        />
      </div>
    </div>
  );
}

export default PropertyStep;
