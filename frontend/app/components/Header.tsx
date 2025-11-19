"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import BrandLogo from "./BrandLogo";
import Navigation from "./Navigation";
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
        "group relative flex w-full items-center justify-between gap-4 rounded-full border border-white/20 bg-white/60 px-3 py-3 pl-5 text-sm shadow-2xl shadow-black/5 backdrop-blur-2xl transition-all hover:border-white/30 hover:shadow-black/10 dark:border-white/10 dark:bg-black/60 dark:shadow-black/20 dark:hover:border-white/20 dark:hover:shadow-black/40 sm:px-4 sm:pl-6 lg:gap-6",
        className,
      )}
    >
      <div className="flex items-center shrink-0">
        <BrandLogo className="h-8 sm:h-9" priority wrapperClassName="flex-shrink-0" />
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <Navigation />

        <div className="hidden h-6 w-px bg-zinc-200 dark:bg-zinc-800 sm:block" />

        <div className="flex items-center gap-2">
          <ThemeToggle />
          
          <Button
            asChild
            variant="default"
            size="sm"
            className="hidden rounded-full bg-[#D12226] px-5 font-medium text-white shadow-lg shadow-[#D12226]/20 transition-all hover:bg-[#D12226]/90 hover:shadow-[#D12226]/40 hover:scale-105 active:scale-95 dark:bg-[#D12226] dark:text-white sm:inline-flex"
          >
            <Link href="/analyze">
              Analyze <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Subtle ambient glow effect */}
      <div className="pointer-events-none absolute -inset-px -z-10 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent dark:via-white/5" />
      </div>
    </motion.header>
  );
}
