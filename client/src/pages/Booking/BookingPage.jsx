import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Page } from "@/components/shared/Page";
import { Container } from "@/components/ui/Container";
import { BookingWizard } from "@/features/booking";
import { Seo } from "@/seo";
import { PAGE_META } from "@/constants/metadata";
import { ROUTES } from "@/constants/routes";
import { useTranslation } from "@/i18n";

/*
 * BookingPage
 * -----------
 * Hosts the booking wizard inside the focused EmptyLayout (no marketing nav).
 * The page is intentionally thin — all flow logic lives in the booking feature.
 */

const BookingPage = () => {
  const { t } = useTranslation();

  return (
    <Page>
      <Seo {...PAGE_META.booking} noIndex />

      <section className="py-10 lg:py-16">
        <Container size="lg">
          <Link
            to={ROUTES.home}
            className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-ink-500 transition-colors hover:text-ink-800"
          >
            <ArrowLeft className="size-4" /> {t("booking.backToSite")}
          </Link>

          <div className="mt-6 text-center">
            <h1 className="text-heading-lg text-ink-900">{t("booking.title")}</h1>
            <p className="mx-auto mt-2 max-w-xl text-body-md text-ink-500">
              {t("booking.subtitle")}
            </p>
          </div>

          <div className="mt-12 rounded-3xl border border-ink-100 bg-white p-6 shadow-medium sm:p-9 lg:p-10">
            <BookingWizard />
          </div>
        </Container>
      </section>
    </Page>
  );
};

export default BookingPage;
