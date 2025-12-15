'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  getRiskLevelIcon,
  getRiskLevelName,
  getRiskFilterStyles,
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
}

const riskLevels = ['critical', 'high', 'moderate', 'low'] as const;

function AnimatedNumber({ value, isLoading }: { value: number; isLoading?: boolean }) {
  if (isLoading) {
    return <span className="inline-block w-6 h-4 bg-current/20 rounded animate-pulse" />;
  }

  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="tabular-nums font-bold"
    >
      {value.toLocaleString()}
    </motion.span>
  );
}

export function QuickStatsBar({
  counts,
  activeFilters,
  onFilterToggle,
  isLoading = false,
}: QuickStatsBarProps) {
  const total = counts.critical + counts.high + counts.moderate + counts.low;
  const allSelected = activeFilters.length === 4;

  return (
    <div className="rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {riskLevels.map((level) => {
          const isActive = activeFilters.includes(level);
          const styles = getRiskFilterStyles(level);
          const count = counts[level];

          return (
            <motion.button
              key={level}
              onClick={() => onFilterToggle(level)}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'inline-flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium transition-all duration-150 border',
                isActive
                  ? `${styles.bgActive} ${styles.borderActive} ${styles.text}`
                  : `${styles.bg} ${styles.border} ${styles.text} opacity-60 hover:opacity-100`
              )}
            >
              <span className="text-sm leading-none">{getRiskLevelIcon(level)}</span>
              <AnimatedNumber value={count} isLoading={isLoading} />
              <span className="hidden sm:inline text-[10px] uppercase tracking-wider opacity-70">
                {getRiskLevelName(level).split(' ')[0]}
              </span>
            </motion.button>
          );
        })}

        {/* Divider */}
        <div className="hidden sm:block h-8 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {/* Total count */}
        <div className="ml-auto flex items-center gap-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 px-3 py-2">
          <span className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">
            Total
          </span>
          <motion.span
            key={total}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm sm:text-base font-bold text-foreground dark:text-white tabular-nums"
          >
            {isLoading ? (
              <span className="inline-block w-8 h-4 bg-zinc-300 dark:bg-zinc-700 rounded animate-pulse" />
            ) : (
              total.toLocaleString()
            )}
          </motion.span>
        </div>
      </div>

      {/* Visual distribution bar */}
      {!isLoading && total > 0 && (
        <div className="mt-3 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden flex">
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
