import { useMemo, useState } from "react";
import { HardHat, Plus, Pencil, Trash2, Mail, Phone } from "lucide-react";
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
 * Workers management
 * ------------------
 * CRUD over the cleaning staff an admin can assign to bookings. Only the full
 * name is required; email and phone are optional. The availability toggle hides
 * a worker from the assignment picker without deleting their record.
 */

export default function WorkersPage() {
  const { items, create, update, remove } = useCollection("workers");
  const { t } = useTranslation();
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);

  const fields = useMemo(
    () => [
      { name: "fullname", label: t("admin.workers.field.fullname"), required: true, full: true },
      { name: "email", label: t("admin.workers.field.email"), type: "email" },
      { name: "phone", label: t("admin.workers.field.phone") },
      { name: "enabled", label: t("admin.workers.field.enabled"), type: "switch" },
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
      key: "fullname",
      header: t("admin.workers.col.worker"),
      render: (w) => <p className="font-semibold text-ink-900">{w.fullname}</p>,
    },
    {
      key: "contact",
      header: t("admin.workers.col.contact"),
      render: (w) => (
        <div className="space-y-0.5 text-ink-600">
          {w.email ? (
            <span className="inline-flex items-center gap-1.5">
              <Mail className="size-4 text-ink-400" />
              {w.email}
            </span>
          ) : null}
          {w.phone ? (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="size-4 text-ink-400" />
              {w.phone}
            </span>
          ) : null}
          {!w.email && !w.phone ? <span className="text-ink-400">—</span> : null}
        </div>
      ),
    },
    {
      key: "enabled",
      header: t("admin.workers.col.status"),
      align: "center",
      render: (w) => (
        <Switch
          checked={Boolean(w.enabled)}
          onChange={() => update(w._id, { enabled: !w.enabled })}
        />
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={HardHat}
        title={t("admin.workers.title")}
        description={t("admin.workers.description")}
        actions={
          <Button size="sm" leftIcon={Plus} onClick={() => setEditing(null)}>
            {t("admin.workers.add")}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={items}
        searchKeys={["fullname", "email", "phone"]}
        searchPlaceholder={t("admin.workers.search")}
        emptyTitle={t("admin.workers.emptyTitle")}
        emptyDescription={t("admin.workers.emptyDescription")}
        actions={(w) => (
          <>
            <Button variant="ghost" size="icon" aria-label={t("admin.action.edit")} onClick={() => setEditing(w)}>
              <Pencil className="size-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("admin.action.delete")}
              className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300"
              onClick={() => setDeleting(w)}
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
        title={editing ? t("admin.workers.editTitle") : t("admin.workers.addTitle")}
        fields={fields}
        initialValues={editing || { enabled: true }}
        submitLabel={editing ? t("admin.form.saveChanges") : t("admin.form.create")}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          remove(deleting._id);
          setDeleting(null);
        }}
        title={t("admin.workers.deleteTitle")}
        description={t("admin.form.deleteConfirm", { name: deleting?.fullname })}
        confirmLabel={t("admin.action.delete")}
        danger
      />
    </div>
  );
}
