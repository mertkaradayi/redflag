import type { AnalyzedContract } from "./types";

export type RiskLevel = AnalyzedContract["analysis"]["risk_level"];

const riskLevelTokens: Record<
  RiskLevel,
  {
    badge: string;
    emphasis: string;
    subtle: string;
    icon: string;
  }
> = {
  critical: {
    badge:
      "bg-red-100 dark:bg-red-950/20 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800",
    emphasis: "text-red-600 dark:text-red-300",
    subtle:
      "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-200 border-red-100 dark:border-red-900",
    icon: "🚨",
  },
  high: {
    badge:
      "bg-orange-100 dark:bg-orange-950/20 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800",
    emphasis: "text-orange-600 dark:text-orange-300",
    subtle:
      "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-200 border-orange-100 dark:border-orange-900",
    icon: "⚠️",
  },
  moderate: {
    badge:
      "bg-yellow-100 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800",
    emphasis: "text-yellow-600 dark:text-yellow-300",
    subtle:
      "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-200 border-yellow-100 dark:border-yellow-900",
    icon: "⚡",
  },
  low: {
    badge:
      "bg-green-100 dark:bg-green-950/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800",
    emphasis: "text-green-600 dark:text-green-300",
    subtle:
      "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-200 border-green-100 dark:border-green-900",
    icon: "✅",
  },
};

export const getRiskLevelBadge = (level: RiskLevel | string) => {
  const token = riskLevelTokens[level as RiskLevel];
  return token ? token.badge : "bg-gray-100 dark:bg-gray-950/20 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-800";
};

export const getRiskLevelEmphasis = (level: RiskLevel | string) => {
  const token = riskLevelTokens[level as RiskLevel];
  return token ? token.emphasis : "text-gray-600 dark:text-gray-300";
};

export const getRiskLevelSubtle = (level: RiskLevel | string) => {
  const token = riskLevelTokens[level as RiskLevel];
  return token ? token.subtle : "bg-gray-50 dark:bg-gray-950/30 text-gray-600 dark:text-gray-300 border-gray-100 dark:border-gray-900";
};

export const getRiskLevelIcon = (level: RiskLevel | string) => {
  const token = riskLevelTokens[level as RiskLevel];
  return token ? token.icon : "❓";
};

export const getRiskScoreBarColor = (score: number) => {
  if (score >= 80) return "bg-red-500";
  if (score >= 60) return "bg-orange-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-green-500";
};

export const getRiskScoreTextColor = (score: number) => {
  if (score >= 80) return "text-red-600 dark:text-red-300";
  if (score >= 60) return "text-orange-600 dark:text-orange-300";
  if (score >= 40) return "text-yellow-600 dark:text-yellow-300";
  return "text-green-600 dark:text-green-300";
};
