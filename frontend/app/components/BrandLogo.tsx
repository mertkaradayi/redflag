import Link from "next/link";
import Image, { type StaticImageData } from "next/image";

import { cn } from "@/lib/utils";

import darkHorizontal from "@/images/dark mode horizontal.png";
import darkWhole from "@/images/dark mode whole.png";

type BrandVariant = "horizontal" | "whole";

const logoMap: Record<BrandVariant, string | StaticImageData> = {
  horizontal: darkHorizontal,
  whole: darkWhole,
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
  const logo = logoMap[variant];
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
