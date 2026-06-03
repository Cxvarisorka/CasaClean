import { motion } from "framer-motion";
import { Page } from "@/components/shared/Page";
import { Container } from "@/components/ui/Container";
import { Image } from "@/components/ui/Image";
import { PageHero, CtaSection } from "@/components/sections";
import { SectionHeading } from "@/components/shared/SectionHeading";
import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { Icon } from "@/components/shared/Icon";
import { Reveal } from "@/components/shared/Reveal";
import { Seo } from "@/seo";
import { PAGE_META } from "@/constants/metadata";
import { IMAGES } from "@/constants/images";
import { COMPANY_VALUES, LEADERSHIP, COMPANY_MILESTONES } from "@/data/company";
import { STATS } from "@/data/stats";
import { useTranslation } from "@/i18n";
import { staggerContainer, staggerItem } from "@/animations/stagger";
import { viewportOnce } from "@/animations/pageTransitions";

/*
 * AboutPage
 * ---------
 * The brand story: mission, values, milestones, team and proof. Sections reuse
 * shared heading/animation primitives for a consistent narrative rhythm.
 */

const AboutPage = () => {
  const { t } = useTranslation();

  return (
    <Page>
      <Seo {...PAGE_META.about} />

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
            className="rounded-3xl border border-ink-100 bg-gradient-to-b from-white to-sand-50 p-8 text-center shadow-soft sm:p-12"
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
              alt="A styled, freshly turned-over living room"
              aspect="aspect-[4/5]"
              zoomOnHover
              className="sm:col-span-1"
            />
            <Image
              src={IMAGES.kitchen}
              alt="A spotless guest-ready kitchen"
              aspect="aspect-[4/5]"
              zoomOnHover
              className="sm:col-span-1 sm:mt-8"
            />
            <Image
              src={IMAGES.bathroom}
              alt="A sanitized, hotel-grade bathroom"
              aspect="aspect-[4/5]"
              zoomOnHover
              className="sm:col-span-1"
            />
          </Reveal>
        </Container>
      </section>

      {/* Stats */}
      <section className="pb-16 lg:pb-24">
        <Container>
          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
          >
            {STATS.map((stat) => (
              <motion.div key={stat.id} variants={staggerItem} className="text-center">
                <p className="text-heading-xl font-bold text-gradient">
                  <AnimatedNumber value={stat.value} decimals={stat.decimals || 0} suffix={stat.suffix} />
                </p>
                <p className="mt-2 text-body-sm text-ink-500">{t(`stats.${stat.id}`)}</p>
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* Values */}
      <section className="bg-sand-50 py-20 lg:py-28">
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
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {COMPANY_VALUES.map((value) => (
              <motion.div
                key={value.id}
                variants={staggerItem}
                className="rounded-2xl border border-ink-100 bg-white p-6 shadow-soft"
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

      {/* Timeline */}
      <section className="py-20 lg:py-28">
        <Container size="md">
          <SectionHeading
            eyebrow={t("pages.about.milestonesEyebrow")}
            title={t("pages.about.milestonesTitle")}
          />
          <motion.ol
            variants={staggerContainer(0.12)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="relative mt-14 border-l border-ink-200 pl-8"
          >
            {COMPANY_MILESTONES.map((m) => (
              <motion.li key={m.id} variants={staggerItem} className="relative mb-10 last:mb-0">
                <span className="absolute -left-[2.15rem] top-1 grid size-7 place-items-center rounded-full border-2 border-white bg-brand-600 text-caption font-bold text-white shadow-soft">
                  ✦
                </span>
                <p className="text-caption font-bold uppercase tracking-wider text-brand-600">
                  {m.year}
                </p>
                <h3 className="mt-1 text-heading-sm text-ink-900">
                  {t(`milestones.${m.id}.title`)}
                </h3>
                <p className="mt-1 text-body-md text-ink-500">
                  {t(`milestones.${m.id}.description`)}
                </p>
              </motion.li>
            ))}
          </motion.ol>
        </Container>
      </section>

      {/* Team */}
      <section className="bg-sand-50 py-20 lg:py-28">
        <Container>
          <SectionHeading
            eyebrow={t("pages.about.teamEyebrow")}
            title={t("pages.about.teamTitle")}
          />
          <motion.div
            variants={staggerContainer(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {LEADERSHIP.map((person) => (
              <motion.div
                key={person.id}
                variants={staggerItem}
                className="rounded-2xl border border-ink-100 bg-white p-6 text-center shadow-soft"
              >
                <Image
                  src={person.photo}
                  alt={person.name}
                  rounded="rounded-2xl"
                  zoomOnHover
                  className="mx-auto size-20"
                  gradient="from-brand-500 to-brand-700"
                />
                <h3 className="mt-4 text-body-md font-semibold text-ink-900">
                  {person.name}
                </h3>
                <p className="text-body-sm font-medium text-brand-600">
                  {t(`leadership.${person.id}.role`)}
                </p>
                <p className="mt-2 text-body-sm text-ink-500">
                  {t(`leadership.${person.id}.bio`)}
                </p>
              </motion.div>
            ))}
          </motion.div>
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
