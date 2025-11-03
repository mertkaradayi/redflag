"use client";

import BrandLogo from "./BrandLogo";
import Navigation from "./Navigation";
import ThemeToggle from "./ThemeToggle";
import { cn } from "@/lib/utils";

interface HeaderProps {
  className?: string;
}

export default function Header({ className }: HeaderProps) {
  return (
    <header
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-full border border-border/50 bg-background/30 px-5 py-3 text-sm shadow-[0_18px_45px_rgba(0,0,0,0.45)] dark:shadow-[0_18px_45px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-colors supports-[backdrop-filter]:bg-background/20 dark:supports-[backdrop-filter]:bg-black/20 sm:px-6 lg:gap-6",
        className,
      )}
    >
      <div className="flex items-center shrink-0">
        <BrandLogo className="h-9" priority wrapperClassName="flex-shrink-0" />
      </div>
      <div className="flex items-center gap-2">
        <Navigation />
        <ThemeToggle />
      </div>
    </header>
  );
}
