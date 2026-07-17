import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/i18n";
import { bookingSchema, bookingDefaults } from "../validation/bookingSchema";
import { BookingProvider, useBookingNav } from "../store/BookingContext";
import { BookingProgress } from "./BookingProgress";
import { BookingSummary } from "./BookingSummary";
import { PropertyStep } from "./steps/PropertyStep";
import { PreferencesStep } from "./steps/PreferencesStep";
import { ScheduleStep } from "./steps/ScheduleStep";
import { ContactStep } from "./steps/ContactStep";
import { ReviewStep } from "./steps/ReviewStep";
import { PaymentStep } from "./steps/PaymentStep";
import { ConfirmationStep } from "./steps/ConfirmationStep";
import { EASE_PREMIUM } from "@/animations/tokens";

/*
 * BookingWizard
 * -------------
 * The multi-step booking experience. Architecture:
 *   • RHF (FormProvider) owns all field state across steps — one source of truth.
 *   • BookingProvider owns navigation (current step, direction, unlocked steps).
 *   • Each step validates only its own fields (trigger) before advancing.
 *   • The final step submits via a TanStack Query mutation and swaps to the
 *     confirmation screen on success.
 * This separation keeps each concern small and the wizard composable.
 */

// Indexed by step. The final "payment" step is handled separately (it needs the
// onConfirmed callback and owns its own CTA), so it isn't listed here.
const STEP_COMPONENTS = [
  PropertyStep,
  PreferencesStep,
  ScheduleStep,
  ContactStep,
  ReviewStep,
];

const stepVariants = {
  enter: (dir) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE_PREMIUM } },
  exit: (dir) => ({ opacity: 0, x: dir > 0 ? -40 : 40, transition: { duration: 0.25 } }),
};

function WizardBody({ onConfirmed }) {
  const { t } = useTranslation();
  const { step, direction, isFirst, next, prev, steps } = useBookingNav();
  const { trigger } = useFormContext();

  const activeStep = steps[step];
  const isPaymentStep = activeStep.id === "payment";
  const StepComponent = STEP_COMPONENTS[step];

  // Before leaving a step, validate only that step's fields (the payment/review
  // steps declare none, so they advance freely once earlier steps have passed).
  const handleNext = async () => {
    const valid = await trigger(activeStep.fields, { shouldFocus: true });
    if (valid) next();
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
      {/* Main column */}
      <div>
        <BookingProgress />

        <div className="mt-10">
          <div className="mb-6">
            <h2 className="text-heading-md text-ink-900">
              {t(`booking.steps.${activeStep.id}.title`)}
            </h2>
            <p className="mt-1 text-body-md text-ink-500">
              {t(`booking.steps.${activeStep.id}.subtitle`)}
            </p>
          </div>

          <div className="relative overflow-hidden">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {isPaymentStep ? (
                  <PaymentStep onConfirmed={onConfirmed} />
                ) : (
                  <StepComponent />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer nav. The payment step owns its own pay CTA (it lives inside
              Stripe's Elements context), so only the Back button shows there. */}
          <div className="mt-8 flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={prev}
              disabled={isFirst}
              leftIcon={ArrowLeft}
              className={isFirst ? "invisible" : ""}
            >
              {t("booking.back")}
            </Button>

            {!isPaymentStep && (
              <Button type="button" size="lg" onClick={handleNext} rightIcon={ArrowRight}>
                {t("booking.continue")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Summary column */}
      <BookingSummary />
    </div>
  );
}

export function BookingWizard() {
  // A service can be pre-selected from a service card (`/booking?service=<id>`),
  // so the wizard opens with that service already chosen.
  const [searchParams] = useSearchParams();
  const preselectedService = searchParams.get("service");

  const methods = useForm({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      ...bookingDefaults,
      ...(preselectedService ? { serviceId: preselectedService } : {}),
    },
    mode: "onTouched",
  });
  const [confirmation, setConfirmation] = useState(null);

  return (
    <FormProvider {...methods}>
      <BookingProvider>
        {confirmation ? (
          <ConfirmationStep booking={confirmation} />
        ) : (
          <WizardBody onConfirmed={setConfirmation} />
        )}
      </BookingProvider>
    </FormProvider>
  );
}

export default BookingWizard;
