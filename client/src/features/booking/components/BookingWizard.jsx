import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/i18n";
import { bookingSchema, bookingDefaults } from "../validation/bookingSchema";
import { BookingProvider, useBookingNav } from "../store/BookingContext";
import { useCreateBooking } from "../hooks/useCreateBooking";
import { useSpecialRequests } from "../hooks/useSpecialRequests";
import { toBookingPayload } from "../api/bookingApi";
import { computeQuote } from "../utils/pricing";
import { useServices } from "@/features/services";
import { BookingProgress } from "./BookingProgress";
import { BookingSummary } from "./BookingSummary";
import { PropertyStep } from "./steps/PropertyStep";
import { PreferencesStep } from "./steps/PreferencesStep";
import { ScheduleStep } from "./steps/ScheduleStep";
import { ContactStep } from "./steps/ContactStep";
import { ReviewStep } from "./steps/ReviewStep";
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
  const { step, direction, isFirst, isLast, next, prev, steps } = useBookingNav();
  const { trigger, handleSubmit } = useFormContext();
  const { mutateAsync, isPending, error } = useCreateBooking();
  const { data: addons = [] } = useSpecialRequests();
  const { services } = useServices();

  const StepComponent = STEP_COMPONENTS[step];
  const activeStep = steps[step];

  const handleNext = async () => {
    const valid = await trigger(activeStep.fields, { shouldFocus: true });
    if (valid) next();
  };

  const handleFinalSubmit = handleSubmit(async (values) => {
    const quote = computeQuote(values, { addons, services });
    const payload = toBookingPayload(values, quote);
    const booking = await mutateAsync(payload);
    onConfirmed(booking);
  });

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
                {isLast ? (
                  <ReviewStep submitError={error} />
                ) : (
                  <StepComponent />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer nav */}
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

            {isLast ? (
              <Button
                type="button"
                size="lg"
                onClick={handleFinalSubmit}
                loading={isPending}
                rightIcon={Check}
              >
                {t("booking.confirm")}
              </Button>
            ) : (
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
