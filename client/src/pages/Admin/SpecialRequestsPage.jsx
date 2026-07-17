import { useMemo, useState } from "react";
import { ListPlus, Plus, Pencil, Trash2 } from "lucide-react";
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
 * Special requests management
 * ---------------------------
 * CRUD over the booking add-on catalogue (e.g. "Fridge cleaning", "Inside
 * oven") backed by the real API. Each item has a name, optional description, a
 * flat surcharge and an availability toggle that controls whether it appears in
 * the booking wizard.
 */

const eur = (n) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    Number(n) || 0
  );

export default function SpecialRequestsPage() {
  const { items, create, update, remove } = useCollection("specialRequests");
  const { t } = useTranslation();
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);

  const fields = useMemo(
    () => [
      { name: "name", label: t("admin.specialRequests.field.name"), required: true },
      { name: "price", label: t("admin.specialRequests.field.price"), type: "number", required: true },
      { name: "description", label: t("admin.specialRequests.field.description"), type: "textarea", full: true },
      { name: "enabled", label: t("admin.specialRequests.field.enabled"), type: "switch" },
    ],
    [t]
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
      header: t("admin.specialRequests.col.name"),
      render: (s) => (
        <div>
          <p className="font-semibold text-ink-900">{s.name}</p>
          {s.description && (
            <p className="line-clamp-1 text-caption text-ink-400">{s.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "price",
      header: t("admin.specialRequests.col.price"),
      render: (s) => <span className="font-medium">{eur(s.price)}</span>,
    },
    {
      key: "enabled",
      header: t("admin.specialRequests.col.status"),
      align: "center",
      render: (s) => (
        <Switch
          checked={Boolean(s.enabled)}
          onChange={() => update(s._id, { enabled: !s.enabled })}
        />
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={ListPlus}
        title={t("admin.specialRequests.title")}
        description={t("admin.specialRequests.description")}
        actions={
          <Button size="sm" leftIcon={Plus} onClick={() => setEditing(null)}>
            {t("admin.specialRequests.add")}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={items}
        searchKeys={["name", "description"]}
        searchPlaceholder={t("admin.specialRequests.search")}
        emptyTitle={t("admin.specialRequests.emptyTitle")}
        emptyDescription={t("admin.specialRequests.emptyDescription")}
        actions={(s) => (
          <>
            <Button variant="ghost" size="icon" aria-label={t("admin.action.edit")} onClick={() => setEditing(s)}>
              <Pencil className="size-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("admin.action.delete")}
              className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300"
              onClick={() => setDeleting(s)}
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
        title={editing ? t("admin.specialRequests.editTitle") : t("admin.specialRequests.addTitle")}
        fields={fields}
        initialValues={editing || { enabled: true, price: 0 }}
        submitLabel={editing ? t("admin.form.saveChanges") : t("admin.form.create")}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          remove(deleting._id);
          setDeleting(null);
        }}
        title={t("admin.specialRequests.deleteTitle")}
        description={t("admin.form.deleteConfirm", { name: deleting?.name })}
        confirmLabel={t("admin.action.delete")}
        danger
      />
    </div>
  );
}
