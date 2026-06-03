import { Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import { Page } from "@/components/shared/Page";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/sections";
import { Reveal } from "@/components/shared/Reveal";
import { ContactForm } from "@/features/contact";
import { Seo } from "@/seo";
import { PAGE_META } from "@/constants/metadata";
import { SITE } from "@/constants/metadata";
import { IMAGES } from "@/constants/images";
import { useTranslation } from "@/i18n";

/*
 * ContactPage
 * -----------
 * A two-column contact layout: reassuring contact channels alongside the
 * validated ContactForm (which owns its own submission + success states).
 */

const ContactPage = () => {
  const { t } = useTranslation();

  const CHANNELS = [
    {
      icon: Mail,
      label: t("pages.contact.emailLabel"),
      value: SITE.email,
      href: `mailto:${SITE.email}`,
      note: t("pages.contact.emailNote"),
    },
    {
      icon: Phone,
      label: t("pages.contact.phoneLabel"),
      value: SITE.phone,
      href: "tel:+390612345678",
      note: t("pages.contact.phoneNote"),
    },
    {
      icon: MapPin,
      label: t("pages.contact.visitLabel"),
      value: `${SITE.address.street}, ${SITE.address.city}`,
      note: t("pages.contact.visitNote"),
    },
  ];

  return (
    <Page>
      <Seo {...PAGE_META.contact} />

      <PageHero
        image={IMAGES.bathroom}
        eyebrow={t("pages.contact.heroEyebrow")}
        title={t("pages.contact.heroTitle")}
        subtitle={t("pages.contact.heroSubtitle")}
      />

      <section className="pb-20 lg:pb-28">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            {/* Channels */}
            <Reveal className="space-y-4">
              {CHANNELS.map((channel) => {
                const Inner = (
                  <>
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                      <channel.icon className="size-6" />
                    </span>
                    <div>
                      <p className="text-body-sm font-semibold text-ink-900">
                        {channel.label}
                      </p>
                      <p className="text-body-md text-ink-700">{channel.value}</p>
                      <p className="mt-0.5 text-caption text-ink-400">{channel.note}</p>
                    </div>
                  </>
                );
                return channel.href ? (
                  <a
                    key={channel.label}
                    href={channel.href}
                    className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-soft transition-shadow hover:shadow-medium"
                  >
                    {Inner}
                  </a>
                ) : (
                  <div
                    key={channel.label}
                    className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-soft"
                  >
                    {Inner}
                  </div>
                );
              })}

              <div className="flex items-start gap-4 rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-brand-600 shadow-soft">
                  <MessageSquare className="size-6" />
                </span>
                <div>
                  <p className="text-body-sm font-semibold text-ink-900">
                    {t("pages.contact.pmTitle")}
                  </p>
                  <p className="text-body-sm text-ink-600">
                    {t("pages.contact.pmNote")}
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Form */}
            <Reveal delay={0.1}>
              <div className="rounded-3xl border border-ink-100 bg-white p-7 shadow-medium sm:p-9">
                <h2 className="text-heading-md text-ink-900">
                  {t("pages.contact.formTitle")}
                </h2>
                <p className="mt-1.5 text-body-md text-ink-500">
                  {t("pages.contact.formSubtitle")}
                </p>
                <div className="mt-7">
                  <ContactForm />
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
    </Page>
  );
};

export default ContactPage;
