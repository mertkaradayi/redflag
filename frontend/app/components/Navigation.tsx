"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Github, Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTrigger,
} from "@/components/ui/sheet";
import BrandLogo from "./BrandLogo";
import ThemeToggle from "./ThemeToggle";

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

  const NavLinks = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {NAV_LINKS.map((link) => {
        const isExternal = 'external' in link && link.external === true;
        const isActive = !isExternal && isLinkActive(pathname, link.href);

        const linkContent = (
          <Link
            key={link.href}
            href={link.href}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            prefetch={isExternal ? false : undefined}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 sm:px-4 sm:text-sm",
              "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D12226]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isActive
                ? "bg-[#D12226] text-white shadow-[0_0_25px_rgba(209,34,38,0.45)]"
                : "text-muted-foreground",
              isMobile && "w-full justify-between rounded-2xl px-4 py-3 text-base",
            )}
          >
            <span className="flex items-center gap-2 truncate">
              {link.label === "GitHub" ? <Github className="h-4 w-4 shrink-0" aria-hidden /> : null}
              <span className="truncate">{link.label}</span>
            </span>
            {isMobile && isExternal ? (
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            ) : null}
          </Link>
        );

        return isMobile ? (
          <SheetClose asChild key={link.href}>
            {linkContent}
          </SheetClose>
        ) : (
          linkContent
        );
      })}
    </>
  );

  return (
    <>
      {/* Desktop Navigation */}
      <nav
        className={cn(
          "hidden flex-wrap items-center justify-end gap-x-3 gap-y-2 text-sm text-muted-foreground sm:flex sm:gap-x-4",
          className,
        )}
      >
        <NavLinks />
      </nav>

      {/* Mobile Navigation */}
      <Sheet>
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
          className="flex h-full w-[min(90vw,320px)] flex-col gap-0 border-l border-border/60 bg-white/95 px-0 pb-6 pt-6 text-foreground backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/95 dark:text-white sm:hidden"
        >
          <div className="flex items-center justify-between gap-4 border-b border-border/60 px-5 pb-4">
            <BrandLogo className="h-8" wrapperClassName="flex-shrink-0" priority />
            <SheetClose asChild>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/80 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </SheetClose>
          </div>
          <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-6">
            <NavLinks isMobile={true} />
          </nav>
          <div className="flex flex-col gap-3 border-t border-border/60 px-5 pt-4">
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Theme</div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/40 px-4 py-3">
              <span className="text-sm text-muted-foreground">Toggle appearance</span>
              <ThemeToggle />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function isLinkActive(pathname: string | null, href: string) {
  if (!pathname) {
    return false;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
