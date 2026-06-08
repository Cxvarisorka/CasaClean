import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/cn";

/*
 * ResourceModal
 * -------------
 * A schema-driven form dialog that powers every create/edit flow in the panel.
 * Pages pass a declarative `fields` config and an `initialValues` object; this
 * component owns the local form state, light validation and layout, then hands
 * a clean values object back via `onSubmit`. Numbers are coerced and required
 * fields are enforced before submit.
 *
 *   fields: [{ name, label, type, options?, required?, hint?, placeholder?,
 *              rows?, full? }]
 *   type ∈ "text" | "email" | "number" | "textarea" | "select" | "switch"
 */

const buildInitialState = (fields, initialValues) =>
  fields.reduce((acc, f) => {
    const fromValues = initialValues?.[f.name];
    if (fromValues !== undefined && fromValues !== null) acc[f.name] = fromValues;
    else if (f.type === "switch") acc[f.name] = false;
    else if (f.type === "multiselect") acc[f.name] = [];
    else acc[f.name] = "";
    return acc;
  }, {});

export function ResourceModal({
  open,
  onClose,
  onSubmit,
  title,
  description,
  fields,
  initialValues,
  submitLabel,
  size = "xl",
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} type="button">
            {t("admin.form.cancel")}
          </Button>
          <Button size="sm" type="submit" form="resource-form">
            {submitLabel || t("admin.form.create")}
          </Button>
        </>
      }
    >
      {/* Keyed so the form fully remounts (fresh state) per edited record,
          which avoids any setState-in-effect re-seeding. */}
      {open && (
        <ResourceForm
          key={initialValues?._id ?? "new"}
          fields={fields}
          initialValues={initialValues}
          onSubmit={onSubmit}
        />
      )}
    </Modal>
  );
}

/* The actual form — its initial state is derived once at mount from props. */
function ResourceForm({ fields, initialValues, onSubmit }) {
  const { t } = useTranslation();
  const [values, setValues] = useState(() =>
    buildInitialState(fields, initialValues)
  );
  const [errors, setErrors] = useState({});

  const setField = (name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  };

  // A field may declare `show: (values) => boolean` to render conditionally
  // (e.g. hide the cities picker while "all cities" is enabled). Hidden fields
  // are neither rendered nor validated.
  const isVisible = (f) => typeof f.show !== "function" || f.show(values);
  const visibleFields = fields.filter(isVisible);

  const handleSubmit = (e) => {
    e.preventDefault();

    const nextErrors = {};
    for (const f of visibleFields) {
      if (!f.required || f.type === "switch") continue;
      const val = values[f.name];
      const empty =
        f.type === "multiselect"
          ? !Array.isArray(val) || val.length === 0
          : val === "" || val === undefined || val === null;
      if (empty) nextErrors[f.name] = t("admin.form.required", { label: f.label });
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    // Coerce number fields so the store keeps real numbers.
    const clean = { ...values };
    for (const f of fields) {
      if (f.type === "number" && clean[f.name] !== "" && clean[f.name] != null) {
        clean[f.name] = Number(clean[f.name]);
      }
    }

    onSubmit(clean);
  };

  return (
    <form
      id="resource-form"
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
    >
      {visibleFields.map((f) => {
          const common = {
            label: f.label,
            required: f.required,
            hint: f.hint,
            error: errors[f.name],
          };
          const span = f.full ? "sm:col-span-2" : "";

          if (f.type === "multiselect") {
            const selected = Array.isArray(values[f.name]) ? values[f.name] : [];
            const toggle = (val) =>
              setField(
                f.name,
                selected.includes(val)
                  ? selected.filter((v) => v !== val)
                  : [...selected, val]
              );
            return (
              <div key={f.name} className={cn("sm:col-span-2", span)}>
                <span className="mb-1.5 block text-body-sm font-semibold text-ink-800">
                  {f.label}
                  {f.required && <span className="ml-0.5 text-brand-600">*</span>}
                </span>
                {(f.options || []).length === 0 ? (
                  <p className="rounded-xl border border-dashed border-ink-200 px-4 py-3 text-body-sm text-ink-500">
                    {t("admin.form.noOptions")}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {f.options.map((opt) => {
                      const isOn = selected.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggle(opt.value)}
                          aria-pressed={isOn}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-body-sm font-medium transition-colors",
                            isOn
                              ? "border-brand-600 bg-brand-50 text-brand-700"
                              : "border-ink-200 text-ink-600 hover:border-brand-300 hover:bg-ink-50"
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {errors[f.name] ? (
                  <p className="mt-1.5 text-body-sm text-red-600">{errors[f.name]}</p>
                ) : (
                  f.hint && <p className="mt-1.5 text-body-sm text-ink-500">{f.hint}</p>
                )}
              </div>
            );
          }

          if (f.type === "switch") {
            return (
              <div
                key={f.name}
                className={cn(
                  "flex items-center rounded-xl border border-ink-200 px-4 py-3",
                  span
                )}
              >
                <Switch
                  label={f.label}
                  description={f.hint}
                  checked={Boolean(values[f.name])}
                  onChange={(e) => setField(f.name, e.target.checked)}
                  containerClassName="w-full"
                />
              </div>
            );
          }

          if (f.type === "textarea") {
            return (
              <div key={f.name} className={span}>
                <Textarea
                  {...common}
                  rows={f.rows || 3}
                  placeholder={f.placeholder}
                  value={values[f.name] ?? ""}
                  onChange={(e) => setField(f.name, e.target.value)}
                />
              </div>
            );
          }

          if (f.type === "select") {
            return (
              <div key={f.name} className={span}>
                <Select
                  {...common}
                  options={f.options}
                  placeholder={f.placeholder}
                  value={values[f.name] ?? ""}
                  onChange={(e) => setField(f.name, e.target.value)}
                />
              </div>
            );
          }

          return (
            <div key={f.name} className={span}>
              <Input
                {...common}
                type={f.type || "text"}
                placeholder={f.placeholder}
                value={values[f.name] ?? ""}
                onChange={(e) => setField(f.name, e.target.value)}
              />
            </div>
          );
        })}
    </form>
  );
}

export default ResourceModal;
