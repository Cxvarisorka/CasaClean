import { Page } from "@/components/shared/Page";
import { CtaSection } from "@/components/sections/CtaSection";
import { Seo, faqSchema, localBusinessSchema, webPageSchema } from "@/seo";
import { PAGE_META } from "@/constants/metadata";
import { HOME_FAQS } from "@/data/faq";
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
        schema={[
          webPageSchema({ ...PAGE_META.home, type: "WebPage" }),
          localBusinessSchema(),
          /*
           * The same five questions FaqPreviewSection renders below, and only
           * those. FAQ markup has to match what a visitor can actually read on
           * the page — marking up the full nine while showing five is the
           * mismatch Google's FAQ policy singles out.
           */
          faqSchema(HOME_FAQS),
        ]}
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
