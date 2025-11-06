"use client";

import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import darkHorizontal from "@/images/dark mode horizontal.png";
import darkWhole from "@/images/dark mode whole.png";
import lightHorizontal from "@/images/Light mode horizontal.png";
import lightWhole from "@/images/light mode whole.png";

type BrandVariant = "horizontal" | "whole";

const darkLogoMap: Record<BrandVariant, string | StaticImageData> = {
  horizontal: darkHorizontal,
  whole: darkWhole,
};

const lightLogoMap: Record<BrandVariant, string | StaticImageData> = {
  horizontal: lightHorizontal,
  whole: lightWhole,
};

interface BrandLogoProps {
  variant?: BrandVariant;
  wrapperClassName?: string;
  className?: string;
  priority?: boolean;
  href?: string;
  ariaLabel?: string;
}

export default function BrandLogo({
  variant = "horizontal",
  wrapperClassName,
  className,
  priority,
  href = "/",
  ariaLabel = "Go to homepage",
}: BrandLogoProps) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use light logos for light mode, dark logos for dark mode
  const logo = mounted && resolvedTheme === "dark" ? darkLogoMap[variant] : lightLogoMap[variant];

  const content = (
    <Image
      src={logo}
      alt="RedFlag logo"
      className={cn("h-9 w-auto", className)}
      priority={priority}
    />
  );

  if (!href) {
    return <div className={cn("relative flex items-center", wrapperClassName)}>{content}</div>;
  }

  return (
    <Link href={href} aria-label={ariaLabel} className={cn("relative flex items-center", wrapperClassName)}>
      {content}
    </Link>
  );
}
