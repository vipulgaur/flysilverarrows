import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";

type Theme = "light" | "dark";
const THEME_KEY = "silverarrows-theme";
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [ready, setReady] = useState(false);
  const { log } = useStore();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch { /* Appearance remains usable when storage is blocked. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* Keep the in-memory choice. */ }
  }, [theme, ready]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    log("appearance_changed", "user", `Switched to ${next} appearance`);
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

/** Safe fallback so a component rendered outside the provider (or during a hot reload) never blanks the screen. */
const fallback = { theme: "dark" as Theme, toggleTheme: () => {} };

export function useTheme() {
  return useContext(ThemeContext) ?? fallback;
}