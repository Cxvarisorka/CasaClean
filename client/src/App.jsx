import { AppProviders } from "@/app/providers";
import { AppRouter } from "@/app/router";
import { Seo, organizationSchema, websiteSchema } from "@/seo";

/*
 * App
 * ---
 * The application root. It wires global providers around the router and ships
 * site-wide SEO defaults plus Organization/WebSite structured data (present on
 * every page). Page-specific SEO is layered on top by each page via <Seo>.
 */

const App = () => {
  return (
    <AppProviders>
      <Seo
        title="CasaClean — Premium Turnover Cleaning for Vacation Rentals"
        path="/"
        schema={[organizationSchema(), websiteSchema()]}
      />
      <AppRouter />
    </AppProviders>
  );
};

export default App;
