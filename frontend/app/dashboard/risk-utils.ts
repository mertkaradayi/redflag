import type { AnalyzedContract } from "./types";

export type RiskLevel = AnalyzedContract["analysis"]["risk_level"];

const riskLevelTokens: Record<
  RiskLevel,
  {
    name: string;
    badge: string;
    emphasis: string;
    subtle: string;
    subtleText: string;
    icon: string;
  }
> = {
  critical: {
    name: "Red Flag",
    badge: "border-[#D12226]/60 bg-[#D12226]/20 text-[#ff8a8c] dark:text-[#ff8a8c]",
    emphasis: "text-[#D12226] dark:text-[#ff6b6e]",
    subtle: "border-[#D12226]/50 bg-[#D12226]/10 dark:bg-[#D12226]/10",
    subtleText: "text-[#8B1518] dark:text-[#ffbdbf]",
    icon: "🚩",
  },
  high: {
    name: "High Risk",
    badge: "border-orange-500/50 bg-orange-500/15 text-orange-700 dark:text-orange-200",
    emphasis: "text-orange-700 dark:text-orange-200",
    subtle: "border-orange-500/40 bg-orange-500/10 dark:bg-orange-500/10",
    subtleText: "text-orange-900 dark:text-orange-100",
    icon: "⚠️",
  },
  moderate: {
    name: "Moderate Risk",
    badge: "border-yellow-400/50 bg-yellow-400/15 text-yellow-800 dark:text-yellow-200",
    emphasis: "text-yellow-800 dark:text-yellow-200",
    subtle: "border-yellow-400/40 bg-yellow-400/10 dark:bg-yellow-400/10",
    subtleText: "text-yellow-900 dark:text-yellow-100",
    icon: "⚡",
  },
  low: {
    name: "Green Flag",
    badge: "border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
    emphasis: "text-emerald-700 dark:text-emerald-200",
    subtle: "border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-500/10",
    subtleText: "text-emerald-900 dark:text-emerald-100",
    icon: "🏳️‍🌿",
  },
};

export const getRiskLevelName = (level: RiskLevel | string) => {
  const token = riskLevelTokens[level as RiskLevel];
  if (token) {
    return token.name;
  }
  if (typeof level === "string") {
    return level.charAt(0).toUpperCase() + level.slice(1);
  }
  return "Unknown";
};

export const getRiskLevelBadge = (level: RiskLevel | string) => {
  const token = riskLevelTokens[level as RiskLevel];
  return token ? token.badge : "border-white/10 bg-black/40 text-white";
};

export const getRiskLevelEmphasis = (level: RiskLevel | string) => {
  const token = riskLevelTokens[level as RiskLevel];
  return token ? token.emphasis : "text-foreground dark:text-white";
};

export const getRiskLevelSubtle = (level: RiskLevel | string) => {
  const token = riskLevelTokens[level as RiskLevel];
  return token ? token.subtle : "border-white/10 bg-black/40 dark:bg-black/40";
};

export const getRiskLevelSubtleText = (level: RiskLevel | string) => {
  const token = riskLevelTokens[level as RiskLevel];
  return token ? token.subtleText : "text-foreground dark:text-white/80";
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
  if (score >= 80) return "text-[#D12226] dark:text-[#ff6b6e]";
  if (score >= 60) return "text-orange-700 dark:text-orange-200";
  if (score >= 40) return "text-yellow-800 dark:text-yellow-200";
  return "text-emerald-700 dark:text-emerald-200";
};

export const getRiskLevelDot = (level: RiskLevel | string) => {
  const token = riskLevelTokens[level as RiskLevel];
  if (!token) return "bg-white/20";
  
  if (level === "critical") return "bg-[#ff6b6e]";
  if (level === "high") return "bg-orange-500";
  if (level === "moderate") return "bg-yellow-400";
  if (level === "low") return "bg-emerald-500";
  
  return "bg-white/20";
};

export const getRiskFilterStyles = (level: RiskLevel | string) => {
  const token = riskLevelTokens[level as RiskLevel];
  if (!token) {
    return {
      border: "border-white/20",
      bg: "bg-white/5",
      text: "text-white",
      bgActive: "bg-white/15",
      borderActive: "border-white/40",
      glow: "",
      ring: "ring-white/40",
      dot: "bg-white/20",
    };
  }
  
  if (level === "critical") {
    return {
      border: "border-[#D12226]/50 dark:border-[#D12226]/50",
      bg: "bg-[#D12226]/10 dark:bg-[#D12226]/10",
      text: "text-[#8B1518] dark:text-[#ff8a8c]",
      bgActive: "bg-[#D12226]/25 dark:bg-[#D12226]/25",
      borderActive: "border-[#D12226]/70 dark:border-[#D12226]/70",
      glow: "shadow-[0_0_20px_rgba(209,34,38,0.4)]",
      ring: "ring-[#D12226]/50 dark:ring-[#D12226]/50",
      dot: "bg-[#D12226] dark:bg-[#ff6b6e]",
    };
  }
  
  if (level === "high") {
    return {
      border: "border-orange-500/50 dark:border-orange-500/50",
      bg: "bg-orange-500/10 dark:bg-orange-500/10",
      text: "text-orange-900 dark:text-orange-200",
      bgActive: "bg-orange-500/25 dark:bg-orange-500/25",
      borderActive: "border-orange-500/70 dark:border-orange-500/70",
      glow: "shadow-[0_0_20px_rgba(249,115,22,0.4)]",
      ring: "ring-orange-500/50 dark:ring-orange-500/50",
      dot: "bg-orange-600 dark:bg-orange-500",
    };
  }
  
  if (level === "moderate") {
    return {
      border: "border-yellow-400/50 dark:border-yellow-400/50",
      bg: "bg-yellow-400/10 dark:bg-yellow-400/10",
      text: "text-yellow-900 dark:text-yellow-200",
      bgActive: "bg-yellow-400/25 dark:bg-yellow-400/25",
      borderActive: "border-yellow-400/70 dark:border-yellow-400/70",
      glow: "shadow-[0_0_20px_rgba(250,204,21,0.4)]",
      ring: "ring-yellow-400/50 dark:ring-yellow-400/50",
      dot: "bg-yellow-600 dark:bg-yellow-400",
    };
  }
  
  if (level === "low") {
    return {
      border: "border-emerald-500/50 dark:border-emerald-500/50",
      bg: "bg-emerald-500/10 dark:bg-emerald-500/10",
      text: "text-emerald-900 dark:text-emerald-200",
      bgActive: "bg-emerald-500/25 dark:bg-emerald-500/25",
      borderActive: "border-emerald-500/70 dark:border-emerald-500/70",
      glow: "shadow-[0_0_20px_rgba(16,185,129,0.4)]",
      ring: "ring-emerald-500/50 dark:ring-emerald-500/50",
      dot: "bg-emerald-600 dark:bg-emerald-500",
    };
  }
  
  return {
    border: "border-white/20",
    bg: "bg-white/5",
    text: "text-white",
    bgActive: "bg-white/15",
    borderActive: "border-white/40",
    glow: "",
    ring: "ring-white/40",
    dot: "bg-white/20",
  };
};
