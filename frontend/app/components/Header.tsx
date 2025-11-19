"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import BrandLogo from "./BrandLogo";
import { DesktopNavigation, MobileNavigation } from "./Navigation";
import ThemeToggle from "./ThemeToggle";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  className?: string;
}

export default function Header({ className }: HeaderProps) {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "sticky top-0 z-50 w-full border-b border-neutral-200/40 bg-white/75 backdrop-blur-2xl dark:border-white/5 dark:bg-neutral-950/75 supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-neutral-950/60",
        className,
      )}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between px-6">
        <div className="flex items-center shrink-0 -ml-2">
          <BrandLogo className="h-8 sm:h-9" priority wrapperClassName="flex-shrink-0" />
        </div>

        <div className="flex items-center gap-4 lg:gap-8">
          <DesktopNavigation />

          <div className="hidden h-6 w-px bg-neutral-200/60 dark:bg-white/10 lg:block" />

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <Button
              asChild
              variant="default"
              size="sm"
              className="hidden h-10 rounded-full bg-[#D12226] px-6 text-sm font-medium text-white shadow-lg shadow-[#D12226]/20 transition-all hover:bg-[#D12226]/90 hover:shadow-[#D12226]/40 hover:scale-105 active:scale-95 dark:bg-[#D12226] dark:text-white lg:inline-flex"
            >
              <Link href="/dashboard">
                Dashboard <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>

            <MobileNavigation />
          </div>
        </div>
      </div>
    </motion.header>
  );
}
