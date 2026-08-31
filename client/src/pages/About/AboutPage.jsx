import { motion } from "framer-motion";
import { Page } from "@/components/shared/Page";
import { Container } from "@/components/ui/Container";
import { Image } from "@/components/ui/Image";
import { PageHero, CtaSection } from "@/components/sections";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { Icon } from "@/components/shared/Icon";
import { Reveal } from "@/components/shared/Reveal";
import {
  Seo,
  breadcrumbSchema,
  organizationSchema,
  webPageSchema,
} from "@/seo";
import { PAGE_META, SITE } from "@/constants/metadata";
import { ROUTES } from "@/constants/routes";
import { IMAGES } from "@/constants/images";
import { COMPANY_VALUES } from "@/data/company";
import { SERVICES } from "@/data/services";
import { useTranslation } from "@/i18n";
import { staggerContainer, staggerItem } from "@/animations/stagger";
import { viewportOnce } from "@/animations/pageTransitions";

/*
 * AboutPage
 * ---------
 * The official company presentation: what CasaClean does, its mission, the
 * services it offers, why customers choose it and the legal entity behind the
 * brand. Copy lives in `pages.about.*` so every language says the same thing.
 */

/*
 * The trail to this page. Written in English, not through `t()`: a breadcrumb
 * in structured data is read by a crawler, which sees the page in whatever
 * language happens to be stored in the visitor's browser — and a trail that
 * changes wording between crawls is worse than one that is simply stable.
 */
const BREADCRUMB = [
  { name: "Home", path: ROUTES.home },
  { name: "About", path: ROUTES.about },
];

const AboutPage = () => {
  const { t } = useTranslation();

  const intro = t("pages.about.intro");
  const paragraphs = Array.isArray(intro) ? intro : [intro];

  return (
    <Page>
      <Seo
        {...PAGE_META.about}
        schema={[
          /*
           * `AboutPage` rather than a plain `WebPage`: it states that this
           * document *is* the description of the organization it names, which
           * is what makes it a candidate source for the knowledge panel rather
           * than one more indexed page.
           */
          webPageSchema({
            ...PAGE_META.about,
            type: "AboutPage",
            breadcrumb: BREADCRUMB,
          }),
          breadcrumbSchema(BREADCRUMB, PAGE_META.about.path),
          // Restated here (it is also site-wide) so the About page carries the
          // full company record in its own markup — same `@id`, so the two
          // merge into one entity rather than competing.
          organizationSchema(),
        ]}
      />

      <PageHero
        image={IMAGES.interiorLux}
        eyebrow={t("pages.about.heroEyebrow")}
        title={t("pages.about.heroTitle")}
        subtitle={t("pages.about.heroSubtitle")}
      />

      {/* Mission */}
      <section className="py-16 lg:py-24">
        <Container size="md">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.6 }}
            className="rounded-3xl border border-ink-100 bg-gradient-to-b from-surface to-sand-50 p-8 text-center shadow-soft sm:p-12"
          >
            <p className="text-eyebrow text-brand-600">{t("pages.about.missionLabel")}</p>
            <p className="mt-5 text-heading-lg text-balance leading-snug text-ink-900">
              {t("pages.about.mission")}
            </p>
          </motion.div>
        </Container>
      </section>

      {/* Story image band */}
      <section className="pb-16 lg:pb-24">
        <Container>
          <Reveal className="grid gap-4 sm:grid-cols-3">
            <Image
              src={IMAGES.livingModern}
              alt={t("pages.about.imageAlt1")}
              aspect="aspect-[4/5]"
              zoomOnHover
              className="sm:col-span-1"
            />
            <Image
              src={IMAGES.kitchen}
              alt={t("pages.about.imageAlt2")}
              aspect="aspect-[4/5]"
              zoomOnHover
              className="sm:col-span-1 sm:mt-8"
            />
            <Image
              src={IMAGES.bathroom}
              alt={t("pages.about.imageAlt3")}
              aspect="aspect-[4/5]"
              zoomOnHover
              className="sm:col-span-1"
            />
          </Reveal>
        </Container>
      </section>

      {/* Who we are */}
      <section className="pb-16 lg:pb-24">
        <Container size="md">
          <SectionHeading
            eyebrow={t("pages.about.introEyebrow")}
            title={t("pages.about.introTitle")}
          />
          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-10 space-y-5"
          >
            {paragraphs.map((paragraph) => (
              <motion.p
                key={paragraph}
                variants={staggerItem}
                className="text-body-lg text-ink-600"
              >
                {paragraph}
              </motion.p>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* Our services */}
      <section className="bg-sand-50 py-20 lg:py-28">
        <Container>
          <SectionHeading
            eyebrow={t("pages.about.servicesEyebrow")}
            title={t("pages.about.servicesTitle")}
          />
          <motion.ul
            variants={staggerContainer(0.08)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {SERVICES.map((service) => (
              <motion.li
                key={service.id}
                variants={staggerItem}
                className="flex items-start gap-4 rounded-2xl border border-ink-100 bg-surface p-6 shadow-soft"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Icon name={service.icon} className="size-5" />
                </span>
                <div>
                  <h3 className="text-heading-sm text-ink-900">
                    {t(`services.${service.id}.name`)}
                  </h3>
                  <p className="mt-2 text-body-sm text-ink-500">
                    {t(`services.${service.id}.tagline`)}
                  </p>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </Container>
      </section>

      {/* Why choose CasaClean */}
      <section className="py-20 lg:py-28">
        <Container>
          <SectionHeading
            eyebrow={t("pages.about.valuesEyebrow")}
            title={t("pages.about.valuesTitle")}
          />
          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {COMPANY_VALUES.map((value) => (
              <motion.div
                key={value.id}
                variants={staggerItem}
                className="rounded-2xl border border-ink-100 bg-surface p-6 shadow-soft"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                  <Icon name={value.icon} className="size-6" />
                </span>
                <h3 className="mt-5 text-heading-sm text-ink-900">
                  {t(`values.${value.id}.title`)}
                </h3>
                <p className="mt-2 text-body-sm text-ink-500">
                  {t(`values.${value.id}.description`)}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* Legal entity */}
      <section className="pb-20 lg:pb-28">
        <Container size="md">
          <Reveal className="rounded-3xl border border-ink-100 bg-sand-50 p-8 text-center sm:p-10">
            <p className="text-eyebrow text-brand-600">
              {t("pages.about.legalLabel")}
            </p>
            <p className="mt-4 text-body-lg text-ink-600">
              {t("pages.about.legal")}
            </p>

            {/* The registered details themselves. Deliberately label-free and
                read from SITE rather than the locale files: a company name, a
                street address, an email and a phone number read the same in
                every language, and duplicating them per locale is how they end
                up disagreeing. */}
            <div className="mt-6 border-t border-ink-100 pt-6 text-body-sm text-ink-500">
              <p className="font-semibold text-ink-900">{SITE.legalName}</p>
              <p className="mt-1">
                {SITE.address.street}, {SITE.address.postalCode}{" "}
                {SITE.address.city} ({SITE.address.region}), Italia
              </p>
              <p className="mt-1">
                <a
                  href={`mailto:${SITE.email}`}
                  className="transition-colors hover:text-brand-600"
                >
                  {SITE.email}
                </a>
                <span className="mx-2 text-ink-300">·</span>
                <a
                  href={SITE.phoneHref}
                  className="transition-colors hover:text-brand-600"
                >
                  {SITE.phone}
                </a>
              </p>
            </div>
          </Reveal>
        </Container>
      </section>

      <CtaSection
        title={t("pages.about.ctaTitle")}
        subtitle={t("pages.about.ctaSubtitle")}
      />
    </Page>
  );
};

export default AboutPage;
