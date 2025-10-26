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
    badge: "border-[#D12226]/60 bg-[#D12226]/20 text-[#ff8a8c]",
    emphasis: "text-[#ff6b6e]",
    subtle: "border-[#D12226]/50 bg-[#D12226]/10 text-[#ffbdbf]",
    icon: "🚨",
  },
  high: {
    badge: "border-orange-500/50 bg-orange-500/15 text-orange-200",
    emphasis: "text-orange-200",
    subtle: "border-orange-500/40 bg-orange-500/10 text-orange-100",
    icon: "⚠️",
  },
  moderate: {
    badge: "border-yellow-400/50 bg-yellow-400/15 text-yellow-200",
    emphasis: "text-yellow-200",
    subtle: "border-yellow-400/40 bg-yellow-400/10 text-yellow-100",
    icon: "⚡",
  },
  low: {
    badge: "border-emerald-500/50 bg-emerald-500/15 text-emerald-200",
    emphasis: "text-emerald-200",
    subtle: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
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
  if (score >= 80) return "text-[#ff6b6e]";
  if (score >= 60) return "text-orange-200";
  if (score >= 40) return "text-yellow-200";
  return "text-emerald-200";
};
