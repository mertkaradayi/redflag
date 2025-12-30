'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, ExternalLink, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnalyzedContract } from '@/app/dashboard/types';
import { getSuiPackageExplorerUrl } from '@/lib/deployments';
import { RiskScoreCircle } from './RiskScoreCircle';

interface CompactContractCardProps {
  contract: AnalyzedContract;
  index?: number;
  isExpanded?: boolean;
  onExpand?: () => void;
}

function formatRelativeTime(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return '';

  const diffMs = Date.now() - parsed.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const absoluteSeconds = Math.abs(diffSeconds);

  if (absoluteSeconds < 60) return 'now';
  if (absoluteSeconds < 3600) return `${Math.round(absoluteSeconds / 60)}m`;
  if (absoluteSeconds < 86400) return `${Math.round(absoluteSeconds / 3600)}h`;
  if (absoluteSeconds < 604800) return `${Math.round(absoluteSeconds / 86400)}d`;
  return `${Math.round(absoluteSeconds / 604800)}w`;
}

function truncatePackageId(id: string): string {
  // Format: 0x515...02b (show 0x + 3 chars + ... + 3 chars)
  if (id.length <= 12) return id;
  const prefix = id.startsWith('0x') ? id.slice(0, 5) : id.slice(0, 3);
  const suffix = id.slice(-3);
  return `${prefix}...${suffix}`;
}

function getRiskLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    critical: 'Red Flag',
    high: 'High Risk',
    moderate: 'Moderate',
    low: 'Green Flag',
  };
  return labels[level] || level;
}

function getRiskLevelColor(level: string) {
  // Saturated colors matching the filter badges
  const colors: Record<string, { bg: string; text: string; border: string; icon: string }> = {
    critical: {
      bg: 'bg-[#D12226]/10 dark:bg-[#D12226]/20',
      text: 'text-[#D12226] dark:text-[#ff6b6e]',
      border: 'border-[#D12226]/30',
      icon: '🚩',
    },
    high: {
      bg: 'bg-orange-500/10 dark:bg-orange-500/20',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-500/30',
      icon: '⚠️',
    },
    moderate: {
      bg: 'bg-yellow-400/10 dark:bg-yellow-400/20',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-400/30',
      icon: '⚡',
    },
    low: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/30',
      icon: '✓',
    },
  };
  return colors[level] || { bg: 'bg-zinc-500/10', text: 'text-zinc-500', border: 'border-zinc-500/30', icon: '?' };
}

export function CompactContractCard({
  contract,
  index = 0,
  isExpanded = false,
  onExpand,
}: CompactContractCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(contract.package_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [contract.package_id]);

  const handleOpenExplorer = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getSuiPackageExplorerUrl(contract.package_id, contract.network);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [contract.package_id, contract.network]);

  const relativeTime = formatRelativeTime(contract.analyzed_at);
  const deploymentTime = contract.deployment?.timestamp
    ? formatRelativeTime(contract.deployment.timestamp)
    : null;
  const riskLevel = contract.analysis.risk_level;
  const riskScore = contract.analysis.risk_score;
  const riskColors = getRiskLevelColor(riskLevel);

  // Alternating row colors for better differentiation
  const isEvenRow = index % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      onClick={onExpand}
      className={cn(
        'group relative',
        'cursor-pointer transition-all duration-200',
        // Alternating row backgrounds - high contrast for clear differentiation
        isEvenRow
          ? 'bg-[hsl(var(--surface-muted))]/80 dark:bg-black/70'
          : 'bg-[hsl(var(--surface-elevated))] dark:bg-white/5',
        // Expanded state - highlighted with subtle glow
        isExpanded
          ? cn(
              'bg-gradient-to-r from-[hsl(var(--surface-muted))] to-transparent',
              'dark:from-white/4 dark:to-transparent',
            )
          : 'hover:bg-[hsl(var(--surface-muted))]/90 dark:hover:bg-white/8'
      )}
    >

      {/* Desktop row */}
      <div className="hidden md:flex items-center gap-4 pl-6 pr-4 py-4">
        {/* Score circle - fixed width */}
        <div className="w-11 shrink-0 flex justify-center">
          <RiskScoreCircle score={riskScore} size={44} animate={index < 10} />
        </div>

        {/* Risk level pill - fixed width */}
        <div className="w-[100px] shrink-0">
          <div
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border',
              riskColors.bg,
              riskColors.text,
              riskColors.border
            )}
          >
            <span className="text-[10px] leading-none">{riskColors.icon}</span>
            <span>{getRiskLevelLabel(riskLevel)}</span>
          </div>
        </div>

        {/* Package ID - fixed width with icons inside */}
        <div className="w-[140px] shrink-0 flex items-center">
          <span
            className="font-mono text-sm text-foreground/80 dark:text-white/80 cursor-pointer hover:text-[#D12226] dark:hover:text-[#ff6b6e] transition-colors"
            onClick={handleCopy}
            title={contract.package_id}
          >
            {truncatePackageId(contract.package_id)}
          </span>
          <div className="flex items-center gap-0.5 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors"
              title="Copy package ID"
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
            <button
              onClick={handleOpenExplorer}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors"
              title="View on explorer"
            >
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Summary - flex to fill remaining */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground/90 dark:text-white/90 truncate leading-relaxed">
            {contract.analysis.why_risky_one_liner}
          </p>
        </div>

        {/* Network badge - fixed width */}
        <div className="w-12 shrink-0 flex justify-center">
          <div
            className={cn(
              'px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide',
              contract.network === 'mainnet'
                ? 'bg-emerald-500/8 text-emerald-400'
                : 'bg-sky-500/8 text-sky-400'
            )}
          >
            {contract.network === 'mainnet' ? 'Main' : 'Test'}
          </div>
        </div>

        {/* Deployed Time */}
        <div className="w-16 shrink-0 text-right">
          {deploymentTime ? (
            <div className="text-xs font-medium text-foreground dark:text-white tabular-nums">
              {deploymentTime}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground/30 dark:text-zinc-700 tabular-nums">
              —
            </div>
          )}
        </div>

        {/* Analyzed Time */}
        <div className="w-16 shrink-0 text-right">
          <div className="text-xs text-muted-foreground dark:text-zinc-400 tabular-nums">
            {relativeTime}
          </div>
        </div>

        {/* Chevron - fixed width */}
        <motion.div
          className="w-4 shrink-0"
          initial={false}
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight
            className={cn(
              'w-4 h-4 text-muted-foreground/50 transition-opacity duration-200',
              isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          />
        </motion.div>
      </div>

      {/* Mobile row */}
      <div className="md:hidden pl-5 pr-3 py-4">
        <div className="flex items-center gap-3">
          {/* Score circle - smaller on mobile */}
          <div className="shrink-0">
            <RiskScoreCircle score={riskScore} size={38} animate={index < 10} />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {/* Risk level pill */}
              <div
                className={cn(
                  'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide border',
                  riskColors.bg,
                  riskColors.text,
                  riskColors.border
                )}
              >
                <span className="text-[9px] leading-none">{riskColors.icon}</span>
                <span>{getRiskLevelLabel(riskLevel)}</span>
              </div>
              {/* Network */}
              <span
                className={cn(
                  'text-[9px] font-medium uppercase',
                  contract.network === 'mainnet'
                    ? 'text-emerald-400'
                    : 'text-sky-400'
                )}
              >
                {contract.network === 'mainnet' ? 'main' : 'test'}
              </span>
              {/* Time - deployment primarily on mobile */}
              <span className="text-xs font-semibold text-foreground dark:text-white tabular-nums ml-auto">
                {deploymentTime || relativeTime}
              </span>
            </div>
            {/* Package ID */}
            <span
              className="font-mono text-xs text-foreground/70 dark:text-white/70"
              onClick={handleCopy}
              title={contract.package_id}
            >
              {truncatePackageId(contract.package_id)}
            </span>
          </div>

          {/* Chevron */}
          <ChevronRight
            className={cn(
              'w-4 h-4 shrink-0 text-muted-foreground/40 transition-transform duration-200',
              isExpanded && 'rotate-90'
            )}
          />
        </div>

        {/* Summary below on mobile */}
        <p className="mt-2 text-xs text-muted-foreground dark:text-zinc-400 line-clamp-2 leading-relaxed">
          {contract.analysis.why_risky_one_liner}
        </p>
      </div>
    </motion.div>
  );
}

export default CompactContractCard;
