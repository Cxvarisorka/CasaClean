import { useMemo, useState } from "react";
import { Brush, Plus, Pencil, Trash2 } from "lucide-react";
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
 * Cleaning tools management
 * -------------------------
 * CRUD over the tool/supply catalogue (e.g. "Mop", "Vacuum cleaner") backed by
 * the real API. Each tool has a name, optional description, a flat surcharge,
 * the services it can be used on (none selected = every service) and an
 * availability toggle.
 */

const eur = (n) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    Number(n) || 0
  );

export default function CleaningToolsPage() {
  const { items, create, update, remove } = useCollection("cleaningTools");
  const { items: services } = useCollection("services");
  const { t } = useTranslation();
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);

  // Service options for the multiselect + a lookup to render names in the table.
  const serviceOptions = useMemo(
    () => services.map((s) => ({ value: s._id, label: s.name })),
    [services]
  );
  const serviceName = useMemo(
    () => Object.fromEntries(services.map((s) => [s._id, s.name])),
    [services]
  );

  const fields = useMemo(
    () => [
      { name: "name", label: t("admin.cleaningTools.field.name"), required: true },
      { name: "price", label: t("admin.cleaningTools.field.price"), type: "number", required: true },
      { name: "description", label: t("admin.cleaningTools.field.description"), type: "textarea", full: true },
      {
        name: "services",
        label: t("admin.cleaningTools.field.services"),
        type: "multiselect",
        options: serviceOptions,
        hint: t("admin.cleaningTools.field.servicesHint"),
        full: true,
      },
      { name: "enabled", label: t("admin.cleaningTools.field.enabled"), type: "switch" },
    ],
    [serviceOptions, t]
  );

  const handleSubmit = async (values) => {
    const ok = editing
      ? await update(editing._id, values)
      : await create(values);
    if (ok) setEditing(undefined);
  };

  const columns = [
    {
      key: "name",
      header: t("admin.cleaningTools.col.name"),
      render: (tool) => (
        <div>
          <p className="font-semibold text-ink-900">{tool.name}</p>
          {tool.description && (
            <p className="line-clamp-1 text-caption text-ink-400">{tool.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "services",
      header: t("admin.cleaningTools.col.services"),
      render: (tool) =>
        (tool.services ?? []).length === 0 ? (
          <span className="text-ink-500">{t("admin.cleaningTools.allServices")}</span>
        ) : (
          <span>
            {tool.services
              .map((id) => serviceName[id] || "—")
              .join(", ")}
          </span>
        ),
    },
    {
      key: "price",
      header: t("admin.cleaningTools.col.price"),
      render: (tool) => <span className="font-medium">{eur(tool.price)}</span>,
    },
    {
      key: "enabled",
      header: t("admin.cleaningTools.col.status"),
      align: "center",
      render: (tool) => (
        <Switch
          checked={Boolean(tool.enabled)}
          onChange={() => update(tool._id, { enabled: !tool.enabled })}
        />
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Brush}
        title={t("admin.cleaningTools.title")}
        description={t("admin.cleaningTools.description")}
        actions={
          <Button size="sm" leftIcon={Plus} onClick={() => setEditing(null)}>
            {t("admin.cleaningTools.add")}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={items}
        searchKeys={["name", "description"]}
        searchPlaceholder={t("admin.cleaningTools.search")}
        emptyTitle={t("admin.cleaningTools.emptyTitle")}
        emptyDescription={t("admin.cleaningTools.emptyDescription")}
        actions={(tool) => (
          <>
            <Button variant="ghost" size="icon" aria-label={t("admin.action.edit")} onClick={() => setEditing(tool)}>
              <Pencil className="size-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("admin.action.delete")}
              className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300"
              onClick={() => setDeleting(tool)}
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
        title={editing ? t("admin.cleaningTools.editTitle") : t("admin.cleaningTools.addTitle")}
        fields={fields}
        initialValues={editing || { enabled: true, price: 0, services: [] }}
        submitLabel={editing ? t("admin.form.saveChanges") : t("admin.form.create")}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          remove(deleting._id);
          setDeleting(null);
        }}
        title={t("admin.cleaningTools.deleteTitle")}
        description={t("admin.form.deleteConfirm", { name: deleting?.name })}
        confirmLabel={t("admin.action.delete")}
        danger
      />
    </div>
  );
}
