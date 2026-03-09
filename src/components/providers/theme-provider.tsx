"use client";

import * as React from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ui-theme",
  enableSystem = true,
  disableTransitionOnChange = false,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(defaultTheme);
  const [mounted, setMounted] = React.useState(false);

  // Set mounted state after hydration
  React.useEffect(() => {
    setMounted(true);
    
    // Load theme from localStorage
    try {
      const storedTheme = localStorage.getItem(storageKey) as Theme;
      if (storedTheme) {
        setTheme(storedTheme);
      }
    } catch {
      // Ignore storage errors (private browsing, SSR, etc.)
    }
  }, [storageKey]);

  React.useEffect(() => {
    if (!mounted) return;
    
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system" && enableSystem) {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        if (theme === "system") {
          root.classList.remove("light", "dark");
          root.classList.add(e.matches ? "dark" : "light");
        }
      };

      mediaQuery.addEventListener("change", handleSystemThemeChange);
      
      return () => {
        mediaQuery.removeEventListener("change", handleSystemThemeChange);
      };
    }

    root.classList.add(theme);
  }, [theme, enableSystem, mounted]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      if (mounted) {
        try {
          localStorage.setItem(storageKey, theme);
        } catch {
          // Ignore storage errors (private browsing, etc.)
        }
      }
      setTheme(theme);
    },
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <ThemeProviderContext.Provider {...props} value={value}>
        {children}
      </ThemeProviderContext.Provider>
    );
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
