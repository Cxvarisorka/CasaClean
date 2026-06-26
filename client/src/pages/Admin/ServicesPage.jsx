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
 * Full CRUD over the service catalog (backed by the real API): name,
 * description, price per hour and coverage — either every city, or an explicit
 * set chosen from the cities collection.
 */

const eur = (n) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    n || 0
  );

export default function ServicesPage() {
  const { items, create, update, remove } = useCollection("services");
  const { items: cities } = useCollection("cities");
  const { items: specialRequests } = useCollection("specialRequests");
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

  // Special-request add-ons offered as options for "enabled on this service".
  const specialRequestOptions = useMemo(
    () => specialRequests.map((s) => ({ value: s._id, label: s.name })),
    [specialRequests]
  );

  const fields = useMemo(
    () => [
      {
        name: "image",
        label: t("admin.services.field.image"),
        type: "image",
        hint: t("admin.services.field.imageHint"),
        full: true,
      },
      { name: "name", label: t("admin.services.field.name"), required: true },
      { name: "price_per_hour", label: t("admin.services.field.pricePerHour"), type: "number", required: true },
      {
        name: "subtitle",
        label: t("admin.services.field.subtitle"),
        hint: t("admin.services.field.subtitleHint"),
        placeholder: t("admin.services.field.subtitlePlaceholder"),
        full: true,
      },
      { name: "description", label: t("admin.services.field.description"), type: "textarea", required: true, full: true },
      {
        name: "includes",
        label: t("admin.services.field.includes"),
        type: "list",
        hint: t("admin.services.field.includesHint"),
        placeholder: t("admin.services.field.includesPlaceholder"),
        addLabel: t("admin.services.field.includesAdd"),
        full: true,
      },
      {
        name: "all_cities",
        label: t("admin.services.field.allCities"),
        hint: t("admin.services.field.allCitiesHint"),
        type: "switch",
        full: true,
      },
      {
        name: "cities",
        label: t("admin.services.field.cities"),
        type: "multiselect",
        options: cityOptions,
        hint: t("admin.services.field.citiesHint"),
        full: true,
        // Only pick specific cities when "all cities" is off.
        show: (v) => !v.all_cities,
      },
      {
        name: "all_special_requests",
        label: t("admin.services.field.allSpecialRequests"),
        hint: t("admin.services.field.allSpecialRequestsHint"),
        type: "switch",
        full: true,
      },
      {
        name: "special_requests",
        label: t("admin.services.field.specialRequests"),
        type: "multiselect",
        options: specialRequestOptions,
        hint: t("admin.services.field.specialRequestsHint"),
        full: true,
        // Only pick specific add-ons when "all special requests" is off.
        show: (v) => !v.all_special_requests,
      },
      {
        name: "enabled",
        label: t("admin.services.field.enabled"),
        type: "switch",
        full: true,
      },
    ],
    [cityOptions, specialRequestOptions, t]
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
      header: t("admin.services.col.service"),
      render: (s) => (
        <div className="flex items-center gap-3">
          {s.image ? (
            <img
              src={s.image}
              alt=""
              className="size-11 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-300">
              <Sparkles className="size-5" />
            </span>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-ink-900">{s.name}</p>
            {s.subtitle && (
              <p className="truncate text-body-sm text-ink-500">{s.subtitle}</p>
            )}
          </div>
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
        if (s.all_cities)
          return (
            <Badge variant="brand" size="sm">
              {t("admin.services.allCitiesBadge")}
            </Badge>
          );
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
      key: "enabled",
      header: t("admin.services.col.status"),
      align: "center",
      // A disabled service is hidden from the public site (useServices filters
      // on `enabled`) and can't be booked (the API rejects disabled services).
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
        searchKeys={["name", "description"]}
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
        fields={fields}
        initialValues={
          editing || {
            image: "",
            subtitle: "",
            includes: [],
            all_cities: true,
            cities: [],
            all_special_requests: false,
            special_requests: [],
            enabled: true,
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
        title={t("admin.services.deleteTitle")}
        description={t("admin.form.deleteConfirm", { name: deleting?.name })}
        confirmLabel={t("admin.action.delete")}
        danger
      />
    </div>
  );
}
