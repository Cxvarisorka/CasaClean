import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
import { QueryProvider } from "./QueryProvider";
import { ThemeProvider } from "./ThemeProvider";
import { MotionProvider } from "./MotionProvider";
import { I18nProvider } from "@/i18n";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

/*
 * AppProviders
 * ------------
 * Composes every global provider in a single, deliberate order so App.jsx
 * stays declarative. Order matters: ErrorBoundary is outermost (catches all),
 * Helmet manages <head>, Router supplies location, Query supplies data,
 * Theme/Motion wrap the rendered UI.
 */

export function AppProviders({ children }) {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <BrowserRouter>
          <QueryProvider>
            <I18nProvider>
              <ThemeProvider>
                <MotionProvider>{children}</MotionProvider>
              </ThemeProvider>
            </I18nProvider>
          </QueryProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default AppProviders;
