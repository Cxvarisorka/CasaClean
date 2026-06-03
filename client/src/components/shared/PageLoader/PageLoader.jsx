import { Spinner } from "@/components/ui/Spinner";

/*
 * PageLoader
 * ----------
 * Suspense fallback for lazily-loaded routes. Deliberately minimal so a route
 * swap reads as instant rather than as a heavy loading screen.
 */

export function PageLoader() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Spinner size="lg" label="Loading page" />
    </div>
  );
}

export default PageLoader;
