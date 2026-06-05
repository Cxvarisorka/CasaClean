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
import { useEffect } from "react";

/*
 * HomePage
 * --------
 * The landing experience, composed entirely from section components. The page
 * itself is a thin orchestrator (composition over a god-component): it sets SEO
 * + structured data and lays out the section sequence in narrative order.
 */

const HomePage = () => {

  useEffect(() => {

    const authMe = async () => {

      const req = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/me`, {
        credentials: "include"
      })

      const res = await req.json();

      if (!req.ok) {
        throw new Error(res.message || "Failed to authenticate");
      }

    };

    authMe();


  }, [])

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
