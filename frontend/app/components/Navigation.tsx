"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ExternalLink, Github, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import BrandLogo from "./BrandLogo";

type NavLink =
  | { label: string; href: string; external?: never }
  | { label: string; href: string; external: true };

const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Analyze", href: "/analyze" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Deployments", href: "/deployments" },
  {
    label: "GitHub",
    href: "https://github.com/mertkaradayi/redflag",
    external: true,
  },
];

interface NavigationProps {
  className?: string;
}

export default function Navigation({ className }: NavigationProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  // Desktop Navigation
  const DesktopNav = () => (
    <nav
      className={cn(
        "hidden items-center gap-1 text-sm font-medium sm:flex",
        className,
      )}
      onMouseLeave={() => setHoveredPath(null)}
    >
      {NAV_LINKS.map((link) => {
        const isExternal = "external" in link && link.external === true;
        const isActive = !isExternal && isLinkActive(pathname, link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className={cn(
              "relative px-4 py-2 transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive ? "text-foreground" : "text-muted-foreground",
            )}
            onMouseEnter={() => setHoveredPath(link.href)}
          >
            <span className="relative z-10 flex items-center gap-2">
              {link.label === "GitHub" && <Github className="h-4 w-4" />}
              {link.label}
            </span>
            {isActive && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-0 rounded-full bg-muted/60 dark:bg-white/10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {hoveredPath === link.href && !isActive && (
              <motion.div
                layoutId="nav-hover"
                className="absolute inset-0 rounded-full bg-muted/40 dark:bg-white/5"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );

  // Mobile Navigation
  const MobileNav = () => (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          className="flex items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D12226]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        hideClose
        className="flex h-full w-full flex-col gap-0 border-l border-border/60 bg-background/95 px-0 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+1.5rem)] text-foreground backdrop-blur-2xl dark:border-white/10 dark:bg-black/90 sm:max-w-sm"
      >
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <div className="flex items-center justify-between border-b border-border/40 px-6 pb-6">
          <BrandLogo className="h-8" wrapperClassName="flex-shrink-0" priority />
          <SheetClose asChild>
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-muted/30 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </SheetClose>
        </div>
        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-6 py-8">
          {NAV_LINKS.map((link, idx) => {
            const isExternal = "external" in link && link.external === true;
            const isActive = !isExternal && isLinkActive(pathname, link.href);

            return (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + idx * 0.05, duration: 0.3 }}
              >
                <SheetClose asChild>
                  <Link
                    href={link.href}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className={cn(
                      "group flex w-full items-center justify-between rounded-xl px-5 py-4 text-lg font-medium transition-all active:scale-95",
                      isActive
                        ? "bg-foreground text-background shadow-lg dark:bg-white dark:text-black"
                        : "bg-muted/30 text-foreground/80 hover:bg-muted/50 hover:text-foreground dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      {link.label === "GitHub" && <Github className="h-5 w-5" />}
                      {link.label}
                    </span>
                    {isExternal && <ExternalLink className="h-4 w-4 opacity-50" />}
                  </Link>
                </SheetClose>
              </motion.div>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );

  return (
    <>
      <DesktopNav />
      <MobileNav />
    </>
  );
}

function isLinkActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
