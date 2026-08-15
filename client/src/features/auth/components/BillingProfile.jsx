import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  RefreshCw,
  User,
  XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/features/admin/context";
import { useTranslation } from "@/i18n";
import { refreshTaxStatus, updateTaxProfile } from "../api/authApi";

/*
 * BillingProfile
 * --------------
 * Lets a customer bill as a company instead of as a person.
 *
 * Catalogue prices are VAT-exclusive, so an individual pays the listed price
 * plus VAT. A business whose VAT number is VERIFIED has none added (EU reverse
 * charge) — but verification is Stripe's answer, not a checkbox here:
 * the number goes to Stripe, Stripe checks it against VIES, and until it comes
 * back verified the account is charged VAT exactly like a consumer.
 *
 * That asynchrony is the thing this UI has to communicate honestly, which is why
 * "pending" gets its own state and its own warning rather than being dressed up
 * as success.
 */

const STATUS_META = {
  verified: { icon: CheckCircle2, variant: "success", labelKey: "profile.billing.status.verified" },
  pending: { icon: Clock, variant: "accent", labelKey: "profile.billing.status.pending" },
  unverified: { icon: XCircle, variant: "outline", labelKey: "profile.billing.status.unverified" },
};

function VatStatus({ status, t }) {
  const meta = STATUS_META[status];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant} size="sm">
      <Icon className="mr-1 size-3.5" />
      {t(meta.labelKey)}
    </Badge>
  );
}

export function BillingProfile() {
  const { t } = useTranslation();
  const { user, tax, refresh } = useAuth();

  // Seeded once from the session. The parent keys this component on the user id,
  // so it remounts (and re-seeds) when the session resolves — no effect needed,
  // and no cascading render on every profile change.
  const [customerType, setCustomerType] = useState(user?.customerType || "individual");
  const [companyName, setCompanyName] = useState(user?.companyName || "");
  const [vatNumber, setVatNumber] = useState(user?.vatNumber || "");
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const isBusiness = customerType === "business";

  const saveMutation = useMutation({
    mutationFn: () =>
      updateTaxProfile({
        customerType,
        companyName: isBusiness ? companyName : "",
        vatNumber: isBusiness ? vatNumber : "",
      }),
    onSuccess: async (data) => {
      setError(null);
      setSaved(true);
      // Re-seed from what the server stored, not from what was typed: it
      // normalises the VAT number ("it 012 345 678-90" -> "IT01234567890") and
      // clears the company fields when switching to a personal account.
      const stored = data?.user;
      if (stored) {
        setCustomerType(stored.customerType || "individual");
        setCompanyName(stored.companyName || "");
        setVatNumber(stored.vatNumber || "");
      }
      // Pull the session again: the treatment shown in the booking wizard is
      // derived server-side, so it only changes once /auth/me is re-read.
      await refresh();
    },
    onError: (err) => {
      setSaved(false);
      setError(err?.message || t("profile.billing.saveFailed"));
    },
  });

  const refreshMutation = useMutation({
    mutationFn: refreshTaxStatus,
    onSuccess: async () => {
      setError(null);
      await refresh();
    },
    onError: (err) => setError(err?.message || t("profile.billing.refreshFailed")),
  });

  const status = user?.vatStatus && user.vatStatus !== "none" ? user.vatStatus : null;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="text-heading-sm text-ink-900">{t("profile.billing.title")}</h3>
          <p className="mt-1 text-body-sm text-ink-500">{t("profile.billing.subtitle")}</p>
        </div>
        {status && <VatStatus status={status} t={t} />}
      </div>

      {/* Account type */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          { value: "individual", icon: User, labelKey: "profile.billing.individual", hintKey: "profile.billing.individualHint" },
          { value: "business", icon: Building2, labelKey: "profile.billing.business", hintKey: "profile.billing.businessHint" },
        ].map((option) => {
          const Icon = option.icon;
          const active = customerType === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setCustomerType(option.value);
                setSaved(false);
              }}
              className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                active
                  ? "border-brand-400 bg-brand-50"
                  : "border-ink-200 bg-surface hover:border-ink-300"
              }`}
            >
              <Icon className={`mt-0.5 size-4.5 shrink-0 ${active ? "text-brand-600" : "text-ink-400"}`} />
              <span className="min-w-0">
                <span className="block text-body-sm font-semibold text-ink-900">
                  {t(option.labelKey)}
                </span>
                <span className="mt-0.5 block text-caption text-ink-500">
                  {t(option.hintKey)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {isBusiness && (
        <div className="mt-5 space-y-4">
          <Input
            label={t("profile.billing.companyName")}
            value={companyName}
            onChange={(e) => {
              setCompanyName(e.target.value);
              setSaved(false);
            }}
            placeholder={t("profile.billing.companyNamePlaceholder")}
          />
          <Input
            label={t("profile.billing.vatNumber")}
            value={vatNumber}
            onChange={(e) => {
              setVatNumber(e.target.value.toUpperCase());
              setSaved(false);
            }}
            placeholder="IT01234567890"
            hint={t("profile.billing.vatNumberHint")}
          />

          {/* The honest bit: a number on file is not the same as a number that
              has been checked, and only the checked one changes the price. */}
          {status === "pending" && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-body-sm text-amber-800">
              <Clock className="mt-0.5 size-4.5 shrink-0" />
              <div className="min-w-0">
                <p>{t("profile.billing.pendingNote")}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={RefreshCw}
                  className="mt-1.5 -ml-2 text-amber-900"
                  loading={refreshMutation.isPending}
                  onClick={() => refreshMutation.mutate()}
                >
                  {t("profile.billing.checkNow")}
                </Button>
              </div>
            </div>
          )}

          {status === "unverified" && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-body-sm text-red-700">
              <XCircle className="mt-0.5 size-4.5 shrink-0" />
              {t("profile.billing.unverifiedNote")}
            </div>
          )}

          {tax?.reverseCharge && (
            <div className="flex items-start gap-2.5 rounded-xl border border-brand-200 bg-brand-50 p-3.5 text-body-sm text-brand-800">
              <CheckCircle2 className="mt-0.5 size-4.5 shrink-0" />
              {t("profile.billing.reverseChargeActive", { rate: tax.catalogueVatRate })}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-body-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {t("profile.billing.save")}
        </Button>
        {saved && !saveMutation.isPending && (
          <span className="flex items-center gap-1.5 text-body-sm text-brand-700">
            <CheckCircle2 className="size-4" />
            {t("profile.billing.saved")}
          </span>
        )}
      </div>
    </Card>
  );
}

export default BillingProfile;
