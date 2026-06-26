import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { CreditCard, Plus, Trash2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { useTranslation } from "@/i18n";
import { stripePromise, isStripeConfigured } from "@/services/stripe";
import { listSavedCards, createSetupIntent, deleteSavedCard } from "../api/paymentApi";

/*
 * SavedCards
 * ----------
 * Profile widget to manage the user's saved cards. Adding a card uses a Stripe
 * SetupIntent (no charge) confirmed inline; the cards themselves live on the
 * Stripe customer (the server only ever returns brand/last4, never raw PANs).
 */

// Inner add-card form — runs inside <Elements> so it can confirm the SetupIntent.
function AddCardForm({ onAdded, onCancel }) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    try {
      const { error: setupError } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
      });
      if (setupError) {
        setError(setupError.message || t("profile.payments.error"));
        return;
      }
      onAdded();
    } catch (err) {
      setError(err?.message || t("profile.payments.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-body-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4.5 shrink-0" />
          {error}
        </div>
      )}
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          {t("admin.form.cancel")}
        </Button>
        <Button onClick={handleSave} loading={busy} disabled={!stripe}>
          {t("profile.payments.save")}
        </Button>
      </div>
    </div>
  );
}

export function SavedCards() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState(null);
  const [opening, setOpening] = useState(false);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["saved-cards"],
    queryFn: listSavedCards,
    enabled: isStripeConfigured,
    staleTime: 60_000,
  });

  const removeMutation = useMutation({
    mutationFn: (id) => deleteSavedCard(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-cards"] }),
  });

  const openAddCard = async () => {
    setOpening(true);
    try {
      const clientSecret = await createSetupIntent();
      setSetupClientSecret(clientSecret);
      setAdding(true);
    } finally {
      setOpening(false);
    }
  };

  const closeAddCard = () => {
    setAdding(false);
    setSetupClientSecret(null);
  };

  const onAdded = () => {
    queryClient.invalidateQueries({ queryKey: ["saved-cards"] });
    closeAddCard();
  };

  if (!isStripeConfigured) return null;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-heading-sm text-ink-900">{t("profile.payments.title")}</h2>
        <Button
          variant="outline"
          size="sm"
          leftIcon={Plus}
          loading={opening}
          onClick={openAddCard}
        >
          {t("profile.payments.add")}
        </Button>
      </div>

      <div className="mt-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Spinner />
          </div>
        ) : cards.length === 0 ? (
          <p className="text-body-sm text-ink-500">{t("profile.payments.empty")}</p>
        ) : (
          <ul className="space-y-2.5">
            {cards.map((card) => (
              <li
                key={card.id}
                className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-surface p-3.5"
              >
                <CreditCard className="size-5 text-ink-500" />
                <span className="text-body-sm font-medium text-ink-900">
                  {String(card.brand || "card").toUpperCase()} •••• {card.last4}
                </span>
                <span className="text-caption text-ink-400">
                  {String(card.expMonth).padStart(2, "0")}/{card.expYear}
                </span>
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(card.id)}
                  disabled={removeMutation.isPending}
                  aria-label={t("profile.payments.remove")}
                  className="ml-auto rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="size-4.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={adding}
        onClose={closeAddCard}
        title={t("profile.payments.addTitle")}
        size="md"
      >
        {setupClientSecret && (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret: setupClientSecret, appearance: { theme: "stripe" } }}
          >
            <AddCardForm onAdded={onAdded} onCancel={closeAddCard} />
          </Elements>
        )}
      </Modal>
    </Card>
  );
}

export default SavedCards;
