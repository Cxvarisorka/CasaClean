import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  PauseCircle,
  PlayCircle,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { useTranslation } from "@/i18n";
import {
  cancelSubscription,
  listMySubscriptions,
  pauseSubscription,
  resumeSubscription,
  updateSubscriptionCard,
} from "../api/subscriptionApi";
import { listSavedCards } from "../api/paymentApi";
import {
  formatLocalDateString,
  formatTimestampDate,
  intervalLabel,
} from "../utils/recurrence";

const DATE_OPTIONS = { day: "numeric", month: "long", year: "numeric" };

const STATUS_META = {
  active: { variant: "brand", labelKey: "profile.subscriptions.status.active" },
  paused: { variant: "accent", labelKey: "profile.subscriptions.status.paused" },
  cancelled: { variant: "outline", labelKey: "profile.subscriptions.status.cancelled" },
};

const isPaymentPause = (subscription) =>
  subscription.status === "paused" &&
  ["payment-failed", "card-removed"].includes(subscription.pausedReason);

function SubscriptionRow({
  subscription,
  locale,
  t,
  isPending,
  onPause,
  onResume,
  onCancel,
  onUpdateCard,
}) {
  const status = STATUS_META[subscription.status] || STATUS_META.cancelled;
  const paymentPaused = isPaymentPause(subscription);

  return (
    <li className="rounded-2xl border border-ink-100 bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink-900">
              {subscription.serviceName || t("profile.subscriptions.serviceFallback")}
            </p>
            <Badge variant={status.variant} size="sm">
              {t(status.labelKey)}
            </Badge>
          </div>
          {subscription.cityName && (
            <p className="mt-0.5 text-caption text-ink-400">{subscription.cityName}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-caption font-semibold text-brand-700">
          {intervalLabel(t, subscription.intervalDays)}
        </span>
      </div>

      {paymentPaused && (
        <div className="mt-4 flex flex-wrap items-start gap-x-2 gap-y-1 rounded-xl border border-amber-200 bg-amber-50 p-3 text-body-sm text-amber-800">
          <AlertCircle className="mt-0.5 size-4.5 shrink-0" aria-hidden="true" />
          {/* `flex-1` alone would shrink this to one word per line rather than
              wrap, because the button beside it is nowrap and won't give way.
              A basis makes the row break instead once the text can't keep it. */}
          <span className="min-w-0 flex-1 basis-48">
            {t("profile.subscriptions.paymentPaused")}
          </span>
          <Button href="#saved-cards" variant="link" size="sm">
            {t("profile.subscriptions.goToCards")}
          </Button>
        </div>
      )}

      <dl className="mt-4 grid gap-3 text-body-sm sm:grid-cols-2">
        <div className="rounded-xl bg-ink-50 px-3 py-2.5">
          <dt className="text-caption text-ink-400">{t("profile.subscriptions.nextService")}</dt>
          <dd className="mt-0.5 font-medium text-ink-800">
            {formatLocalDateString(subscription.nextServiceDate, locale, DATE_OPTIONS)}
          </dd>
        </div>
        <div className="rounded-xl bg-ink-50 px-3 py-2.5">
          <dt className="text-caption text-ink-400">{t("profile.subscriptions.nextCharge")}</dt>
          <dd className="mt-0.5 font-medium text-ink-800">
            {formatTimestampDate(subscription.nextChargeAt, locale, DATE_OPTIONS)}
          </dd>
        </div>
      </dl>

      {subscription.lastChargeStatus && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-body-sm">
          <span className="text-ink-500">{t("profile.subscriptions.lastCharge")}</span>
          <Badge
            variant={subscription.lastChargeStatus === "succeeded" ? "success" : "accent"}
            size="sm"
            icon={subscription.lastChargeStatus === "succeeded" ? CheckCircle2 : AlertCircle}
          >
            {subscription.lastChargeStatus === "succeeded"
              ? t("profile.subscriptions.chargeSucceeded")
              : t("profile.subscriptions.chargeFailed")}
          </Badge>
          {subscription.lastChargeAt && (
            <span className="text-caption text-ink-400">
              {formatTimestampDate(subscription.lastChargeAt, locale, DATE_OPTIONS)}
            </span>
          )}
          {subscription.lastError && (
            <span className="basis-full text-caption text-red-600">{subscription.lastError}</span>
          )}
        </div>
      )}

      {subscription.status !== "cancelled" && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-4">
          {subscription.status === "active" ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={PauseCircle}
              loading={isPending}
              onClick={() => onPause(subscription._id)}
            >
              {t("profile.subscriptions.pause")}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              leftIcon={PlayCircle}
              loading={isPending}
              onClick={() => onResume(subscription._id)}
            >
              {t("profile.subscriptions.resume")}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            leftIcon={CreditCard}
            disabled={isPending}
            onClick={() => onUpdateCard(subscription)}
          >
            {t("profile.subscriptions.updateCard")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={XCircle}
            disabled={isPending}
            onClick={() => onCancel(subscription)}
            className="text-red-600 hover:bg-red-500/10 hover:text-red-700"
          >
            {t("profile.subscriptions.cancel")}
          </Button>
        </div>
      )}
    </li>
  );
}

export function MySubscriptions() {
  const { t, locale } = useTranslation();
  const dateLocale = locale === "ka" ? "ka-GE" : locale;
  const queryClient = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cardTarget, setCardTarget] = useState(null);
  const [selectedCard, setSelectedCard] = useState("");

  const subscriptionsQuery = useQuery({
    queryKey: ["my-subscriptions"],
    queryFn: listMySubscriptions,
  });
  const cardsQuery = useQuery({
    queryKey: ["saved-cards"],
    queryFn: listSavedCards,
    enabled: Boolean(cardTarget),
    staleTime: 60_000,
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action, id, paymentMethodId }) => {
      if (action === "pause") return pauseSubscription(id);
      if (action === "resume") return resumeSubscription(id);
      if (action === "card") return updateSubscriptionCard(id, paymentMethodId);
      return cancelSubscription(id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions"] });
      if (variables.action === "card") {
        setCardTarget(null);
        setSelectedCard("");
      }
      if (variables.action === "cancel") setCancelTarget(null);
    },
  });

  const openCardModal = (subscription) => {
    setSelectedCard("");
    setCardTarget(subscription);
  };
  const actionIsPendingFor = (id) =>
    actionMutation.isPending && actionMutation.variables?.id === id;

  return (
    <Card className="p-4 xs:p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <CalendarClock className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-heading-sm text-ink-900">{t("profile.subscriptions.title")}</h2>
          <p className="text-body-sm text-ink-500">{t("profile.subscriptions.subtitle")}</p>
        </div>
      </div>

      <div className="mt-5">
        {subscriptionsQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner label={t("common.loading")} />
          </div>
        ) : subscriptionsQuery.isError ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-body-sm text-red-700">
            <AlertCircle className="mt-0.5 size-4.5 shrink-0" />
            {subscriptionsQuery.error?.message || t("profile.subscriptions.error")}
          </div>
        ) : subscriptionsQuery.data?.length ? (
          <ul className="space-y-3">
            {subscriptionsQuery.data.map((subscription) => (
              <SubscriptionRow
                key={subscription._id}
                subscription={subscription}
                locale={dateLocale}
                t={t}
                isPending={actionIsPendingFor(subscription._id)}
                onPause={(id) => actionMutation.mutate({ action: "pause", id })}
                onResume={(id) => actionMutation.mutate({ action: "resume", id })}
                onCancel={setCancelTarget}
                onUpdateCard={openCardModal}
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center text-body-sm text-ink-500">
            {t("profile.subscriptions.empty")}
          </p>
        )}
      </div>

      {actionMutation.isError && !cancelTarget && !cardTarget && (
        <p className="mt-3 text-body-sm text-red-600">
          {actionMutation.error?.message || t("profile.subscriptions.error")}
        </p>
      )}

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => !actionMutation.isPending && setCancelTarget(null)}
        title={t("profile.subscriptions.cancelTitle")}
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setCancelTarget(null)}
              disabled={actionMutation.isPending}
            >
              {t("profile.subscriptions.keep")}
            </Button>
            <Button
              loading={actionMutation.isPending}
              onClick={() =>
                actionMutation.mutate({ action: "cancel", id: cancelTarget._id })
              }
              className="bg-red-600 hover:bg-red-700"
            >
              {t("profile.subscriptions.cancelConfirm")}
            </Button>
          </>
        }
      >
        {cancelTarget && (
          <p className="text-body-sm text-ink-600">
            {t("profile.subscriptions.cancelBody", {
              service: cancelTarget.serviceName || t("profile.subscriptions.serviceFallback"),
            })}
          </p>
        )}
        {actionMutation.isError && (
          <p className="mt-3 text-body-sm text-red-600">
            {actionMutation.error?.message || t("profile.subscriptions.error")}
          </p>
        )}
      </Modal>

      <Modal
        open={Boolean(cardTarget)}
        onClose={() => !actionMutation.isPending && setCardTarget(null)}
        title={t("profile.subscriptions.updateCardTitle")}
        description={t("profile.subscriptions.updateCardDescription")}
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setCardTarget(null)}
              disabled={actionMutation.isPending}
            >
              {t("admin.form.cancel")}
            </Button>
            <Button
              loading={actionMutation.isPending}
              disabled={!selectedCard}
              leftIcon={RefreshCcw}
              onClick={() =>
                actionMutation.mutate({
                  action: "card",
                  id: cardTarget._id,
                  paymentMethodId: selectedCard,
                })
              }
            >
              {t("profile.subscriptions.updateCard")}
            </Button>
          </>
        }
      >
        {cardsQuery.isLoading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : cardsQuery.data?.length ? (
          <div className="space-y-2">
            {cardsQuery.data.map((card) => (
              <label
                key={card.id}
                className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-ink-100 p-3 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50"
              >
                <input
                  type="radio"
                  name="subscription-card"
                  checked={selectedCard === card.id}
                  onChange={() => setSelectedCard(card.id)}
                  className="shrink-0 accent-brand-600"
                />
                <CreditCard className="size-5 shrink-0 text-ink-500" />
                <span className="text-body-sm font-medium text-ink-900">
                  {String(card.brand || "card").toUpperCase()} •••• {card.last4}
                </span>
                <span className="ml-auto shrink-0 text-caption text-ink-400">
                  {String(card.expMonth).padStart(2, "0")}/{card.expYear}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-ink-500">{t("profile.subscriptions.noCards")}</p>
        )}
        <Button href="#saved-cards" variant="link" size="sm" className="mt-4">
          {t("profile.subscriptions.goToCards")}
        </Button>
        {actionMutation.isError && (
          <p className="mt-3 text-body-sm text-red-600">
            {actionMutation.error?.message || t("profile.subscriptions.error")}
          </p>
        )}
      </Modal>
    </Card>
  );
}

export default MySubscriptions;
