import { Spinner } from "@/components/ui/Spinner";
import { useTranslation } from "@/i18n";

/*
 * PageLoader
 * ----------
 * Suspense fallback for lazily-loaded routes. Deliberately minimal so a route
 * swap reads as instant rather than as a heavy loading screen.
 */

export function PageLoader() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Spinner size="lg" label={t("common.loadingPage")} />
    </div>
  );
}

export default PageLoader;
