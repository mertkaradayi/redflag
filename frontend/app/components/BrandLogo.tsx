import Link from "next/link";
import Image, { type StaticImageData } from "next/image";

import { cn } from "@/lib/utils";

import darkHorizontal from "@/images/dark mode horizontal.png";
import darkWhole from "@/images/dark mode whole.png";
import lightHorizontal from "@/images/Light mode horizontal.png";
import lightWhole from "@/images/light mode whole.png";

type BrandVariant = "horizontal" | "whole";

const logoMap: Record<
  BrandVariant,
  {
    light: string | StaticImageData;
    dark: string | StaticImageData;
  }
> = {
  horizontal: {
    light: lightHorizontal,
    dark: darkHorizontal,
  },
  whole: {
    light: lightWhole,
    dark: darkWhole,
  },
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
  const assets = logoMap[variant];
  const content = (
    <>
      <Image
        src={assets.light}
        alt="RedFlag logo"
        className={cn("h-9 w-auto dark:hidden", className)}
        priority={priority}
      />
      <Image
        src={assets.dark}
        alt="RedFlag logo"
        className={cn("hidden h-9 w-auto dark:block", className)}
        priority={priority}
      />
    </>
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
