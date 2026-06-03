import { createContext, useContext } from "react";

/*
 * ThemeProvider
 * -------------
 * CasaClean ships a single, carefully-tuned light brand theme (defined as
 * tokens in globals.css). This provider exposes that theme via context so the
 * surface is ready for future multi-theme support without a refactor — the
 * consuming API (`useTheme`) won't change when more themes are added.
 */

const ThemeContext = createContext({ theme: "light" });

export function ThemeProvider({ children, theme = "light" }) {
  return (
    <ThemeContext.Provider value={{ theme }}>{children}</ThemeContext.Provider>
  );
}

// Provider + its consumer hook intentionally live together (standard context
// pattern); the hook export is safe to co-locate here.
// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);

export default ThemeProvider;
