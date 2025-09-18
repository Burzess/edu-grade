"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/providers/theme-provider";
import { MoonIcon, SunIcon, MonitorIcon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const getIcon = () => {
    switch (theme) {
      case "light":
        return <SunIcon className="h-4 w-4" />;
      case "dark":
        return <MoonIcon className="h-4 w-4" />;
      case "system":
        return <MonitorIcon className="h-4 w-4" />;
      default:
        return <SunIcon className="h-4 w-4" />;
    }
  };

  const getTooltip = () => {
    switch (theme) {
      case "light":
        return "Switch to Dark Mode";
      case "dark":
        return "Switch to System Mode";
      case "system":
        return "Switch to Light Mode";
      default:
        return "Toggle Theme";
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative h-9 w-9 rounded-lg border border-border hover:bg-accent transition-all duration-200"
      title={getTooltip()}
    >
      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 opacity-0 hover:opacity-20 transition-opacity duration-200" />
      <div className="relative z-10 text-foreground">
        {getIcon()}
      </div>
    </Button>
  );
}
