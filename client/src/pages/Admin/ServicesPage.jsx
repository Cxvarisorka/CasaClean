import { useMemo, useState } from "react";
import { Sparkles, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
 * Services management
 * -------------------
 * Full CRUD over the service catalog: multilingual name/description, pricing,
 * the live enable/disable toggle, and the cities each service is offered in
 * (chosen from the cities collection).
 */

const eur = (n) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    n || 0
  );

const API = import.meta.env.VITE_API_BASE_URL;

export default function ServicesPage() {
  const { items, create, update, remove } = useCollection("services");
  const { items: cities } = useCollection("cities");
  const { t } = useTranslation();
  const [editing, setEditing] = useState(undefined); // undefined=closed, null=create, obj=edit
  const [deleting, setDeleting] = useState(null);

  // City options for the multiselect + a lookup to render names in the table.
  const cityOptions = useMemo(
    () => cities.map((c) => ({ value: c._id, label: c.name })),
    [cities]
  );
  const cityName = useMemo(
    () => Object.fromEntries(cities.map((c) => [c._id, c.name])),
    [cities]
  );

  const fields = useMemo(
    () => [
      { name: "name", label: t("admin.services.field.name"), required: true },
      { name: "price_per_hour", label: t("admin.services.field.pricePerHour"), type: "number", required: true },
      { name: "description", label: t("admin.services.field.description"), type: "textarea", required: true, full: true },
      { name: "name_it", label: t("admin.services.field.nameIt") },
      { name: "name_ka", label: t("admin.services.field.nameKa") },
      { name: "description_it", label: t("admin.services.field.descriptionIt"), type: "textarea", full: true },
      { name: "description_ka", label: t("admin.services.field.descriptionKa"), type: "textarea", full: true },
      {
        name: "cities",
        label: t("admin.services.field.cities"),
        type: "multiselect",
        options: cityOptions,
        hint: t("admin.services.field.citiesHint"),
        full: true,
      },
      { name: "popular", label: t("admin.services.field.popular"), type: "switch" },
      { name: "enabled", label: t("admin.services.field.enabled"), type: "switch" },
    ],
    [cityOptions, t]
  );

  const handleSubmit = async (values) => {

    console.log(values);

    try {
      if (editing) { 

        update(editing._id, values);

      } else {
          const req = await fetch(`${API}/service`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values)
          })

          const res = await req.json();

          if (!req.ok) throw new Error(res.message || "Failed to create service");
          create(values);
      }
      setEditing(undefined);
    } catch(err) {
      console.log(err);
    }
    
  };

  const columns = [
    {
      key: "name",
      header: t("admin.services.col.service"),
      render: (s) => (
        <div>
          <p className="font-semibold text-ink-900">{s.name}</p>
          {s.name_it && <p className="text-caption text-ink-400">{s.name_it}</p>}
        </div>
      ),
    },
    {
      key: "price_per_hour",
      header: t("admin.services.col.pricePerHr"),
      render: (s) => <span className="font-medium">{eur(s.price_per_hour)}</span>,
    },
    {
      key: "cities",
      header: t("admin.services.col.cities"),
      render: (s) => {
        const ids = Array.isArray(s.cities) ? s.cities : [];
        if (ids.length === 0) return <span className="text-ink-300">—</span>;
        const names = ids.map((id) => cityName[id]).filter(Boolean);
        const shown = names.slice(0, 2).join(", ");
        return (
          <span className="text-ink-600">
            {shown}
            {names.length > 2 && (
              <span className="text-ink-400"> +{names.length - 2}</span>
            )}
          </span>
        );
      },
    },
    {
      key: "popular",
      header: t("admin.services.col.popular"),
      align: "center",
      render: (s) =>
        s.popular ? (
          <Badge variant="accent" size="sm">
            {t("admin.services.popular")}
          </Badge>
        ) : (
          <span className="text-ink-300">—</span>
        ),
    },
    {
      key: "enabled",
      header: t("admin.services.col.status"),
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
        icon={Sparkles}
        title={t("admin.services.title")}
        description={t("admin.services.description")}
        actions={
          <Button size="sm" leftIcon={Plus} onClick={() => setEditing(null)}>
            {t("admin.services.add")}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={items}
        searchKeys={["name", "name_it", "name_ka"]}
        searchPlaceholder={t("admin.services.search")}
        emptyTitle={t("admin.services.emptyTitle")}
        emptyDescription={t("admin.services.emptyDescription")}
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
        title={editing ? t("admin.services.editTitle") : t("admin.services.addTitle")}
        description={t("admin.form.translationsFallback")}
        fields={fields}
        initialValues={editing || { enabled: true, cities: [] }}
        submitLabel={editing ? t("admin.form.saveChanges") : t("admin.form.create")}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          remove(deleting._id);
          setDeleting(null);
        }}
        title={t("admin.services.deleteTitle")}
        description={t("admin.form.deleteConfirm", { name: deleting?.name })}
        confirmLabel={t("admin.action.delete")}
        danger
      />
    </div>
  );
}
