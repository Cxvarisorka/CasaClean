import { useState } from "react";
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

/*
 * Cities management
 * -----------------
 * CRUD over service coverage areas: translated names, working days/hours and
 * an availability toggle that controls whether the city appears in booking.
 */

const DAY_LABELS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const formatDays = (csv = "") =>
  csv
    .split(",")
    .map((d) => DAY_LABELS[Number(d.trim())])
    .filter(Boolean)
    .join(", ");

const FIELDS = [
  { name: "name", label: "Name (English)", required: true },
  { name: "name_it", label: "Name (Italian)" },
  { name: "name_ka", label: "Name (Georgian)" },
  {
    name: "working_days",
    label: "Working days",
    placeholder: "1,2,3,4,5,6",
    hint: "Comma-separated, 1 = Monday … 7 = Sunday",
    full: true,
  },
  { name: "working_hours_start", label: "Opens at", placeholder: "09:00" },
  { name: "working_hours_end", label: "Closes at", placeholder: "18:00" },
  { name: "enabled", label: "Available for booking", type: "switch" },
];

export default function CitiesPage() {
  const { items, create, update, remove } = useCollection("cities");
  const [editing, setEditing] = useState(undefined);
  const [deleting, setDeleting] = useState(null);

  const handleSubmit = (values) => {
    if (editing) update(editing._id, values);
    else create(values);
    setEditing(undefined);
  };

  const columns = [
    {
      key: "name",
      header: "City",
      render: (c) => (
        <div>
          <p className="font-semibold text-ink-900">{c.name}</p>
          {c.name_it && <p className="text-caption text-ink-400">{c.name_it}</p>}
        </div>
      ),
    },
    {
      key: "working_days",
      header: "Working days",
      render: (c) => <span className="text-ink-600">{formatDays(c.working_days) || "—"}</span>,
    },
    {
      key: "working_hours_start",
      header: "Hours",
      render: (c) => (
        <span className="inline-flex items-center gap-1.5 text-ink-600">
          <Clock className="size-4 text-ink-400" />
          {c.working_hours_start} – {c.working_hours_end}
        </span>
      ),
    },
    {
      key: "enabled",
      header: "Status",
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
        title="Cities"
        description="Control where CasaClean operates and the hours bookings are accepted."
        actions={
          <Button size="sm" leftIcon={Plus} onClick={() => setEditing(null)}>
            Add city
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={items}
        searchKeys={["name", "name_it", "name_ka"]}
        searchPlaceholder="Search cities…"
        emptyTitle="No cities yet"
        emptyDescription="Add a city to open it for bookings."
        actions={(c) => (
          <>
            <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing(c)}>
              <Pencil className="size-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete"
              className="text-red-600 hover:bg-red-50"
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
        title={editing ? "Edit city" : "Add city"}
        fields={FIELDS}
        initialValues={
          editing || {
            enabled: true,
            working_days: "1,2,3,4,5,6",
            working_hours_start: "09:00",
            working_hours_end: "18:00",
          }
        }
        submitLabel={editing ? "Save changes" : "Create city"}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          remove(deleting._id);
          setDeleting(null);
        }}
        title="Delete city"
        description={`Delete "${deleting?.name}"? This can't be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
