import { useMemo, useState } from "react";
import { MapPin, Plus, Pencil, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import {
  PageHeader,
  DataTable,
  ResourceModal,
  ConfirmDialog,
  useCollection,
} from "@/features/admin";
import { useTranslation } from "@/i18n";

/*
 * Cities management
 * -----------------
 * CRUD over service coverage areas: translated names, working days/hours and
 * an availability toggle that controls whether the city appears in booking.
 */

export default function CitiesPage() {
  const { items, create, update, remove } = useCollection("cities");
  const { t } = useTranslation();
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);

  const formatDays = (csv = "") =>
    csv
      .split(",")
      .map((d) => {
        const n = Number(d.trim());
        return n >= 1 && n <= 7 ? t(`admin.cities.days.${n}`) : "";
      })
      .filter(Boolean)
      .join(", ");

  const fields = useMemo(
    () => [
      { name: "name", label: t("admin.cities.field.name"), required: true },
      { name: "name_it", label: t("admin.cities.field.nameIt") },
      { name: "name_ka", label: t("admin.cities.field.nameKa") },
      {
        name: "working_days",
        label: t("admin.cities.field.workingDays"),
        placeholder: "1,2,3,4,5,6",
        hint: t("admin.cities.field.workingDaysHint"),
        full: true,
      },
      { name: "working_hours_start", label: t("admin.cities.field.opensAt"), placeholder: "09:00" },
      { name: "working_hours_end", label: t("admin.cities.field.closesAt"), placeholder: "18:00" },
      { name: "enabled", label: t("admin.cities.field.enabled"), type: "switch" },
    ],
    [t]
  );

  const handleSubmit = (values) => {
    if (editing) update(editing._id, values);
    else create(values);
    setEditing(undefined);
  };

  const columns = [
    {
      key: "name",
      header: t("admin.cities.col.city"),
      render: (c) => (
        <div>
          <p className="font-semibold text-ink-900">{c.name}</p>
          {c.name_it && <p className="text-caption text-ink-400">{c.name_it}</p>}
        </div>
      ),
    },
    {
      key: "working_days",
      header: t("admin.cities.col.workingDays"),
      render: (c) => <span className="text-ink-600">{formatDays(c.working_days) || "—"}</span>,
    },
    {
      key: "working_hours_start",
      header: t("admin.cities.col.hours"),
      render: (c) => (
        <span className="inline-flex items-center gap-1.5 text-ink-600">
          <Clock className="size-4 text-ink-400" />
          {c.working_hours_start} – {c.working_hours_end}
        </span>
      ),
    },
    {
      key: "enabled",
      header: t("admin.cities.col.status"),
      align: "center",
      render: (c) => (
        <Switch
          checked={Boolean(c.enabled)}
          onChange={() => update(c._id, { enabled: !c.enabled })}
        />
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={MapPin}
        title={t("admin.cities.title")}
        description={t("admin.cities.description")}
        actions={
          <Button size="sm" leftIcon={Plus} onClick={() => setEditing(null)}>
            {t("admin.cities.add")}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={items}
        searchKeys={["name", "name_it", "name_ka"]}
        searchPlaceholder={t("admin.cities.search")}
        emptyTitle={t("admin.cities.emptyTitle")}
        emptyDescription={t("admin.cities.emptyDescription")}
        actions={(c) => (
          <>
            <Button variant="ghost" size="icon" aria-label={t("admin.action.edit")} onClick={() => setEditing(c)}>
              <Pencil className="size-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("admin.action.delete")}
              className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300"
              onClick={() => setDeleting(c)}
            >
              <Trash2 className="size-4.5" />
            </Button>
          </>
        )}
      />

      <ResourceModal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        onSubmit={handleSubmit}
        title={editing ? t("admin.cities.editTitle") : t("admin.cities.addTitle")}
        fields={fields}
        initialValues={
          editing || {
            enabled: true,
            working_days: "1,2,3,4,5,6",
            working_hours_start: "09:00",
            working_hours_end: "18:00",
          }
        }
        submitLabel={editing ? t("admin.form.saveChanges") : t("admin.form.create")}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          remove(deleting._id);
          setDeleting(null);
        }}
        title={t("admin.cities.deleteTitle")}
        description={t("admin.form.deleteConfirm", { name: deleting?.name })}
        confirmLabel={t("admin.action.delete")}
        danger
      />
    </div>
  );
}
