"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/providers/theme-provider";
import { MoonIcon, SunIcon, MonitorIcon } from "lucide-react";

interface FloatingThemeToggleProps {
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  className?: string;
}

export function FloatingThemeToggle({ 
  position = "bottom-right",
  className = ""
}: FloatingThemeToggleProps) {
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
        return <SunIcon className="h-5 w-5" />;
      case "dark":
        return <MoonIcon className="h-5 w-5" />;
      case "system":
        return <MonitorIcon className="h-5 w-5" />;
      default:
        return <SunIcon className="h-5 w-5" />;
    }
  };

  const getTooltip = () => {
    switch (theme) {
      case "light":
        return "Beralih ke Dark Mode";
      case "dark":
        return "Beralih ke System Mode";
      case "system":
        return "Beralih ke Light Mode";
      default:
        return "Ganti Theme";
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case "bottom-right":
        return "bottom-6 right-6";
      case "bottom-left":
        return "bottom-6 left-6";
      case "top-right":
        return "top-6 right-6";
      case "top-left":
        return "top-6 left-6";
      default:
        return "bottom-6 right-6";
    }
  };

  return (
    <div className={`fixed ${getPositionClasses()} z-50 ${className}`}>
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        className="relative h-12 w-12 rounded-full shadow-lg border-2 border-border/50 bg-background/90 backdrop-blur-sm hover:bg-accent transition-all duration-300 hover:scale-110 hover:shadow-xl group"
        title={getTooltip()}
      >
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-400/20 via-pink-500/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="relative z-10 text-foreground transition-transform duration-200 group-hover:rotate-12">
          {getIcon()}
        </div>
      </Button>
    </div>
  );
}