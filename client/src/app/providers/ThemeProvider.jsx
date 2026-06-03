import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/*
 * ThemeProvider
 * -------------
 * Owns the active color theme: "light", "dark" or "system" (follow the OS).
 * It persists the choice, keeps the `.dark` class on <html> in sync (which is
 * what flips every design token in globals.css), and—when set to "system"—
 * reacts to OS changes live. An inline script in index.html applies the class
 * before first paint, so this provider only has to keep it consistent.
 */

const STORAGE_KEY = "casaclean:theme";
const THEMES = ["light", "dark", "system"];

const ThemeContext = createContext(null);

const getSystemTheme = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

const readStored = () => {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return THEMES.includes(stored) ? stored : "system";
};

/** Reflect the resolved theme onto <html> for token-based styling. */
const applyClass = (resolved) => {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStored);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  const resolvedTheme = theme === "system" ? systemTheme : theme;

  // Keep <html> in sync whenever the resolved theme changes.
  useEffect(() => {
    applyClass(resolvedTheme);
  }, [resolvedTheme]);

  // Track OS preference so "system" updates live.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => setSystemTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((next) => {
    const value = THEMES.includes(next) ? next : "system";
    setThemeState(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* storage unavailable — keep in-memory theme only */
    }
  }, []);

  // Toggle flips between the two concrete themes based on what's showing.
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme, themes: THEMES }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

// Provider + its consumer hook intentionally live together (standard context
// pattern); the hook export is safe to co-locate here.
// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
};

export default ThemeProvider;
