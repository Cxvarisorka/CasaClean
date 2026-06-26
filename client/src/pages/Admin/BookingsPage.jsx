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
  PAYMENT_STATUS_META,
  useCollection,
} from "@/features/admin";
import { useTranslation } from "@/i18n";

/*
 * Bookings management
 * -------------------
 * Browse, filter and manage the booking pipeline (backed by the real API).
 * Status can be changed inline or from the edit dialog; bookings can be edited
 * and deleted. Bookings are *created* by customers through the booking wizard
 * (the API ties each booking to the authenticated customer), so there is no
 * admin "add" here.
 */

const eur = (n) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    n || 0
  );

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
  const { items: cities } = useCollection("cities");
  const { items: services } = useCollection("services");
  const { items: users } = useCollection("users");
  const { items: workers } = useCollection("workers");
  const { t } = useTranslation();

  // Bookings store service/city ids; resolve them to names from the catalogues
  // (DB services/cities). Static (non-DB) service ids fall back to the id form.
  const cityNameById = useMemo(
    () => Object.fromEntries(cities.map((c) => [String(c._id), c.name])),
    [cities]
  );
  const serviceNameById = useMemo(
    () => Object.fromEntries(services.map((s) => [String(s._id), s.name])),
    [services]
  );
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState(undefined);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const statusOptions = useMemo(
    () =>
      Object.keys(BOOKING_STATUS_META).map((value) => ({
        value,
        label: t(BOOKING_STATUS_META[value].labelKey),
      })),
    [t]
  );

  // Service/city pickers for the create form. The booking API stores real
  // Service/City ids (the server rejects anything that isn't a valid, enabled
  // id), so an admin must choose from the live catalogues — only enabled
  // entries are offered.
  const serviceOptions = useMemo(
    () =>
      services
        .filter((s) => s.enabled)
        .map((s) => ({ value: s._id, label: s.name })),
    [services]
  );
  const cityOptions = useMemo(
    () =>
      cities.filter((c) => c.enabled).map((c) => ({ value: c._id, label: c.name })),
    [cities]
  );

  // Optional account link for an admin-created booking. The leading blank option
  // means "no linked account" — the booking then lives on the typed contact
  // details alone (walk-in / phone booking).
  const userOptions = useMemo(
    () => [
      { value: "", label: t("admin.bookings.noAccount") },
      ...users.map((u) => ({ value: u._id, label: `${u.fullname} (${u.email})` })),
    ],
    [users, t]
  );

  // Cleaning staff the admin can assign to a booking. Only enabled workers are
  // offered; the server validates the ids fail-closed on save.
  const workerOptions = useMemo(
    () =>
      workers
        .filter((w) => w.enabled)
        .map((w) => ({ value: w._id, label: w.fullname })),
    [workers]
  );

  // Edit only exposes the fields the backend's editBooking endpoint accepts;
  // service/city and the customer identity are fixed once a booking is created.
  const editFields = useMemo(
    () => [
      { name: "status", label: t("admin.bookings.field.status"), type: "select", options: statusOptions, required: true },
      { name: "customer_phone", label: t("admin.bookings.field.phone") },
      { name: "booking_date", label: t("admin.bookings.field.date"), type: "date" },
      { name: "booking_time", label: t("admin.bookings.field.time"), type: "time" },
      { name: "street_name", label: t("admin.bookings.field.street") },
      { name: "house_number", label: t("admin.bookings.field.houseNo") },
      { name: "property_size", label: t("admin.bookings.detail.propertySize") },
      { name: "hours", label: t("admin.bookings.field.hours"), type: "number" },
      { name: "cleaners", label: t("admin.bookings.field.cleaners"), type: "number" },
      // total is server-computed (price × hours + add-ons); shown read-only in
      // the detail view, not editable here.
      { name: "workers", label: t("admin.bookings.field.workers"), type: "multiselect", options: workerOptions, hint: t("admin.bookings.field.workersHint") },
      { name: "notes", label: t("admin.bookings.field.notes"), type: "textarea", full: true },
    ],
    [t, statusOptions, workerOptions]
  );

  // Create collects the full booking the model needs. service_id/city_id are
  // real Service/City ids chosen from the catalogues (see booking.model.js); the
  // server validates existence, enabled state and coverage.
  const createFields = useMemo(
    () => [
      // Optionally link a registered account. When linked, any contact field left
      // blank is filled from that account server-side; otherwise type them in.
      { name: "customer_user_id", label: t("admin.bookings.field.linkAccount"), type: "select", options: userOptions },
      { name: "customer_name", label: t("admin.bookings.field.customerName") },
      { name: "customer_email", label: t("admin.bookings.field.email"), type: "email" },
      { name: "customer_phone", label: t("admin.bookings.field.phone") },
      { name: "service_id", label: t("admin.bookings.field.serviceId"), type: "select", options: serviceOptions, placeholder: t("admin.form.selectOption"), required: true },
      { name: "city_id", label: t("admin.bookings.field.cityId"), type: "select", options: cityOptions, placeholder: t("admin.form.selectOption"), required: true },
      { name: "booking_date", label: t("admin.bookings.field.date"), type: "date", required: true },
      { name: "booking_time", label: t("admin.bookings.field.time"), type: "time", required: true },
      { name: "street_name", label: t("admin.bookings.field.street"), required: true },
      { name: "house_number", label: t("admin.bookings.field.houseNo"), required: true },
      { name: "property_size", label: t("admin.bookings.detail.propertySize"), required: true },
      { name: "doorbell_name", label: t("admin.bookings.field.doorbell"), required: true },
      { name: "hours", label: t("admin.bookings.field.hours"), type: "number", required: true },
      { name: "cleaners", label: t("admin.bookings.field.cleaners"), type: "number", required: true },
      { name: "workers", label: t("admin.bookings.field.workers"), type: "multiselect", options: workerOptions, hint: t("admin.bookings.field.workersHint") },
      // total is computed server-side from the service price, hours and add-ons.
      { name: "notes", label: t("admin.bookings.field.notes"), type: "textarea", full: true },
    ],
    [t, serviceOptions, cityOptions, userOptions, workerOptions]
  );

  const data = useMemo(() => {
    const base = statusFilter
      ? items.filter((b) => b.status === statusFilter)
      : items;
    return base.map((b) => ({
      ...b,
      service_name: serviceNameById[String(b.service_id)] || b.service_name,
      city_name: cityNameById[String(b.city_id)] || b.city_name,
    }));
  }, [items, statusFilter, serviceNameById, cityNameById]);

  const handleSubmit = async (values) => {
    const ok = editing
      ? await update(editing._id, values)
      : await create(values);
    if (ok) setEditing(undefined);
  };

  const columns = [
    {
      key: "customer_name",
      header: t("admin.bookings.col.customer"),
      render: (b) => (
        <div>
          <p className="font-semibold text-ink-900">{b.customer_name}</p>
          <p className="text-caption text-ink-400">{b.customer_email}</p>
        </div>
      ),
    },
    {
      key: "service_name",
      header: t("admin.bookings.col.serviceCity"),
      render: (b) => (
        <div>
          <p className="text-ink-800">{b.service_name}</p>
          <p className="text-caption text-ink-400">{b.city_name}</p>
        </div>
      ),
    },
    {
      key: "booking_date",
      header: t("admin.bookings.col.schedule"),
      render: (b) => (
        <span className="whitespace-nowrap text-ink-600">
          {b.booking_date} · {b.booking_time}
        </span>
      ),
    },
    {
      key: "total_amount",
      header: t("admin.bookings.col.total"),
      render: (b) => <span className="font-semibold">{eur(b.total_amount)}</span>,
    },
    {
      key: "payment_status",
      header: t("admin.bookings.col.payment"),
      render: (b) => {
        const meta = PAYMENT_STATUS_META[b.payment_status] || PAYMENT_STATUS_META.unpaid;
        return (
          <Badge variant={meta.variant} size="sm">
            {t(meta.labelKey)}
          </Badge>
        );
      },
    },
    {
      key: "status",
      header: t("admin.bookings.col.status"),
      render: (b) => (
        <Select
          options={statusOptions}
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
        title={t("admin.bookings.title")}
        description={t("admin.bookings.description")}
        actions={
          <Button size="sm" leftIcon={Plus} onClick={() => setEditing(null)}>
            {t("admin.bookings.add")}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        searchKeys={["customer_name", "customer_email", "service_name", "city_name"]}
        searchPlaceholder={t("admin.bookings.search")}
        emptyTitle={t("admin.bookings.emptyTitle")}
        emptyDescription={t("admin.bookings.emptyDescription")}
        filters={
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[{ value: "", label: t("admin.bookings.allStatuses") }, ...statusOptions]}
            className="h-11 min-w-[10rem]"
          />
        }
        actions={(b) => (
          <>
            <Button variant="ghost" size="icon" aria-label={t("admin.action.view")} onClick={() => setViewing(b)}>
              <Eye className="size-4.5" />
            </Button>
            <Button variant="ghost" size="icon" aria-label={t("admin.action.edit")} onClick={() => setEditing(b)}>
              <Pencil className="size-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("admin.action.delete")}
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
        title={t("admin.bookings.detailsTitle")}
        description={viewing?.reference}
        size="lg"
      >
        {viewing && (
          <div className="space-y-1">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={BOOKING_STATUS_META[viewing.status]?.variant}>
                  {BOOKING_STATUS_META[viewing.status] &&
                    t(BOOKING_STATUS_META[viewing.status].labelKey)}
                </Badge>
                {(() => {
                  const pm = PAYMENT_STATUS_META[viewing.payment_status] || PAYMENT_STATUS_META.unpaid;
                  return (
                    <Badge variant={pm.variant} size="sm">
                      {t(pm.labelKey)}
                    </Badge>
                  );
                })()}
              </div>
              <span className="text-heading-sm font-bold text-ink-900">
                {eur(viewing.total_amount)}
              </span>
            </div>
            <DetailRow label={t("admin.bookings.detail.customer")} value={viewing.customer_name} />
            <DetailRow label={t("admin.bookings.detail.email")} value={viewing.customer_email} />
            <DetailRow label={t("admin.bookings.detail.phone")} value={viewing.customer_phone} />
            <DetailRow label={t("admin.bookings.detail.service")} value={viewing.service_name} />
            <DetailRow label={t("admin.bookings.detail.city")} value={viewing.city_name} />
            <DetailRow
              label={t("admin.bookings.detail.address")}
              value={[viewing.street_name, viewing.house_number].filter(Boolean).join(" ")}
            />
            <DetailRow label={t("admin.bookings.detail.dateTime")} value={`${viewing.booking_date} · ${viewing.booking_time}`} />
            <DetailRow label={t("admin.bookings.detail.hoursCleaners")} value={`${viewing.hours || "—"} h · ${viewing.cleaners || "—"}`} />
            <DetailRow label={t("admin.bookings.detail.propertySize")} value={viewing.property_size ? `${viewing.property_size} m²` : "—"} />
            <DetailRow
              label={t("admin.bookings.detail.workers")}
              value={viewing.worker_names?.length ? viewing.worker_names.join(", ") : "—"}
            />
            <DetailRow label={t("admin.bookings.detail.notes")} value={viewing.notes} />
          </div>
        )}
      </Modal>

      <ResourceModal
        open={editing !== undefined}
        onClose={() => setEditing(undefined)}
        onSubmit={handleSubmit}
        title={editing ? t("admin.bookings.editTitle") : t("admin.bookings.addTitle")}
        fields={editing ? editFields : createFields}
        initialValues={editing || { hours: 2, cleaners: 1, customer_user_id: "" }}
        submitLabel={editing ? t("admin.form.saveChanges") : t("admin.form.create")}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          remove(deleting._id);
          setDeleting(null);
        }}
        title={t("admin.bookings.deleteTitle")}
        description={t("admin.form.deleteConfirm", { name: deleting?.customer_name })}
        confirmLabel={t("admin.action.delete")}
        danger
      />
    </div>
  );
}
