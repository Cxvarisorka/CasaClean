import { useMemo, useState } from "react";
import { CalendarCheck, Plus, Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import {
  PageHeader,
  DataTable,
  ResourceModal,
  ConfirmDialog,
  BOOKING_STATUS_META,
  useCollection,
} from "@/features/admin";

/*
 * Bookings management
 * -------------------
 * Browse, filter and manage the booking pipeline. Status can be changed inline
 * or from the detail drawer; bookings can also be created, edited and deleted.
 */

const eur = (n) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    n || 0
  );

const STATUS_OPTIONS = Object.entries(BOOKING_STATUS_META).map(([value, m]) => ({
  value,
  label: m.label,
}));

const FIELDS = [
  { name: "customer_name", label: "Customer name", required: true },
  { name: "customer_email", label: "Email", type: "email" },
  { name: "customer_phone", label: "Phone" },
  { name: "service_name", label: "Service", required: true },
  { name: "city_name", label: "City", required: true },
  { name: "booking_date", label: "Date", placeholder: "2026-06-12" },
  { name: "booking_time", label: "Time", placeholder: "14:00" },
  { name: "street_name", label: "Street" },
  { name: "house_number", label: "House no." },
  { name: "hours", label: "Hours", type: "number" },
  { name: "cleaners", label: "Cleaners", type: "number" },
  { name: "total_amount", label: "Total (€)", type: "number", required: true },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS, required: true },
  { name: "notes", label: "Notes", type: "textarea", full: true },
];

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-6 border-b border-ink-100 py-2.5 last:border-0">
      <span className="text-body-sm text-ink-400">{label}</span>
      <span className="text-right text-body-sm font-medium text-ink-800">{value || "—"}</span>
    </div>
  );
}

export default function BookingsPage() {
  const { items, create, update, remove } = useCollection("bookings");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState(undefined);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const data = useMemo(
    () => (statusFilter ? items.filter((b) => b.status === statusFilter) : items),
    [items, statusFilter]
  );

  const handleSubmit = (values) => {
    if (editing) update(editing._id, values);
    else create(values);
    setEditing(undefined);
  };

  const columns = [
    {
      key: "customer_name",
      header: "Customer",
      render: (b) => (
        <div>
          <p className="font-semibold text-ink-900">{b.customer_name}</p>
          <p className="text-caption text-ink-400">{b.customer_email}</p>
        </div>
      ),
    },
    {
      key: "service_name",
      header: "Service / City",
      render: (b) => (
        <div>
          <p className="text-ink-800">{b.service_name}</p>
          <p className="text-caption text-ink-400">{b.city_name}</p>
        </div>
      ),
    },
    {
      key: "booking_date",
      header: "Schedule",
      render: (b) => (
        <span className="whitespace-nowrap text-ink-600">
          {b.booking_date} · {b.booking_time}
        </span>
      ),
    },
    {
      key: "total_amount",
      header: "Total",
      render: (b) => <span className="font-semibold">{eur(b.total_amount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (b) => (
        <Select
          options={STATUS_OPTIONS}
          value={b.status}
          onChange={(e) => update(b._id, { status: e.target.value })}
          className="h-9 min-w-[8.5rem]"
        />
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={CalendarCheck}
        title="Bookings"
        description="Track and manage every booking from request to completion."
        actions={
          <Button size="sm" leftIcon={Plus} onClick={() => setEditing(null)}>
            Add booking
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        searchKeys={["customer_name", "customer_email", "service_name", "city_name"]}
        searchPlaceholder="Search bookings…"
        emptyTitle="No bookings"
        emptyDescription="Bookings from the site will appear here."
        filters={
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: "", label: "All statuses" }, ...STATUS_OPTIONS]}
            className="h-11 min-w-[10rem]"
          />
        }
        actions={(b) => (
          <>
            <Button variant="ghost" size="icon" aria-label="View" onClick={() => setViewing(b)}>
              <Eye className="size-4.5" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => setEditing(b)}>
              <Pencil className="size-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete"
              className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300"
              onClick={() => setDeleting(b)}
            >
              <Trash2 className="size-4.5" />
            </Button>
          </>
        )}
      />

      {/* Detail view */}
      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title="Booking details"
        description={viewing?.reference}
        size="lg"
      >
        {viewing && (
          <div className="space-y-1">
            <div className="mb-4 flex items-center justify-between">
              <Badge variant={BOOKING_STATUS_META[viewing.status]?.variant}>
                {BOOKING_STATUS_META[viewing.status]?.label}
              </Badge>
              <span className="text-heading-sm font-bold text-ink-900">
                {eur(viewing.total_amount)}
              </span>
            </div>
            <DetailRow label="Customer" value={viewing.customer_name} />
            <DetailRow label="Email" value={viewing.customer_email} />
            <DetailRow label="Phone" value={viewing.customer_phone} />
            <DetailRow label="Service" value={viewing.service_name} />
            <DetailRow label="City" value={viewing.city_name} />
            <DetailRow
              label="Address"
              value={[viewing.street_name, viewing.house_number].filter(Boolean).join(" ")}
            />
            <DetailRow label="Date & time" value={`${viewing.booking_date} · ${viewing.booking_time}`} />
            <DetailRow label="Hours / cleaners" value={`${viewing.hours || "—"} h · ${viewing.cleaners || "—"}`} />
            <DetailRow label="Property size" value={viewing.property_size ? `${viewing.property_size} m²` : "—"} />
            <DetailRow label="Notes" value={viewing.notes} />
          </div>
        )}
      </Modal>

      <ResourceModal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        onSubmit={handleSubmit}
        title={editing ? "Edit booking" : "Add booking"}
        fields={FIELDS}
        initialValues={editing || { status: "pending" }}
        submitLabel={editing ? "Save changes" : "Create booking"}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          remove(deleting._id);
          setDeleting(null);
        }}
        title="Delete booking"
        description={`Delete the booking for "${deleting?.customer_name}"? This can't be undone.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
