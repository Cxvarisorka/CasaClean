import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Inbox,
  Trash2,
  Eye,
  Mail,
  Phone,
  Reply,
  MailOpen,
  Clock,
  Send,
  CornerDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Textarea";
import {
  PageHeader,
  StatCard,
  DataTable,
  ConfirmDialog,
  useCollection,
  useAdminData,
  CONTACT_STATUS_META,
} from "@/features/admin";
import { contactMessageApi } from "@/features/admin/api/adminApi";
import { useTranslation } from "@/i18n";

/*
 * Contact inbox
 * -------------
 * Messages submitted through the public contact form (POST /api/v1/contact).
 * The team is emailed on arrival, but this is the durable record — and the only
 * place a message can be triaged.
 *
 * The customer's own text is never editable — it belongs to whoever wrote it.
 * What the panel can do is answer it: the detail modal has a composer that sends
 * the reply through the app's own mailer (POST /contact/:id/reply), records what
 * was sent, and marks the message handled in the same step. Every answer stays
 * on the thread, so the next admin can see what was already said.
 */

export default function MessagesPage() {
  const { items, update, remove, refresh } = useCollection("contactMessages");
  const { stats } = useAdminData();
  const { t, locale } = useTranslation();
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [draft, setDraft] = useState("");

  // The server awaits the actual send, so a rejection means the email did NOT
  // leave and nothing was recorded. Keep the draft in that case — retyping a
  // lost reply is the one thing an admin should never have to do.
  const replyMutation = useMutation({
    mutationFn: ({ id, body }) => contactMessageApi.reply(id, body),
    onSuccess: () => {
      setDraft("");
      refresh();
    },
  });

  // Opening a different message must not inherit the previous draft.
  const openMessage = (m) => {
    setViewing(m);
    setDraft("");
    replyMutation.reset();
  };

  const fmtDateTime = (iso) =>
    iso
      ? new Date(iso).toLocaleString(locale === "ka" ? "ka-GE" : locale, {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const isHandled = (m) => m.status === "handled";
  const toggleStatus = (m) =>
    update(m._id, { status: isHandled(m) ? "new" : "handled" });

  const columns = [
    {
      key: "name",
      header: t("admin.messages.col.from"),
      render: (m) => (
        <div className="min-w-0">
          {/* Unread messages read heavier so a full inbox still scans. */}
          <p
            className={
              isHandled(m)
                ? "font-medium text-ink-700"
                : "font-semibold text-ink-900"
            }
          >
            {m.name}
          </p>
          <p className="truncate text-caption text-ink-400">{m.email}</p>
        </div>
      ),
    },
    {
      key: "topic",
      header: t("admin.messages.col.topic"),
      render: (m) => (
        <Badge variant="outline" size="sm">
          {t(`pages.contact.topics.${m.topic}`)}
        </Badge>
      ),
    },
    {
      key: "message",
      header: t("admin.messages.col.message"),
      render: (m) => (
        <p className="line-clamp-2 max-w-md text-body-sm text-ink-700">
          {m.message}
        </p>
      ),
    },
    {
      key: "createdAt",
      header: t("admin.messages.col.received"),
      render: (m) => (
        <span className="whitespace-nowrap text-ink-500">
          {fmtDateTime(m.createdAt)}
        </span>
      ),
    },
    {
      key: "status",
      header: t("admin.messages.col.handled"),
      align: "center",
      render: (m) => (
        // The one writable field. stopPropagation so triaging a row doesn't also
        // open the detail modal.
        <span
          className="inline-flex"
          onClick={(e) => e.stopPropagation()}
          role="presentation"
        >
          <Switch
            checked={isHandled(m)}
            onChange={() => toggleStatus(m)}
            aria-label={t("admin.messages.handledAria")}
          />
        </span>
      ),
    },
  ];

  // The modal holds only an id-bearing snapshot; read the live row back out of
  // the collection so triaging from inside it re-renders the state.
  const current = viewing
    ? items.find((m) => m._id === viewing._id) || viewing
    : null;

  const newCount = stats.newContactMessages || 0;
  const handledCount = items.length - newCount;

  // Escape hatch for the times a reply needs an attachment or a personal
  // signature — the composer above covers the normal case.
  const mailtoHref = (m) =>
    `mailto:${encodeURIComponent(m.email)}` +
    `?subject=${encodeURIComponent(t("admin.messages.replySubject"))}` +
    `&body=${encodeURIComponent(`\n\n---\n${m.message}`)}`;

  return (
    <div className="space-y-8">
      <PageHeader
        icon={Inbox}
        title={t("admin.messages.title")}
        description={t("admin.messages.description")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Inbox}
          label={t("admin.messages.stat.new")}
          value={newCount}
          hint={t("admin.messages.stat.newHint")}
          accent={newCount > 0 ? "accent" : "success"}
        />
        <StatCard
          icon={MailOpen}
          label={t("admin.messages.stat.handled")}
          value={handledCount}
          hint={t("admin.messages.stat.handledHint")}
          accent="success"
        />
        <StatCard
          icon={Mail}
          label={t("admin.messages.stat.total")}
          value={items.length}
          hint={t("admin.messages.stat.totalHint")}
          accent="brand"
        />
      </div>

      <DataTable
        columns={columns}
        data={items}
        searchKeys={["name", "email", "phone", "message"]}
        searchPlaceholder={t("admin.messages.search")}
        emptyTitle={t("admin.messages.emptyTitle")}
        emptyDescription={t("admin.messages.emptyDescription")}
        onRowClick={openMessage}
        actions={(m) => (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("admin.action.view")}
              onClick={() => openMessage(m)}
            >
              <Eye className="size-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("admin.action.delete")}
              className="text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300"
              onClick={() => setDeleting(m)}
            >
              <Trash2 className="size-4.5" />
            </Button>
          </>
        )}
      />

      {/* Full message + triage */}
      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={t("admin.messages.detail.title")}
        size="lg"
      >
        {current && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-body-md font-semibold text-ink-900">
                  {current.name}
                </p>
                <p className="text-caption text-ink-400">
                  {fmtDateTime(current.createdAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" size="sm">
                  {t(`pages.contact.topics.${current.topic}`)}
                </Badge>
                <Badge
                  variant={CONTACT_STATUS_META[current.status]?.variant || "outline"}
                  size="sm"
                >
                  {t(
                    CONTACT_STATUS_META[current.status]?.labelKey ||
                      "admin.messages.status.new"
                  )}
                </Badge>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <DetailRow
                icon={Mail}
                label={t("admin.messages.detail.email")}
                value={
                  <a
                    href={`mailto:${current.email}`}
                    className="text-brand-600 hover:underline"
                  >
                    {current.email}
                  </a>
                }
              />
              <DetailRow
                icon={Phone}
                label={t("admin.messages.detail.phone")}
                value={current.phone || "—"}
              />
              {current.handled_at && (
                <DetailRow
                  icon={Clock}
                  label={t("admin.messages.detail.handledAt")}
                  value={
                    current.handled_by_name
                      ? `${fmtDateTime(current.handled_at)} · ${current.handled_by_name}`
                      : fmtDateTime(current.handled_at)
                  }
                />
              )}
            </dl>

            {/* whitespace-pre-line so the sender's own line breaks survive. */}
            <div className="rounded-2xl border border-ink-100 bg-ink-50/50 p-4 xs:p-5">
              <p className="whitespace-pre-line text-body-sm text-ink-800">
                {current.message}
              </p>
            </div>

            {/* What we already told them — the thread, oldest first. */}
            {current.replies?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-body-md font-semibold text-ink-900">
                  {t("admin.messages.sentReplies")}
                </h3>
                {current.replies.map((r, i) => (
                  <div
                    key={r.sentAt || i}
                    className="rounded-2xl border border-brand-100 bg-brand-50/40 p-5"
                  >
                    <div className="flex items-center gap-2 text-caption text-ink-500">
                      <CornerDownRight className="size-3.5" aria-hidden="true" />
                      {fmtDateTime(r.sentAt)}
                    </div>
                    <p className="mt-2 whitespace-pre-line text-body-sm text-ink-800">
                      {r.body}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Composer. Sending also marks the message handled, server-side. */}
            <div className="rounded-2xl border border-ink-100 p-4 xs:p-5">
              <Textarea
                label={t("admin.messages.replyLabel")}
                hint={t("admin.messages.replyHint", { email: current.email })}
                placeholder={t("admin.messages.replyPlaceholder")}
                rows={6}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                error={
                  replyMutation.isError
                    ? replyMutation.error?.message || t("admin.messages.replyFailed")
                    : undefined
                }
              />

              <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  href={mailtoHref(current)}
                  leftIcon={Reply}
                >
                  {t("admin.messages.replyInMailClient")}
                </Button>
                <Button
                  leftIcon={Send}
                  loading={replyMutation.isPending}
                  disabled={draft.trim().length < 10}
                  onClick={() =>
                    replyMutation.mutate({ id: current._id, body: draft.trim() })
                  }
                >
                  {t("admin.messages.sendReply")}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-ink-100 p-4 xs:p-5">
              <Switch
                containerClassName="w-full"
                checked={isHandled(current)}
                onChange={() => toggleStatus(current)}
                label={t("admin.messages.handled.label")}
                description={
                  isHandled(current)
                    ? t("admin.messages.handled.onHint")
                    : t("admin.messages.handled.offHint")
                }
              />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          remove(deleting._id);
          setDeleting(null);
        }}
        title={t("admin.messages.deleteTitle")}
        description={t("admin.messages.deleteConfirm", { name: deleting?.name })}
        confirmLabel={t("admin.action.delete")}
        danger
      />
    </div>
  );
}

/** One labelled field in the detail grid. */
function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-500">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      {/* An email is one unbreakable token; without `wrap-break-word` it runs
          straight out of the dialog on a small phone. */}
      <div className="min-w-0">
        <dt className="text-caption text-ink-400">{label}</dt>
        <dd className="wrap-break-word text-body-sm font-medium text-ink-800">{value}</dd>
      </div>
    </div>
  );
}
