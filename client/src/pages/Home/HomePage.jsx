import { Page } from "@/components/shared/Page";
import { CtaSection } from "@/components/sections/CtaSection";
import { Seo, faqSchema, localBusinessSchema } from "@/seo";
import { PAGE_META } from "@/constants/metadata";
import { ALL_FAQS } from "@/data/faq";
import {
  HeroSection,
  TrustedBySection,
  ServicesOverviewSection,
  WhyCasaCleanSection,
  WorkflowSection,
  ProcessTimelineSection,
  BeforeAfterSection,
  TestimonialsSection,
  StatsSection,
  FaqPreviewSection,
} from "./sections";

/*
 * HomePage
 * --------
 * The landing experience, composed entirely from section components. The page
 * itself is a thin orchestrator (composition over a god-component): it sets SEO
 * + structured data and lays out the section sequence in narrative order.
 */

const HomePage = () => {
  return (
    <Page>
      <Seo
        {...PAGE_META.home}
        schema={[localBusinessSchema(), faqSchema(ALL_FAQS.slice(0, 5))]}
      />

      <HeroSection />
      <TrustedBySection />
      <ServicesOverviewSection />
      <WhyCasaCleanSection />
      <WorkflowSection />
      <ProcessTimelineSection />
      <BeforeAfterSection />
      <StatsSection />
      <TestimonialsSection />
      <FaqPreviewSection />
      <CtaSection />
    </Page>
  );
};

export default HomePage;
