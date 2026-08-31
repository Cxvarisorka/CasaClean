import { AppProviders } from "@/app/providers";
import { AppRouter } from "@/app/router";
import { SchemaMarkup, organizationSchema, websiteSchema } from "@/seo";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

/*
 * App
 * ---
 * The application root. It wires global providers around the router and ships
 * the site-wide Organization/WebSite structured data every page's own schema
 * refers to by `@id`. Page meta — title, description, canonical, share card —
 * belongs to the page, via <Seo>.
 *
 * Deliberately NOT a <Seo> block. Under React 19 react-helmet-async renders
 * each instance's tags natively instead of merging them, so a title or canonical
 * declared here would not be *overridden* by the page's — it would sit beside
 * it, and a crawler reading the first of two <title> elements would see the
 * app-level one on every page of the site. Structured data is the one part that
 * is genuinely additive: JSON-LD blocks accumulate by design.
 */

const App = () => {
  return (
    <AppProviders>
      <SchemaMarkup schema={[organizationSchema(), websiteSchema()]} />
      <AppRouter />
      <Analytics />
      <SpeedInsights />
    </AppProviders>
  );
};

export default App;
