import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Download,
  Eye,
  FileText,
  Mail,
  MailCheck,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog, DataTable, PageHeader } from "@/features/admin";
import { invoiceApi } from "@/features/admin/api/adminApi";
import {
  formatLocalDateString,
  formatTimestampDate,
} from "@/features/booking/utils/recurrence";
import { useTranslation } from "@/i18n";
import { formatDuration } from "@/features/booking";

/*
 * Invoices
 * --------
 * Every successful payment issues a numbered invoice server-side and emails it
 * to the customer with the PDF attached. This page is the admin's view of that
 * ledger: browse it, export any invoice as the exact PDF the customer received,
 * and resend one that bounced.
 *
 * Nothing here edits an invoice — it is an immutable snapshot of a payment, and
 * the API exposes no update route. The only writes are "send it again", "issue
 * the one this paid booking never got", and deleting one outright.
 *
 * Delete is the destructive exception and is presented as one: it is for the
 * document that should never have existed (a duplicate, a test charge, the
 * wrong customer), NOT for a refund — refunding stamps the invoice `refunded`
 * and keeps it, because the charge really happened. The confirmation says so,
 * since the number it burns is never reissued.
 */

const DATE_OPTIONS = { day: "numeric", month: "short", year: "numeric" };

const eur = (value) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    Number(value) || 0
  );

const STATUS_META = {
  issued: { labelKey: "admin.invoices.status.issued", variant: "success" },
  refunded: { labelKey: "admin.invoices.status.refunded", variant: "outline" },
};

/* Stacks below `xs` so a long value (an email, a seller address) gets the whole
   dialog width instead of overflowing it — see BookingsPage's twin. */
function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-ink-100 py-2.5 last:border-0 xs:flex-row xs:justify-between xs:gap-4">
      <span className="shrink-0 text-body-sm text-ink-400">{label}</span>
      <span className="min-w-0 wrap-break-word text-body-sm font-medium text-ink-800 xs:text-right">
        {value || "—"}
      </span>
    </div>
  );
}

/** The invoice's own line items and totals, mirroring the printed document. */
function InvoiceLines({ invoice, t }) {
  return (
    <div className="mt-6 border-t border-ink-100 pt-5">
      <h3 className="text-body-md font-semibold text-ink-900">
        {t("admin.invoices.items")}
      </h3>

      <ul className="mt-3 space-y-2">
        {invoice.line_items.map((item, index) => (
          <li
            key={`${item.description}-${index}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ink-50 px-3 py-2.5 text-body-sm"
          >
            <span className="min-w-0">
              <span className="font-medium text-ink-800">{item.description}</span>
              {item.detail && (
                <span className="ml-2 text-caption text-ink-400">{item.detail}</span>
              )}
            </span>
            <span className="whitespace-nowrap text-ink-600">
              {item.quantity} × {eur(item.unit_price)} = {eur(item.amount)}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-1">
        {/* A net subtotal only means something when a rate is configured —
            otherwise it would just repeat the total.
            Under the reverse charge the zero is shown explicitly rather than
            omitted, matching the printed document. */}
        {invoice.vat_rate > 0 ? (
          <>
            <DetailRow
              label={t("admin.invoices.detail.subtotal")}
              value={eur(invoice.subtotal)}
            />
            <DetailRow
              label={t("admin.invoices.detail.vat", { rate: invoice.vat_rate })}
              value={eur(invoice.vat_amount)}
            />
          </>
        ) : invoice.reverse_charge ? (
          <>
            <DetailRow
              label={t("admin.invoices.detail.subtotal")}
              value={eur(invoice.subtotal)}
            />
            <DetailRow
              label={t("admin.invoices.detail.vatReverseCharge")}
              value={eur(0)}
            />
          </>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-2">
          <span className="text-body-sm font-semibold text-ink-600">
            {invoice.status === "refunded"
              ? t("admin.invoices.detail.totalRefunded")
              : t("admin.invoices.detail.totalPaid")}
          </span>
          <span className="text-heading-sm font-bold text-brand-700">
            {eur(invoice.total)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ka" ? "ka-GE" : locale;
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("");
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const invoicesQuery = useQuery({
    queryKey: ["admin-invoices"],
    queryFn: () => invoiceApi.list(),
    placeholderData: (previous) => previous,
  });

  // Downloading isn't a cache mutation, but running it through useMutation gives
  // the button its pending state and a place to surface a failure — an admin
  // must never be left thinking a file saved when it didn't.
  const downloadMutation = useMutation({
    mutationFn: (invoice) => invoiceApi.downloadPdf(invoice._id, invoice.number),
    onError: (err) =>
      window.alert(err?.message || t("admin.invoices.downloadFailed")),
  });

  const resendMutation = useMutation({
    mutationFn: (invoice) => invoiceApi.resend(invoice._id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-invoices"] }),
    onError: (err) => window.alert(err?.message || t("admin.invoices.sendFailed")),
  });

  // The deleted invoice may well be the one open in the detail modal, so close
  // that too — leaving a dialog describing a document that no longer exists is
  // worse than no dialog.
  const deleteMutation = useMutation({
    mutationFn: (invoice) => invoiceApi.remove(invoice._id),
    onSuccess: (_data, invoice) => {
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      setViewing((current) => (current?._id === invoice._id ? null : current));
    },
    onError: (err) => window.alert(err?.message || t("admin.invoices.deleteFailed")),
  });

  const statusOptions = useMemo(
    () =>
      Object.entries(STATUS_META).map(([value, meta]) => ({
        value,
        label: t(meta.labelKey),
      })),
    [t]
  );

  const invoices = useMemo(() => {
    const all = invoicesQuery.data ?? [];
    return statusFilter ? all.filter((i) => i.status === statusFilter) : all;
  }, [invoicesQuery.data, statusFilter]);

  const isBusy = (mutation, id) =>
    mutation.isPending && mutation.variables?._id === id;

  const columns = [
    {
      key: "number",
      header: t("admin.invoices.col.number"),
      render: (invoice) => (
        <div>
          <p className="font-semibold text-ink-900">{invoice.number}</p>
          <p className="text-caption text-ink-400">{invoice.booking_reference}</p>
        </div>
      ),
    },
    {
      key: "customer_name",
      header: t("admin.invoices.col.customer"),
      render: (invoice) => (
        <div>
          <p className="text-ink-800">{invoice.customer_name}</p>
          <p className="text-caption text-ink-400">{invoice.customer_email}</p>
        </div>
      ),
    },
    {
      key: "service_name",
      header: t("admin.invoices.col.service"),
      render: (invoice) => (
        <div>
          <p className="text-ink-800">{invoice.service_name}</p>
          <p className="text-caption text-ink-400">
            {formatLocalDateString(invoice.service_date, dateLocale, DATE_OPTIONS)}
            {invoice.service_time ? ` · ${invoice.service_time}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "issued_at",
      header: t("admin.invoices.col.issued"),
      render: (invoice) => (
        <span className="whitespace-nowrap text-ink-600">
          {formatTimestampDate(invoice.issued_at, dateLocale, DATE_OPTIONS)}
        </span>
      ),
    },
    {
      key: "total",
      header: t("admin.invoices.col.total"),
      render: (invoice) => <span className="font-semibold">{eur(invoice.total)}</span>,
    },
    {
      key: "emailed_at",
      header: t("admin.invoices.col.delivery"),
      render: (invoice) =>
        invoice.emailed_at ? (
          <div className="flex flex-col items-start gap-1">
            <Badge variant="brand" size="sm">
              <MailCheck className="mr-1 size-3.5" />
              {t("admin.invoices.sent")}
            </Badge>
            <span className="text-caption text-ink-400">
              {formatTimestampDate(invoice.emailed_at, dateLocale, DATE_OPTIONS)}
            </span>
          </div>
        ) : (
          <Badge variant="accent" size="sm">
            {t("admin.invoices.notSent")}
          </Badge>
        ),
    },
    {
      key: "status",
      header: t("admin.invoices.col.status"),
      render: (invoice) => {
        const meta = STATUS_META[invoice.status] || STATUS_META.issued;
        return (
          <Badge variant={meta.variant} size="sm">
            {t(meta.labelKey)}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        icon={FileText}
        title={t("admin.invoices.title")}
        description={t("admin.invoices.description")}
      />

      {/* A failed fetch replaces the table; a pending one skeletons it, the same
          way every collection-backed admin table loads. */}
      {invoicesQuery.isError ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-body-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4.5 shrink-0" />
          {invoicesQuery.error?.message || t("admin.invoices.error")}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={invoices}
          loading={invoicesQuery.isLoading}
          searchKeys={[
            "number",
            "booking_reference",
            "customer_name",
            "customer_email",
            "service_name",
          ]}
          searchPlaceholder={t("admin.invoices.search")}
          emptyTitle={t("admin.invoices.emptyTitle")}
          emptyDescription={t("admin.invoices.emptyDescription")}
          filters={
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              options={[
                { value: "", label: t("admin.invoices.allStatuses") },
                ...statusOptions,
              ]}
              className="h-11 xs:min-w-40"
            />
          }
          onRowClick={setViewing}
          actions={(invoice) => (
            <>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("admin.action.view")}
                onClick={() => setViewing(invoice)}
              >
                <Eye className="size-4.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("admin.invoices.download")}
                title={t("admin.invoices.download")}
                loading={isBusy(downloadMutation, invoice._id)}
                onClick={() => downloadMutation.mutate(invoice)}
              >
                <Download className="size-4.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("admin.invoices.resend")}
                title={t("admin.invoices.resend")}
                loading={isBusy(resendMutation, invoice._id)}
                onClick={() => resendMutation.mutate(invoice)}
              >
                <Mail className="size-4.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("admin.action.delete")}
                title={t("admin.invoices.delete")}
                className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300"
                loading={isBusy(deleteMutation, invoice._id)}
                onClick={() => setDeleting(invoice)}
              >
                <Trash2 className="size-4.5" />
              </Button>
            </>
          )}
        />
      )}

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={t("admin.invoices.detailTitle")}
        description={viewing?.number}
        size="lg"
        footer={
          viewing ? (
            <>
              {/* Furthest from the primary action, and the only red control in
                  the dialog — it destroys the record rather than reversing it. */}
              <Button
                variant="ghost"
                leftIcon={Trash2}
                className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300"
                loading={isBusy(deleteMutation, viewing._id)}
                onClick={() => setDeleting(viewing)}
              >
                {t("admin.action.delete")}
              </Button>
              <Button
                variant="outline"
                leftIcon={Mail}
                loading={isBusy(resendMutation, viewing._id)}
                onClick={() => resendMutation.mutate(viewing)}
              >
                {t("admin.invoices.resend")}
              </Button>
              <Button
                leftIcon={Download}
                loading={isBusy(downloadMutation, viewing._id)}
                onClick={() => downloadMutation.mutate(viewing)}
              >
                {t("admin.invoices.downloadPdf")}
              </Button>
            </>
          ) : null
        }
      >
        {viewing && (
          <div className="space-y-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <Badge variant={(STATUS_META[viewing.status] || STATUS_META.issued).variant}>
                {t((STATUS_META[viewing.status] || STATUS_META.issued).labelKey)}
              </Badge>
              <span className="text-heading-sm font-bold text-ink-900">
                {eur(viewing.total)}
              </span>
            </div>

            <DetailRow label={t("admin.invoices.detail.number")} value={viewing.number} />
            <DetailRow
              label={t("admin.invoices.detail.issued")}
              value={formatTimestampDate(viewing.issued_at, dateLocale, DATE_OPTIONS)}
            />
            <DetailRow
              label={t("admin.invoices.detail.booking")}
              value={viewing.booking_reference}
            />
            <DetailRow label={t("admin.invoices.detail.customer")} value={viewing.customer_name} />
            <DetailRow label={t("admin.invoices.detail.email")} value={viewing.customer_email} />
            <DetailRow label={t("admin.invoices.detail.address")} value={viewing.customer_address} />
            <DetailRow label={t("admin.invoices.detail.service")} value={viewing.service_name} />
            <DetailRow
              label={t("admin.invoices.detail.dateTime")}
              value={[
                formatLocalDateString(viewing.service_date, dateLocale, DATE_OPTIONS),
                viewing.service_time,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
            <DetailRow
              label={t("admin.invoices.detail.hoursCleaners")}
              value={`${formatDuration(t, viewing.duration_minutes) || "—"} · ${viewing.cleaners ?? "—"}`}
            />
            <DetailRow
              label={t("admin.invoices.detail.payment")}
              value={
                viewing.payment_method === "manual"
                  ? t("admin.invoices.paidOffline")
                  : t("admin.invoices.paidByCard")
              }
            />
            {viewing.payment_intent_id && (
              <DetailRow
                label={t("admin.invoices.detail.paymentRef")}
                value={viewing.payment_intent_id}
              />
            )}
            {viewing.reverse_charge && (
              <DetailRow
                label={t("admin.invoices.detail.taxTreatment")}
                value={t("admin.invoices.reverseCharge", {
                  vat: viewing.customer_vat_number || "—",
                })}
              />
            )}
            <DetailRow
              label={t("admin.invoices.detail.delivery")}
              value={
                viewing.emailed_at
                  ? t("admin.invoices.sentTo", {
                      email: viewing.emailed_to,
                      date: formatTimestampDate(viewing.emailed_at, dateLocale, DATE_OPTIONS),
                    })
                  : t("admin.invoices.notSent")
              }
            />

            <InvoiceLines invoice={viewing} t={t} />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          deleteMutation.mutate(deleting);
          setDeleting(null);
        }}
        title={t("admin.invoices.deleteTitle")}
        description={t("admin.invoices.deleteConfirm", {
          number: deleting?.number,
        })}
        confirmLabel={t("admin.action.delete")}
        danger
      />
    </div>
  );
}
