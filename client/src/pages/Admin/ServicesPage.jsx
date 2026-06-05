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
      { name: "name", label: "Name (English)", required: true },
      { name: "price_per_hour", label: "Price per hour (€)", type: "number", required: true },
      { name: "description", label: "Description (English)", type: "textarea", required: true, full: true },
      { name: "name_it", label: "Name (Italian)" },
      { name: "name_ka", label: "Name (Georgian)" },
      { name: "description_it", label: "Description (Italian)", type: "textarea", full: true },
      { name: "description_ka", label: "Description (Georgian)", type: "textarea", full: true },
      {
        name: "cities",
        label: "Available in cities",
        type: "multiselect",
        options: cityOptions,
        hint: "Select the cities where this service is offered.",
        full: true,
      },
      { name: "popular", label: "Mark as popular", type: "switch" },
      { name: "enabled", label: "Enabled (visible on site)", type: "switch" },
    ],
    [cityOptions]
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
      header: "Service",
      render: (s) => (
        <div>
          <p className="font-semibold text-ink-900">{s.name}</p>
          {s.name_it && <p className="text-caption text-ink-400">{s.name_it}</p>}
        </div>
      ),
    },
    {
      key: "price_per_hour",
      header: "Price / hr",
      render: (s) => <span className="font-medium">{eur(s.price_per_hour)}</span>,
    },
    {
      key: "cities",
      header: "Cities",
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
      header: "Popular",
      align: "center",
      render: (s) =>
        s.popular ? <Badge variant="accent" size="sm">Popular</Badge> : <span className="text-ink-300">—</span>,
    },
    {
      key: "enabled",
      header: "Status",
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
        title="Services"
        description="Manage the cleaning services, pricing and translations shown across the site."
        actions={
          <Button size="sm" leftIcon={Plus} onClick={() => setEditing(null)}>
            Add service
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={items}
        searchKeys={["name", "name_it", "name_ka"]}
        searchPlaceholder="Search services…"
        emptyTitle="No services yet"
        emptyDescription="Add your first service to get started."
        actions={(s) => (
          <>
            <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing(s)}>
              <Pencil className="size-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete"
              className="text-red-600 hover:bg-red-50"
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
        title={editing ? "Edit service" : "Add service"}
        description="Translations fall back to English when left blank."
        fields={fields}
        initialValues={editing || { enabled: true, cities: [] }}
        submitLabel={editing ? "Save changes" : "Create service"}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          remove(deleting._id);
          setDeleting(null);
        }}
        title="Delete service"
        description={`Delete "${deleting?.name}"? This can't be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
