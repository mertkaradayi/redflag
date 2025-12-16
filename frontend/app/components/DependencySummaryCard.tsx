'use client';

import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DependencySummary } from '@/app/dashboard/types';

interface DependencySummaryCardProps {
  summary: DependencySummary;
}

export function DependencySummaryCard({ summary }: DependencySummaryCardProps) {
  const hasRisk = summary.unaudited_count > 0 || summary.high_risk_count > 0;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-white/10 bg-[hsl(var(--surface-muted))]/50 dark:bg-black/20 p-4 sm:p-5 md:p-6 transition-colors duration-200 w-full max-w-full overflow-x-hidden">
      <div className="mb-3 md:mb-4 flex items-center gap-2 md:gap-3">
        <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg bg-[hsl(var(--surface-muted))] dark:bg-black/40 shrink-0">
          <Package className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground dark:text-zinc-400" />
        </div>
        <h6 className="text-[10px] sm:text-xs md:text-sm font-semibold uppercase tracking-[0.3em] text-foreground dark:text-white">
          Dependencies
        </h6>
      </div>

      <div className="space-y-2 md:space-y-2.5">
        {/* Total dependencies */}
        <div className="flex items-center justify-between gap-2 md:gap-3">
          <span className="text-xs md:text-sm text-muted-foreground dark:text-zinc-400">Total</span>
          <span className="text-xs md:text-sm font-medium text-foreground dark:text-white tabular-nums">
            {summary.total_dependencies}
          </span>
        </div>

        {/* Audited count */}
        <div className="flex items-center justify-between gap-2 md:gap-3">
          <span className="text-xs md:text-sm text-muted-foreground dark:text-zinc-400">Audited</span>
          <div className="flex items-center gap-2 md:gap-2.5">
            <span className="text-xs md:text-sm font-medium text-foreground dark:text-white tabular-nums">
              {summary.audited_count}
            </span>
            <span className="text-xs md:text-sm text-emerald-500">✓</span>
          </div>
        </div>

        {/* Unaudited count */}
        <div className="flex items-center justify-between gap-2 md:gap-3">
          <span className="text-xs md:text-sm text-muted-foreground dark:text-zinc-400">Unaudited</span>
          <div className="flex items-center gap-2 md:gap-2.5">
            <span className={cn(
              'text-xs md:text-sm font-medium tabular-nums',
              summary.unaudited_count > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-foreground dark:text-white'
            )}>
              {summary.unaudited_count}
            </span>
            {summary.unaudited_count > 0 && (
              <span className="text-xs md:text-sm text-orange-500">!</span>
            )}
          </div>
        </div>

        {/* High risk count */}
        <div className="flex items-center justify-between gap-2 md:gap-3">
          <span className="text-xs md:text-sm text-muted-foreground dark:text-zinc-400">High Risk</span>
          <div className="flex items-center gap-2 md:gap-2.5">
            <span className={cn(
              'text-xs md:text-sm font-medium tabular-nums',
              summary.high_risk_count > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
            )}>
              {summary.high_risk_count}
            </span>
            <span className={cn('text-xs md:text-sm', summary.high_risk_count > 0 ? 'text-red-500' : 'text-emerald-500')}>
              {summary.high_risk_count > 0 ? '!' : '✓'}
            </span>
          </div>
        </div>

        {/* System packages info */}
        {summary.system_packages > 0 && (
          <div className="pt-2 md:pt-2.5 mt-2 md:mt-2.5 border-t border-zinc-200 dark:border-white/10">
            <div className="text-[10px] md:text-xs text-muted-foreground dark:text-zinc-500">
              {summary.system_packages} system package{summary.system_packages !== 1 ? 's' : ''} (safe)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DependencySummaryCard;
