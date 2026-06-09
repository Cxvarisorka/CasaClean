import { useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { useTranslation } from "@/i18n";
import { downscaleImage } from "@/utils/downscaleImage";
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
 *   type ∈ "text" | "email" | "number" | "textarea" | "select" | "switch" |
 *          "multiselect" | "image" | "list"
 */

const buildInitialState = (fields, initialValues) =>
  fields.reduce((acc, f) => {
    const fromValues = initialValues?.[f.name];
    if (fromValues !== undefined && fromValues !== null) acc[f.name] = fromValues;
    else if (f.type === "switch") acc[f.name] = false;
    else if (f.type === "multiselect" || f.type === "list") acc[f.name] = [];
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
        f.type === "multiselect" || f.type === "list"
          ? !Array.isArray(val) || val.filter((x) => String(x).trim()).length === 0
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

          if (f.type === "image") {
            return (
              <div key={f.name} className={cn("sm:col-span-2", span)}>
                <ImageField
                  field={f}
                  value={values[f.name]}
                  error={errors[f.name]}
                  onChange={(val) => setField(f.name, val)}
                />
              </div>
            );
          }

          if (f.type === "list") {
            return (
              <div key={f.name} className={cn("sm:col-span-2", span)}>
                <ListField
                  field={f}
                  value={values[f.name]}
                  error={errors[f.name]}
                  onChange={(val) => setField(f.name, val)}
                />
              </div>
            );
          }

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

/*
 * ImageField
 * ----------
 * A file picker that downscales the chosen image client-side and stores it as a
 * compact data URL (visual-only — there's no file store yet). Shows a live
 * preview with a remove control.
 */
function ImageField({ field, value, error, onChange }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setLocalError("");
    try {
      onChange(await downscaleImage(file));
    } catch (err) {
      setLocalError(err.message || "Could not process that image.");
    } finally {
      setBusy(false);
    }
  };

  const shownError = error || localError;

  return (
    <div>
      <span className="mb-1.5 block text-body-sm font-semibold text-ink-800">
        {field.label}
        {field.required && <span className="ml-0.5 text-brand-600">*</span>}
      </span>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = ""; // allow re-picking the same file
        }}
      />

      {value ? (
        <div className="group relative overflow-hidden rounded-xl border border-ink-200">
          <img
            src={value}
            alt={field.label}
            className="aspect-[16/10] w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
            >
              {t("admin.form.imageReplace")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="bg-white/90 text-red-600 hover:bg-white"
              onClick={() => onChange("")}
              aria-label={t("admin.form.imageRemove")}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 bg-ink-50 text-ink-500 transition-colors hover:border-brand-400 hover:text-brand-600"
        >
          {busy ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <ImagePlus className="size-6" />
          )}
          <span className="text-body-sm font-medium">
            {busy ? t("admin.form.imageProcessing") : t("admin.form.imageUpload")}
          </span>
        </button>
      )}

      {shownError ? (
        <p className="mt-1.5 text-body-sm text-red-600">{shownError}</p>
      ) : (
        field.hint && <p className="mt-1.5 text-body-sm text-ink-500">{field.hint}</p>
      )}
    </div>
  );
}

/*
 * ListField
 * ---------
 * Edits an array of short strings (e.g. "what this service includes"). Each row
 * is an input with a remove control; an add button appends an empty row.
 */
function ListField({ field, value, error, onChange }) {
  const { t } = useTranslation();
  const items = Array.isArray(value) ? value : [];
  const rows = items.length ? items : [""];

  const update = (next) => onChange(next);
  const setAt = (i, val) => update(rows.map((r, idx) => (idx === i ? val : r)));
  const removeAt = (i) => {
    const next = rows.filter((_, idx) => idx !== i);
    update(next.length ? next : []);
  };
  const add = () => update([...rows, ""]);

  return (
    <div>
      <span className="mb-1.5 block text-body-sm font-semibold text-ink-800">
        {field.label}
        {field.required && <span className="ml-0.5 text-brand-600">*</span>}
      </span>

      <div className="space-y-2">
        {rows.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item}
              placeholder={field.placeholder}
              onChange={(e) => setAt(i, e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("admin.form.listRemove")}
              className="shrink-0 text-red-600 hover:bg-red-500/10 hover:text-red-700"
              onClick={() => removeAt(i)}
            >
              <Trash2 className="size-4.5" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        leftIcon={Plus}
        className="mt-2"
        onClick={add}
      >
        {field.addLabel || t("admin.form.listAdd")}
      </Button>

      {error ? (
        <p className="mt-1.5 text-body-sm text-red-600">{error}</p>
      ) : (
        field.hint && <p className="mt-1.5 text-body-sm text-ink-500">{field.hint}</p>
      )}
    </div>
  );
}

export default ResourceModal;
