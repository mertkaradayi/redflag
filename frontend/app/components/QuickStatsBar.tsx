'use client';

import { motion } from 'framer-motion';
import { RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getRiskLevelIcon,
  getRiskLevelName,
} from '@/app/dashboard/risk-utils';

interface QuickStatsBarProps {
  counts: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
  activeFilters: string[];
  onFilterToggle: (level: string) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  lastUpdated?: Date | null;
}

const riskLevels = ['critical', 'high', 'moderate', 'low'] as const;

// Risk level color configurations matching deployments page style
const riskLevelColors: Record<string, { text: string; accent: string }> = {
  critical: { text: 'text-[#D12226]', accent: '#D12226' },
  high: { text: 'text-orange-500', accent: 'rgb(249, 115, 22)' },
  moderate: { text: 'text-yellow-500', accent: 'rgb(234, 179, 8)' },
  low: { text: 'text-emerald-500', accent: 'rgb(16, 185, 129)' },
};

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.round(diffMs / 1000);

  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.round(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.round(diffSeconds / 3600)}h ago`;
  return date.toLocaleDateString();
}

export function QuickStatsBar({
  counts,
  activeFilters,
  onFilterToggle,
  isLoading = false,
  onRefresh,
  lastUpdated,
}: QuickStatsBarProps) {
  const total = counts.critical + counts.high + counts.moderate + counts.low;
  const allSelected = activeFilters.length === riskLevels.length;
  const riskyCount = counts.critical + counts.high;
  const riskyPercent = total > 0 ? ((riskyCount / total) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      {/* KPI Tiles Grid - matches deployments page style */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        {/* Risk level tiles */}
        {riskLevels.map((level) => {
          const isActive = activeFilters.includes(level) && !allSelected;
          const count = counts[level];
          const colors = riskLevelColors[level];
          const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';

          return (
            <button
              key={level}
              onClick={() => onFilterToggle(level)}
              className={cn(
                'group relative rounded-xl border p-3 text-left transition-all cursor-pointer',
                isActive
                  ? 'border-[#D12226]/60 dark:border-[#D12226]/60 bg-[#D12226]/10 dark:bg-[#D12226]/20'
                  : 'border-border dark:border-white/10 bg-[hsl(var(--surface-muted))] dark:bg-black/40 hover:border-[#D12226]/40 dark:hover:border-[#D12226]/60 hover:bg-[#D12226]/5 dark:hover:bg-[#D12226]/10'
              )}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground dark:text-zinc-400">
                  <span className="text-sm">{getRiskLevelIcon(level)}</span>
                  {getRiskLevelName(level).split(' ')[0]}
                </div>
                {!isLoading && total > 0 && (
                  <span className="text-[10px] font-medium text-muted-foreground dark:text-zinc-500 tabular-nums">
                    {percentage}%
                  </span>
                )}
              </div>
              <div className={cn('text-xl font-bold tabular-nums', colors.text)}>
                {isLoading ? (
                  <span className="inline-block w-8 h-6 bg-current/20 rounded animate-pulse" />
                ) : (
                  <motion.span
                    key={count}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  >
                    {count.toLocaleString()}
                  </motion.span>
                )}
              </div>
            </button>
          );
        })}

        {/* Total tile with refresh */}
        <div className="rounded-xl border border-border dark:border-white/10 bg-[hsl(var(--surface-muted))] dark:bg-black/40 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground dark:text-zinc-400">
              Total
            </div>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="hidden sm:inline text-[10px] text-muted-foreground dark:text-zinc-500">
                  {formatRelativeTime(lastUpdated)}
                </span>
              )}
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isLoading}
                  className={cn(
                    'inline-flex items-center justify-center h-6 w-6 rounded-md border border-[#D12226]/40 text-[#D12226] hover:bg-[#D12226]/10 transition-colors',
                    isLoading && 'pointer-events-none opacity-60'
                  )}
                  title="Refresh"
                >
                  <RefreshCcw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
                </button>
              )}
            </div>
          </div>
          <div className="text-xl font-bold text-foreground dark:text-white tabular-nums">
            {isLoading ? (
              <span className="inline-block w-10 h-6 bg-zinc-300 dark:bg-zinc-700 rounded animate-pulse" />
            ) : (
              <motion.span
                key={total}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {total.toLocaleString()}
              </motion.span>
            )}
          </div>
        </div>
      </div>

      {/* Visual distribution bar */}
      {!isLoading && total > 0 && (
        <div className="h-1.5 rounded-full bg-[hsl(var(--surface-muted))] dark:bg-black/40 overflow-hidden flex">
          {riskLevels.map((level) => {
            const count = counts[level];
            const percentage = (count / total) * 100;
            if (percentage === 0) return null;

            const colors: Record<string, string> = {
              critical: 'bg-[#D12226]',
              high: 'bg-orange-500',
              moderate: 'bg-yellow-500',
              low: 'bg-emerald-500',
            };

            return (
              <motion.div
                key={level}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={cn('h-full', colors[level])}
                title={`${getRiskLevelName(level)}: ${count} (${percentage.toFixed(1)}%)`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default QuickStatsBar;
