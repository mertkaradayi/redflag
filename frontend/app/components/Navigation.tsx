"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Github, Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

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

        return (
          <Link
            key={link.href}
            href={link.href}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            prefetch={isExternal ? false : undefined}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200 sm:px-4 sm:text-sm",
              "hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D12226]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
              isActive
                ? "bg-[#D12226] text-white shadow-[0_0_25px_rgba(209,34,38,0.45)]"
                : "text-zinc-300",
              isMobile && "w-full",
            )}
          >
            {link.label === "GitHub" ? <Github className="h-4 w-4" aria-hidden /> : null}
            <span>{link.label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Desktop Navigation */}
      <nav
        className={cn(
          "hidden flex-wrap items-center justify-end gap-x-3 gap-y-2 text-sm text-zinc-300 sm:flex sm:gap-x-4",
          className,
        )}
      >
        <NavLinks />
      </nav>

      {/* Mobile Navigation */}
      <Sheet>
        <SheetTrigger asChild>
          <button
            className="flex items-center justify-center rounded-full p-2 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D12226]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[300px] bg-black border-l border-white/10">
          <nav className="flex flex-col gap-4 mt-8">
            <NavLinks isMobile={true} />
          </nav>
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
