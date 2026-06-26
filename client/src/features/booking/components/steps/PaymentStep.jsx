import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { AlertCircle, CreditCard, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/i18n";
import { formatCurrency } from "@/utils/formatCurrency";
import { stripePromise, isStripeConfigured } from "@/services/stripe";
import { useServices } from "@/features/services";
import { useSpecialRequests } from "../../hooks/useSpecialRequests";
import { computeQuote } from "../../utils/pricing";
import { toBookingPayload } from "../../api/bookingApi";
import { createBookingIntent, finalizeBooking, listSavedCards } from "../../api/paymentApi";

/*
 * PaymentStep
 * -----------
 * The final wizard step. Pay-first: the server validates + prices the booking and
 * returns a PaymentIntent; only once the card is charged is the booking created.
 *
 * Two-phase to support "save this card" (which must be decided before the intent
 * is created) and one-click saved cards:
 *   • choose  — pick a saved card or a new card (+ save option), then continue.
 *   • card    — for a new card, render Stripe's <PaymentElement> and confirm.
 * A saved card is charged server-side off-session (with 3DS handled inline).
 */

// Inner form — rendered inside <Elements>, so it can use Stripe hooks. Confirms
// the new-card payment, then hands the paid intent up to finalise the booking.
function CardCheckoutForm({ amount, onFinalize }) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    try {
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (confirmError) {
        setError(confirmError.message || t("booking.payment.error"));
        return;
      }
      if (paymentIntent?.status === "succeeded") {
        await onFinalize(paymentIntent.id);
        return;
      }
      setError(t("booking.payment.error"));
    } catch (err) {
      setError(err?.message || t("booking.payment.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-body-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4.5 shrink-0" />
          {error}
        </div>
      )}

      <Button
        type="button"
        size="lg"
        fullWidth
        loading={busy}
        disabled={!stripe}
        leftIcon={Lock}
        onClick={handlePay}
      >
        {t("booking.payment.pay", { amount: formatCurrency(amount) })}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-caption text-ink-500">
        <Lock className="size-3.5" />
        {t("booking.payment.securedByStripe")}
      </p>
    </div>
  );
}

export function PaymentStep({ onConfirmed }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { control } = useFormContext();
  const values = useWatch({ control });

  const { data: addons = [] } = useSpecialRequests();
  const { services } = useServices();
  const quote = computeQuote(values, { addons, services });

  const { data: savedCards = [] } = useQuery({
    queryKey: ["saved-cards"],
    queryFn: listSavedCards,
    enabled: isStripeConfigured,
    staleTime: 60_000,
  });

  const [selected, setSelected] = useState("new"); // "new" | paymentMethodId
  const [saveCard, setSaveCard] = useState(false);
  const [intent, setIntent] = useState(null); // { clientSecret, paymentIntentId, amount }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Promote a paid intent into a real booking and advance to the success screen.
  const finalizeAndConfirm = async (paymentIntentId) => {
    const booking = await finalizeBooking(paymentIntentId);
    queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    onConfirmed(booking);
  };

  const handleContinue = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = toBookingPayload(values);

      if (selected !== "new") {
        // Saved card: charged + confirmed server-side off-session.
        const res = await createBookingIntent({ payload, savedPaymentMethodId: selected });
        if (res.paymentStatus === "succeeded") {
          await finalizeAndConfirm(res.paymentIntentId);
          return;
        }
        if (res.paymentStatus === "requires_action") {
          const stripe = await stripePromise;
          const { error: actionError, paymentIntent } = await stripe.handleNextAction({
            clientSecret: res.clientSecret,
          });
          if (actionError) {
            setError(actionError.message || t("booking.payment.error"));
            return;
          }
          if (paymentIntent?.status === "succeeded") {
            await finalizeAndConfirm(paymentIntent.id);
            return;
          }
        }
        setError(t("booking.payment.error"));
        return;
      }

      // New card: create the intent, then reveal the PaymentElement.
      const res = await createBookingIntent({ payload, savePaymentMethod: saveCard });
      setIntent({
        clientSecret: res.clientSecret,
        paymentIntentId: res.paymentIntentId,
        amount: res.amount,
      });
    } catch (err) {
      setError(err?.message || t("booking.payment.error"));
    } finally {
      setBusy(false);
    }
  };

  if (!isStripeConfigured) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-body-sm text-amber-800">
        <AlertCircle className="mt-0.5 size-4.5 shrink-0" />
        {t("booking.payment.unavailable")}
      </div>
    );
  }

  // Card phase — Stripe Elements with the new-card PaymentElement.
  if (intent) {
    return (
      <Elements
        stripe={stripePromise}
        options={{ clientSecret: intent.clientSecret, appearance: { theme: "stripe" } }}
      >
        <CardCheckoutForm amount={intent.amount ?? quote.total} onFinalize={finalizeAndConfirm} />
      </Elements>
    );
  }

  // Choose phase — saved cards (if any) + new card option.
  return (
    <div className="space-y-5">
      <h3 className="text-body-md font-semibold text-ink-900">
        {t("booking.payment.heading")}
      </h3>

      {savedCards.length > 0 && (
        <div className="space-y-2">
          <p className="text-body-sm text-ink-500">{t("booking.payment.savedCards")}</p>
          {savedCards.map((card) => (
            <label
              key={card.id}
              className="flex cursor-pointer items-center gap-3 rounded-2xl border border-ink-100 bg-surface p-4 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50"
            >
              <input
                type="radio"
                name="payment-card"
                value={card.id}
                checked={selected === card.id}
                onChange={() => setSelected(card.id)}
                className="accent-brand-600"
              />
              <CreditCard className="size-5 text-ink-500" />
              <span className="text-body-sm font-medium text-ink-900">
                {String(card.brand || "card").toUpperCase()} •••• {card.last4}
              </span>
              <span className="ml-auto text-caption text-ink-500">
                {String(card.expMonth).padStart(2, "0")}/{card.expYear}
              </span>
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-ink-100 bg-surface p-4 has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50">
            <input
              type="radio"
              name="payment-card"
              value="new"
              checked={selected === "new"}
              onChange={() => setSelected("new")}
              className="accent-brand-600"
            />
            <CreditCard className="size-5 text-ink-500" />
            <span className="text-body-sm font-medium text-ink-900">
              {t("booking.payment.newCard")}
            </span>
          </label>
        </div>
      )}

      {selected === "new" && (
        <label className="flex cursor-pointer items-center gap-3 text-body-sm text-ink-700">
          <input
            type="checkbox"
            checked={saveCard}
            onChange={(e) => setSaveCard(e.target.checked)}
            className="accent-brand-600"
          />
          {t("booking.payment.saveCard")}
        </label>
      )}

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-body-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4.5 shrink-0" />
          {error}
        </div>
      )}

      <Button
        type="button"
        size="lg"
        fullWidth
        loading={busy}
        leftIcon={Lock}
        onClick={handleContinue}
      >
        {selected === "new"
          ? t("booking.payment.continueToPayment")
          : t("booking.payment.pay", { amount: formatCurrency(quote.total) })}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-caption text-ink-500">
        <Lock className="size-3.5" />
        {t("booking.payment.securedByStripe")}
      </p>
    </div>
  );
}

export default PaymentStep;
