import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatusBannerProps {
  variant: "success" | "error";
  title: string;
  children: ReactNode;
}

const variantStyles: Record<StatusBannerProps["variant"], string> = {
  success:
    "border-green-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-100",
  error:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-800/60 dark:bg-red-900/20 dark:text-red-100",
};

export function StatusBanner({ variant, title, children }: StatusBannerProps) {
  return (
    <div className={cn("rounded-lg border p-4 text-sm leading-relaxed", variantStyles[variant])}>
      <p className="mb-2 font-medium">{title}</p>
      <div className="space-y-1 text-xs sm:text-sm">{children}</div>
    </div>
  );
}
