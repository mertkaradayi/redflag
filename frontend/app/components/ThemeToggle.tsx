"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Ensure theme always stays in "system" mode to follow system changes
  useEffect(() => {
    if (mounted && theme !== "system") {
      setTheme("system");
    }
  }, [mounted, theme, setTheme]);

  if (!mounted) {
    return (
      <button
        className="flex items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D12226]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="Theme indicator"
      >
        <Sun className="h-5 w-5" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div
      className="flex items-center justify-center rounded-full p-2 text-muted-foreground"
      title="Theme automatically follows system appearance"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </div>
  );
}

