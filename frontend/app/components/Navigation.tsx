"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Github } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Analyze", href: "/analyze" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Deployments", href: "/deployments" },
  {
    label: "GitHub",
    href: "https://github.com/mertkaradayi/redflag",
    external: true,
  },
] as const;

interface NavigationProps {
  className?: string;
}

export default function Navigation({ className }: NavigationProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-zinc-300 sm:w-auto sm:justify-end",
        className,
      )}
    >
      {NAV_LINKS.map((link) => {
        const isActive = !link.external && isLinkActive(pathname, link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noopener noreferrer" : undefined}
            prefetch={link.external ? false : undefined}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-1.5 font-medium transition-colors duration-200",
              "hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D12226]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
              isActive
                ? "bg-[#D12226] text-white shadow-[0_0_25px_rgba(209,34,38,0.45)]"
                : "text-zinc-300",
            )}
          >
            {link.label === "GitHub" ? <Github className="h-4 w-4" aria-hidden /> : null}
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
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
