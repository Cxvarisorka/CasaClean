import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { useTranslation } from "@/i18n";
import { downscaleImage } from "@/utils/downscaleImage";
import { assetUrl } from "@/services/api";
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
 *          "multiselect" | "image" | "list" | "i18n"
 *
 * The "i18n" type edits the same group of text fields in several languages —
 * one language at a time, so five languages cost no more screen space than one.
 * Its config adds { locales, baseLocale, subfields } and its value is keyed by
 * locale code: { en: { name, … }, ka: { name, … } }. See TranslationsField.
 */

const buildInitialState = (fields, initialValues) =>
  fields.reduce((acc, f) => {
    const fromValues = initialValues?.[f.name];
    if (fromValues !== undefined && fromValues !== null) acc[f.name] = fromValues;
    else if (f.type === "switch") acc[f.name] = false;
    else if (f.type === "multiselect" || f.type === "list") acc[f.name] = [];
    else if (f.type === "i18n") acc[f.name] = {};
    else acc[f.name] = "";
    return acc;
  }, {});

/* Is a single localized subfield value empty? (a list counts its real rows) */
const isSubfieldEmpty = (subfield, value) =>
  subfield.type === "list"
    ? !Array.isArray(value) || value.filter((x) => String(x).trim()).length === 0
    : !String(value ?? "").trim();

/**
 * Validate an "i18n" field. Only the base language is ever required: a
 * translation left blank is a legitimate state — the site falls back to the
 * base text — so a half-translated language must never block a save.
 *
 * Returns { locale, fields: { subfield: message } } or null when valid, so the
 * field can jump straight to the offending language.
 */
const validateI18n = (field, value, t) => {
  const base = value?.[field.baseLocale] ?? {};
  const fields = {};

  for (const subfield of field.subfields) {
    if (!subfield.required) continue;
    if (isSubfieldEmpty(subfield, base[subfield.name])) {
      fields[subfield.name] = t("admin.form.required", { label: subfield.label });
    }
  }

  return Object.keys(fields).length ? { locale: field.baseLocale, fields } : null;
};

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
      // A localized group carries its own per-language requirements.
      if (f.type === "i18n") {
        const invalid = validateI18n(f, values[f.name], t);
        if (invalid) nextErrors[f.name] = invalid;
        continue;
      }
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

          if (f.type === "i18n") {
            return (
              <div key={f.name} className={cn("sm:col-span-2", span)}>
                <TranslationsField
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
 * A file picker that downscales the chosen image client-side, then holds it as
 * a File until the form is submitted — the API stores it in its uploads folder
 * and the record keeps a path.
 *
 * So the value is one of three things:
 *   - a File   — freshly picked, not uploaded yet (preview via an object URL),
 *   - a string — the path/URL already stored on the record (resolved against
 *                the API origin for display),
 *   - ""       — no image / cleared.
 */
function ImageField({ field, value, error, onChange }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  // A pending File isn't addressable, so give it a temporary object URL and
  // revoke it as soon as the value changes or the modal unmounts.
  const objectUrl = useMemo(
    () => (value instanceof File ? URL.createObjectURL(value) : ""),
    [value]
  );
  useEffect(() => {
    if (!objectUrl) return undefined;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const previewSrc = objectUrl || assetUrl(value);

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setLocalError("");
    try {
      onChange(await downscaleImage(file));
    } catch (err) {
      setLocalError(
        t(err.code ? `admin.imageError.${err.code}` : "admin.imageError.processFailed")
      );
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

      {previewSrc ? (
        <div className="group relative overflow-hidden rounded-xl border border-ink-200">
          <img
            src={previewSrc}
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

/*
 * TranslationsField
 * -----------------
 * Edits one group of text fields across every supported language *one language
 * at a time*. Showing all five at once would mean ~20 inputs in the dialog; here
 * the admin picks a language from the chip row and only that language's fields
 * are on screen, with "next language" walking through them in order.
 *
 * The base language is the source of truth: it is the only one that is required,
 * and each of its values is shown above the matching translation input as the
 * text being translated (and used as the input's placeholder), so the admin
 * never has to switch back to remember the original. Anything left blank in a
 * translation falls back to the base text on the public site, which is what
 * makes a half-finished language safe to save.
 *
 * value: { [localeCode]: { [subfieldName]: string | string[] } }
 */
function TranslationsField({ field, value, error, onChange }) {
  const { t } = useTranslation();
  const { locales, baseLocale, subfields } = field;
  const content = value && typeof value === "object" ? value : {};

  const [active, setActive] = useState(baseLocale);

  // A failed save always concerns the base language — jump to it so the admin
  // sees the field the message is about instead of an unrelated translation.
  // Adjusted during render (React's documented alternative to a setState in an
  // effect) and only when a *new* error arrives, so switching language
  // afterwards still works.
  const [shownError, setShownError] = useState(null);
  if (error !== shownError) {
    setShownError(error);
    if (error?.locale) setActive(error.locale);
  }

  const baseContent = content[baseLocale] ?? {};
  const activeContent = content[active] ?? {};
  const isBase = active === baseLocale;
  const activeIndex = Math.max(
    0,
    locales.findIndex((l) => l.code === active)
  );
  const activeLanguage = locales[activeIndex];
  const baseLanguage = locales.find((l) => l.code === baseLocale);

  const setSubfield = (name, val) =>
    onChange({ ...content, [active]: { ...activeContent, [name]: val } });

  /*
   * How far along a language is:
   *   done    — everything that exists in the base language has a translation
   *   partial — some of it does
   *   empty   — none of it does
   * A translation is only ever measured against fields the base actually fills,
   * so an optional field the admin left blank everywhere never reads as missing.
   */
  const statusOf = (code) => {
    const entry = content[code] ?? {};

    if (code === baseLocale) {
      const missing = subfields.some(
        (s) => s.required && isSubfieldEmpty(s, entry[s.name])
      );
      return missing ? "partial" : "done";
    }

    const needed = subfields.filter((s) => !isSubfieldEmpty(s, baseContent[s.name]));
    const filled = needed.filter((s) => !isSubfieldEmpty(s, entry[s.name]));
    if (filled.length === 0) return "empty";
    return filled.length === needed.length ? "done" : "partial";
  };

  const translatedCount = locales.filter((l) => statusOf(l.code) === "done").length;

  // Seed the empty fields of this language with the base text, as a starting
  // point to edit over. Fields already translated are left alone.
  const copyFromBase = () => {
    const next = { ...activeContent };
    for (const s of subfields) {
      if (isSubfieldEmpty(s, next[s.name])) {
        const source = baseContent[s.name];
        next[s.name] = Array.isArray(source) ? [...source] : source ?? "";
      }
    }
    onChange({ ...content, [active]: next });
  };

  const clearActive = () => {
    const next = { ...content };
    delete next[active];
    onChange(next);
  };

  const go = (delta) =>
    setActive(locales[(activeIndex + delta + locales.length) % locales.length].code);

  // The base text this input is a translation of, rendered as a reference line.
  const referenceOf = (subfield) => {
    const source = baseContent[subfield.name];
    if (Array.isArray(source)) return source.filter(Boolean).join(" · ");
    return String(source ?? "").trim();
  };

  return (
    <div className="rounded-2xl border border-ink-200">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-200 px-4 py-3">
        <div>
          <span className="block text-body-sm font-semibold text-ink-800">
            {field.label}
          </span>
          <span className="text-body-sm text-ink-500">
            {t("admin.form.i18n.progress", {
              done: translatedCount,
              total: locales.length,
            })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("admin.form.i18n.previous")}
            onClick={() => go(-1)}
          >
            <ArrowLeft className="size-4.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => go(1)}
          >
            {t("admin.form.i18n.next")}
            <ArrowRight className="ml-1 size-4" />
          </Button>
        </div>
      </div>

      {/* Step selector: which language am I writing right now? */}
      <div className="flex flex-wrap gap-2 border-b border-ink-200 px-4 py-3">
        {locales.map((lang) => {
          const status = statusOf(lang.code);
          const isOn = lang.code === active;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setActive(lang.code)}
              aria-pressed={isOn}
              title={t(`admin.form.i18n.status.${status}`)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-body-sm font-medium transition-colors",
                isOn
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-ink-200 text-ink-600 hover:border-brand-300 hover:bg-ink-50"
              )}
            >
              <span aria-hidden="true">{lang.flag}</span>
              <span>{lang.native}</span>
              {status === "done" ? (
                <Check className="size-3.5 text-emerald-600" />
              ) : (
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    status === "partial" ? "bg-amber-500" : "bg-ink-300"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-body-sm text-ink-500">
            {isBase
              ? t("admin.form.i18n.baseHint", { language: activeLanguage?.native })
              : t("admin.form.i18n.translationHint", {
                  language: activeLanguage?.native,
                  base: baseLanguage?.native,
                })}
          </p>
          {!isBase && (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={Copy}
                onClick={copyFromBase}
              >
                {t("admin.form.i18n.copyBase", { base: baseLanguage?.native })}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t("admin.form.i18n.clear")}
                className="text-red-600 hover:bg-red-500/10 hover:text-red-700"
                onClick={clearActive}
              >
                <Trash2 className="size-4.5" />
              </Button>
            </div>
          )}
        </div>

        {subfields.map((subfield) => {
          const reference = isBase ? "" : referenceOf(subfield);
          const fieldError = isBase ? error?.fields?.[subfield.name] : undefined;
          const common = {
            label: subfield.label,
            // Only the base language is mandatory; a translation is always
            // optional, so don't mark it as required in the other languages.
            required: isBase && subfield.required,
            error: fieldError,
            hint: isBase ? subfield.hint : undefined,
          };

          return (
            <div key={subfield.name}>
              {reference && (
                <p className="mb-1.5 rounded-lg bg-ink-50 px-3 py-2 text-body-sm text-ink-500">
                  <span className="font-medium text-ink-600">
                    {baseLanguage?.native}:
                  </span>{" "}
                  {reference}
                </p>
              )}

              {subfield.type === "list" ? (
                <ListField
                  field={{
                    ...subfield,
                    required: common.required,
                    hint: common.hint,
                  }}
                  value={activeContent[subfield.name]}
                  error={fieldError}
                  onChange={(val) => setSubfield(subfield.name, val)}
                />
              ) : subfield.type === "textarea" ? (
                <Textarea
                  {...common}
                  rows={subfield.rows || 3}
                  placeholder={reference || subfield.placeholder}
                  value={activeContent[subfield.name] ?? ""}
                  onChange={(e) => setSubfield(subfield.name, e.target.value)}
                />
              ) : (
                <Input
                  {...common}
                  type="text"
                  placeholder={reference || subfield.placeholder}
                  value={activeContent[subfield.name] ?? ""}
                  onChange={(e) => setSubfield(subfield.name, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ResourceModal;
