import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Page } from "@/components/shared/Page";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Image } from "@/components/ui/Image";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/shared/Icon";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { CtaSection } from "@/components/sections";
import { ServiceCard, useService } from "@/features/services";
// Deep imports (as in ProfilePage): the booking feature's index pulls in the
// whole Stripe-backed wizard, which this marketing page must not drag along.
import { useCities } from "@/features/booking/hooks/useCities";
import { useSpecialRequests } from "@/features/booking/hooks/useSpecialRequests";
import { coversCity } from "@/features/booking/utils/coverage";
import { formatCurrency } from "@/utils/formatCurrency";
import { useTranslation } from "@/i18n";
import { Seo, serviceSchema, breadcrumbSchema } from "@/seo";
import { ROUTES } from "@/constants/routes";
import { staggerContainer, staggerItem } from "@/animations/stagger";
import { viewportOnce } from "@/animations/pageTransitions";

/*
 * ServiceDetailPage
 * -----------------
 * The full profile of a single service (`/services/:slug`): what it covers,
 * which cities it's offered in, which add-ons it unlocks and what it costs.
 *
 * Its job is to convert: every CTA points at `/booking?service=<id>`, the query
 * param BookingWizard reads to seed `serviceId` — so arriving in the wizard the
 * service is already chosen and the user only fills in address, date and time.
 */

/** The wizard pre-selects the service from this query param. */
const bookingHref = (service) =>
  `${ROUTES.booking}?service=${encodeURIComponent(service.id)}`;

function DetailSkeleton() {
  return (
    <Page>
      <Container className="py-32">
        <Skeleton className="h-5 w-32" />
        <div className="mt-8 grid gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="mt-4 h-5 w-1/2" />
            <div className="mt-8">
              <Skeleton.Text lines={4} />
            </div>
            <Skeleton className="mt-8 h-13 w-56 rounded-full" />
          </div>
          <Skeleton className="h-72 w-full rounded-3xl" />
        </div>
      </Container>
    </Page>
  );
}

const ServiceDetailPage = () => {
  const { t } = useTranslation();
  const { slug } = useParams();
  const { service, related, isLoading, isError, notFound } = useService(slug);
  const { data: cities = [] } = useCities();
  const { data: addons = [] } = useSpecialRequests();

  if (isLoading) return <DetailSkeleton />;

  if (isError || notFound || !service) {
    return (
      <Page>
        <Container size="sm" className="py-32">
          <EmptyState
            icon={Search}
            title={t("pages.serviceDetail.notFoundTitle")}
            description={t("pages.serviceDetail.notFoundBody")}
            action={
              <Button to={ROUTES.services} leftIcon={ArrowLeft}>
                {t("pages.serviceDetail.backToServices")}
              </Button>
            }
          />
        </Container>
      </Page>
    );
  }

  const bookHref = bookingHref(service);

  // Coverage: either everywhere we operate, or the explicit subset the admin
  // picked — resolved to real city names via the same list the wizard uses, and
  // through the same rule the wizard applies, so this page can never advertise a
  // city the booking step would then refuse.
  const coverageCities = cities.filter((c) => coversCity(service, c.id));

  // The add-ons this service unlocks in the wizard — shown here so the price
  // isn't a surprise at step 2.
  const serviceAddons = service.allSpecialRequests
    ? addons
    : addons.filter((a) =>
        (service.specialRequests || []).includes(String(a.value))
      );

  const howItWorks = t("pages.serviceDetail.how");

  return (
    <Page>
      <Seo
        title={`${service.name} — ${t("pages.serviceDetail.metaSuffix")}`}
        description={service.description}
        path={ROUTES.serviceDetail(service.slug)}
        image={service.image}
        schema={[
          serviceSchema(service),
          breadcrumbSchema([
            { name: t("nav.services"), path: ROUTES.services },
            { name: service.name, path: ROUTES.serviceDetail(service.slug) },
          ]),
        ]}
      />

      {/* Header — identity, price and the primary booking CTA */}
      <header className="relative overflow-hidden bg-grid pt-32 pb-16 lg:pt-40 lg:pb-20">
        <div className="pointer-events-none absolute inset-0 bg-brand-glow" aria-hidden="true" />
        <Container className="relative">
          <Link
            to={ROUTES.services}
            className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-brand-600 transition-colors hover:text-brand-700"
          >
            <ArrowLeft className="size-4" /> {t("pages.serviceDetail.allServices")}
          </Link>

          <motion.div
            variants={staggerContainer(0.1, 0.05)}
            initial="hidden"
            animate="visible"
            className="mt-8 grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]"
          >
            <div>
              <motion.div variants={staggerItem} className="flex flex-wrap items-center gap-2">
                <Badge variant="brand" icon={Sparkles}>
                  {t("pages.serviceDetail.eyebrow")}
                </Badge>
                {service.allCities && (
                  <Badge variant="neutral" icon={MapPin}>
                    {t("pages.serviceDetail.allCitiesBadge")}
                  </Badge>
                )}
              </motion.div>

              <motion.h1
                variants={staggerItem}
                className="mt-6 text-heading-xl text-balance text-ink-900"
              >
                {service.name}
              </motion.h1>

              {service.tagline && (
                <motion.p
                  variants={staggerItem}
                  className="mt-3 text-body-lg font-medium text-brand-600"
                >
                  {service.tagline}
                </motion.p>
              )}

              <motion.p variants={staggerItem} className="mt-5 max-w-xl text-body-lg text-ink-500">
                {service.description}
              </motion.p>

              <motion.div variants={staggerItem} className="mt-8 flex items-baseline gap-2">
                <span className="text-body-sm text-ink-500">{t("common.from")}</span>
                <span className="text-heading-lg font-bold text-ink-900">
                  {formatCurrency(service.pricePerHour)}
                </span>
                <span className="text-body-sm text-ink-500">
                  {t("pages.serviceDetail.perHour")}
                </span>
              </motion.div>

              <motion.div
                variants={staggerItem}
                className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <Button to={bookHref} size="lg" rightIcon={ArrowRight}>
                  {t("pages.serviceDetail.bookCta")}
                </Button>
                <Button to={ROUTES.contact} size="lg" variant="outline">
                  {t("common.talkToTeam")}
                </Button>
              </motion.div>

              <motion.p variants={staggerItem} className="mt-4 text-body-sm text-ink-400">
                {t("pages.serviceDetail.preselectNote")}
              </motion.p>
            </div>

            <motion.div variants={staggerItem}>
              <Image
                src={service.image}
                alt={service.name}
                aspect="aspect-[4/3]"
                rounded="rounded-3xl"
                priority
                className="w-full shadow-large"
              />
            </motion.div>
          </motion.div>
        </Container>
      </header>

      {/* Detail body + sticky booking card */}
      <section className="py-16 lg:py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
            <div className="space-y-14">
              {/* Inclusions */}
              {service.features?.length > 0 && (
                <div>
                  <h2 className="text-heading-md text-ink-900">
                    {t("pages.serviceDetail.includedTitle")}
                  </h2>
                  <p className="mt-2 text-body-md text-ink-500">
                    {t("pages.serviceDetail.includedSubtitle")}
                  </p>
                  <motion.ul
                    variants={staggerContainer(0.05)}
                    initial="hidden"
                    whileInView="visible"
                    viewport={viewportOnce}
                    className="mt-6 grid gap-3 sm:grid-cols-2"
                  >
                    {service.features.map((feature) => (
                      <motion.li
                        key={feature}
                        variants={staggerItem}
                        className="flex items-start gap-3 rounded-xl border border-ink-100 bg-surface px-5 py-4 text-body-md text-ink-700 shadow-soft"
                      >
                        <Check className="mt-0.5 size-5 shrink-0 text-brand-600" />
                        {feature}
                      </motion.li>
                    ))}
                  </motion.ul>
                </div>
              )}

              {/* Add-ons unlocked by this service */}
              {serviceAddons.length > 0 && (
                <div>
                  <h2 className="text-heading-md text-ink-900">
                    {t("pages.serviceDetail.addonsTitle")}
                  </h2>
                  <p className="mt-2 text-body-md text-ink-500">
                    {t("pages.serviceDetail.addonsSubtitle")}
                  </p>
                  <ul className="mt-6 divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-surface shadow-soft">
                    {serviceAddons.map((addon) => (
                      <li
                        key={addon.value}
                        className="flex items-start justify-between gap-4 px-5 py-4"
                      >
                        <div>
                          <p className="text-body-md font-semibold text-ink-900">{addon.label}</p>
                          {addon.description && (
                            <p className="mt-0.5 text-body-sm text-ink-500">{addon.description}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-body-md font-semibold text-brand-600">
                          +{formatCurrency(addon.price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Coverage */}
              <div>
                <h2 className="text-heading-md text-ink-900">
                  {t("pages.serviceDetail.coverageTitle")}
                </h2>
                <p className="mt-2 text-body-md text-ink-500">
                  {service.allCities
                    ? t("pages.serviceDetail.coverageAll")
                    : t("pages.serviceDetail.coverageSome")}
                </p>
                {coverageCities.length > 0 ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {coverageCities.map((city) => (
                      <Badge key={city.id} variant="outline" icon={MapPin}>
                        {city.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-6 rounded-xl border border-dashed border-ink-200 px-5 py-4 text-body-sm text-ink-500">
                    {t("pages.serviceDetail.coverageEmpty")}
                  </p>
                )}
              </div>
            </div>

            {/* Booking card */}
            <aside>
              <Card variant="elevated" className="lg:sticky lg:top-28">
                <Card.Body>
                  <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                    <Icon name={service.icon} className="size-6" />
                  </span>
                  <h2 className="mt-5 text-heading-sm text-ink-900">
                    {t("pages.serviceDetail.summaryTitle")}
                  </h2>
                  <p className="mt-2 text-body-sm text-ink-500">
                    {t("pages.serviceDetail.summaryBody", { service: service.name })}
                  </p>

                  <div className="mt-6 flex items-baseline gap-2 border-y border-ink-100 py-5">
                    <span className="text-body-sm text-ink-500">{t("common.from")}</span>
                    <span className="text-heading-md font-bold text-ink-900">
                      {formatCurrency(service.pricePerHour)}
                    </span>
                    <span className="text-body-sm text-ink-500">
                      {t("pages.serviceDetail.perHour")}
                    </span>
                  </div>

                  {Array.isArray(howItWorks) && (
                    <ol className="mt-6 space-y-3">
                      {howItWorks.map((step, i) => (
                        <li key={step} className="flex items-start gap-3 text-body-sm text-ink-700">
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-50 text-caption font-bold text-brand-700">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  )}

                  <Button to={bookHref} size="lg" fullWidth className="mt-7" rightIcon={ArrowRight}>
                    {t("pages.serviceDetail.bookCta")}
                  </Button>

                  <ul className="mt-5 space-y-2">
                    <li className="flex items-center gap-2 text-body-sm text-ink-500">
                      <BadgeCheck className="size-4 shrink-0 text-brand-500" />
                      {t("pages.serviceDetail.trustVetted")}
                    </li>
                    <li className="flex items-center gap-2 text-body-sm text-ink-500">
                      <ShieldCheck className="size-4 shrink-0 text-brand-500" />
                      {t("pages.serviceDetail.trustInsured")}
                    </li>
                  </ul>
                </Card.Body>
              </Card>
            </aside>
          </div>
        </Container>
      </section>

      {/* Related services */}
      {related.length > 0 && (
        <section className="bg-sand-50 py-20 lg:py-24">
          <Container>
            <SectionHeading
              align="left"
              eyebrow={t("pages.serviceDetail.relatedEyebrow")}
              title={t("pages.serviceDetail.relatedTitle")}
            />
            <motion.div
              variants={staggerContainer(0.08)}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {related.map((item) => (
                <ServiceCard key={item.id} service={item} />
              ))}
            </motion.div>
          </Container>
        </section>
      )}

      <CtaSection
        title={t("pages.serviceDetail.ctaTitle")}
        subtitle={t("pages.serviceDetail.ctaSubtitle")}
        primaryTo={bookHref}
        primaryLabel={t("pages.serviceDetail.bookCta")}
      />
    </Page>
  );
};

export default ServiceDetailPage;
