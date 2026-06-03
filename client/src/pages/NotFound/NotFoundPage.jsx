import { motion } from "framer-motion";
import { ArrowLeft, Home, Search } from "lucide-react";
import { Page } from "@/components/shared/Page";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Seo } from "@/seo";
import { PAGE_META } from "@/constants/metadata";
import { ROUTES } from "@/constants/routes";

/*
 * NotFoundPage
 * ------------
 * A friendly, on-brand 404 with clear ways back into the product. Marked
 * noindex so it never pollutes search results.
 */

const NotFoundPage = () => {
  return (
    <Page>
      <Seo {...PAGE_META.notFound} noIndex />

      <section className="relative flex min-h-[80vh] items-center overflow-hidden bg-grid">
        <div className="pointer-events-none absolute inset-0 bg-brand-glow" aria-hidden="true" />
        <Container className="relative">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-xl text-center"
          >
            <p className="text-display font-bold text-gradient">404</p>
            <h1 className="mt-2 text-heading-lg text-ink-900">
              This page checked out early
            </h1>
            <p className="mt-4 text-body-lg text-ink-500">
              The page you're looking for doesn't exist or has moved. Let's get
              you back to a clean space.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button to={ROUTES.home} size="lg" leftIcon={Home}>
                Back home
              </Button>
              <Button to={ROUTES.services} size="lg" variant="outline" leftIcon={Search}>
                Browse services
              </Button>
            </div>

            <button
              type="button"
              onClick={() => window.history.back()}
              className="mt-6 inline-flex items-center gap-1.5 text-body-sm font-medium text-ink-500 transition-colors hover:text-ink-800"
            >
              <ArrowLeft className="size-4" /> Go back
            </button>
          </motion.div>
        </Container>
      </section>
    </Page>
  );
};

export default NotFoundPage;
