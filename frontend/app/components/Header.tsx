"use client";

import BrandLogo from "./BrandLogo";
import Navigation from "./Navigation";
import { cn } from "@/lib/utils";

interface HeaderProps {
  className?: string;
}

export default function Header({ className }: HeaderProps) {
  return (
    <header
      className={cn(
        "flex w-full flex-row items-center justify-between gap-4 lg:gap-6",
        className,
      )}
    >
      <div className="flex items-center flex-shrink-0">
        <BrandLogo className="h-9" priority wrapperClassName="flex-shrink-0" />
      </div>
      <div className="flex items-center">
        <Navigation />
      </div>
    </header>
  );
}

