import { Component } from "react";
import { Button } from "@/components/ui/Button";

/*
 * ErrorBoundary
 * -------------
 * Catches render-time errors in its subtree and shows a recoverable fallback
 * instead of a blank screen. Wraps the app shell and lazy route boundaries.
 * (Class component is required — hooks can't implement error boundaries.)
 */

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
          <h1 className="text-heading-lg text-ink-900">Something went wrong</h1>
          <p className="mt-3 max-w-md text-body-md text-ink-500">
            An unexpected error occurred. Refreshing the page usually fixes it.
          </p>
          <Button className="mt-8" onClick={this.handleReset}>
            Reload page
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
