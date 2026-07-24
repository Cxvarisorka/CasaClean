import { Component } from "react";
import { Button } from "@/components/ui/Button";
import { translate } from "@/i18n/context";
import { resolveLocale, STORAGE_KEY } from "@/i18n/config";

/*
 * ErrorBoundary
 * -------------
 * Catches render-time errors in its subtree and shows a recoverable fallback
 * instead of a blank screen. Wraps the app shell and lazy route boundaries.
 * (Class component is required — hooks can't implement error boundaries.)
 *
 * It sits above <I18nProvider>, so it can't consume the i18n context. Instead it
 * resolves the persisted locale directly and translates via the pure `translate`
 * helper, falling back to English if storage is unavailable.
 */

const tt = (key) => {
  let locale;
  try {
    locale = resolveLocale(
      window.localStorage.getItem(STORAGE_KEY) || window.navigator.language
    );
  } catch {
    locale = undefined;
  }
  return translate(resolveLocale(locale), key);
};

export class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // In production this is where we'd forward to an error reporter.
    if (import.meta.env.DEV) console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <h1 className="text-heading-lg text-ink-900">
            {tt("errorBoundary.title")}
          </h1>
          <p className="mt-3 max-w-md text-body-md text-ink-500">
            {tt("errorBoundary.description")}
          </p>
          <Button className="mt-8" onClick={this.handleReset}>
            {tt("errorBoundary.reload")}
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
