'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, ExternalLink, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnalyzedContract } from '@/app/dashboard/types';
import { getSuiPackageExplorerUrl } from '@/lib/deployments';
import {
  getRiskLevelBadge,
  getRiskLevelIcon,
  getRiskLevelName,
} from '@/app/dashboard/risk-utils';
import { RiskScoreGauge } from './RiskScoreGauge';

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
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}...${id.slice(-6)}`;
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, delay: index * 0.02 }}
      onClick={onExpand}
      className={cn(
        'group',
        'px-3 py-2.5 sm:px-4 sm:py-3',
        'cursor-pointer transition-all duration-150',
        isExpanded
          ? 'bg-[hsl(var(--surface-muted))] dark:bg-white/5'
          : 'hover:bg-[hsl(var(--surface-muted))]/50 dark:hover:bg-white/[0.02]'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Risk badge - fixed width */}
        <div
          className={cn(
            'w-[90px] shrink-0 inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider',
            getRiskLevelBadge(contract.analysis.risk_level)
          )}
        >
          <span className="leading-none">{getRiskLevelIcon(contract.analysis.risk_level)}</span>
          <span className="leading-tight">
            {getRiskLevelName(contract.analysis.risk_level).split(' ')[0]}
          </span>
        </div>

        {/* Package ID - fixed width */}
        <div className="w-[160px] shrink-0 flex items-center gap-1">
          <span
            className="font-mono text-xs text-foreground dark:text-white cursor-pointer hover:text-[#D12226] transition-colors"
            onClick={handleCopy}
            title={contract.package_id}
          >
            {truncatePackageId(contract.package_id)}
          </span>
          <button
            onClick={handleCopy}
            className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
          <button
            onClick={handleOpenExplorer}
            className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>

        {/* Risk score gauge - fixed width */}
        <div className="w-[36px] shrink-0 flex justify-center">
          <RiskScoreGauge score={contract.analysis.risk_score} size="sm" animated={false} />
        </div>

        {/* One-liner summary - flex to fill remaining space */}
        <p className="hidden md:block flex-1 text-xs text-muted-foreground dark:text-zinc-400 truncate">
          {contract.analysis.why_risky_one_liner}
        </p>

        {/* Timestamp - fixed width */}
        <span className="w-[40px] shrink-0 text-[10px] text-muted-foreground dark:text-zinc-500 tabular-nums text-right font-medium">
          {relativeTime}
        </span>

        {/* Expand indicator - fixed width */}
        <ChevronRight
          className={cn(
            'w-[16px] shrink-0 h-4 w-4 text-muted-foreground transition-all duration-200',
            isExpanded ? 'rotate-90 opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        />
      </div>

      {/* Mobile: Show one-liner below */}
      <p className="md:hidden mt-2 text-xs text-muted-foreground dark:text-zinc-400 line-clamp-1">
        {contract.analysis.why_risky_one_liner}
      </p>
    </motion.div>
  );
}

export default CompactContractCard;
