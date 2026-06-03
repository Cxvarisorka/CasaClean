import { useContext } from "react";
import { I18nContext } from "./context";

/**
 * useTranslation — the consumer hook for the i18n system.
 * @returns {{ t: Function, locale: string, setLocale: Function, languages: Array }}
 */
export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx)
    throw new Error("useTranslation must be used within <I18nProvider>");
  return ctx;
}
