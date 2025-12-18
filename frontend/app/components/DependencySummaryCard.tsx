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
    <div className="rounded-lg border border-zinc-200 dark:border-white/10 bg-[hsl(var(--surface-muted))]/50 dark:bg-black/20 p-4 transition-colors duration-200 w-full max-w-full overflow-x-hidden">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--surface-muted))] dark:bg-black/40 shrink-0">
          <Package className="h-3.5 w-3.5 text-muted-foreground dark:text-zinc-400" />
        </div>
        <h6 className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-foreground dark:text-white">
          Dependencies
        </h6>
      </div>

      <div className="space-y-2">
        {/* Total dependencies */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground dark:text-zinc-500">Total</span>
          <span className="text-xs font-medium text-foreground dark:text-white tabular-nums">
            {summary.total_dependencies}
          </span>
        </div>

        {/* Audited count */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground dark:text-zinc-500">Audited</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground dark:text-white tabular-nums">
              {summary.audited_count}
            </span>
            <span className="text-xs text-emerald-500">✓</span>
          </div>
        </div>

        {/* Unaudited count */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground dark:text-zinc-500">Unaudited</span>
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-xs font-medium tabular-nums',
              summary.unaudited_count > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-foreground dark:text-white'
            )}>
              {summary.unaudited_count}
            </span>
            {summary.unaudited_count > 0 && (
              <span className="text-xs text-orange-500">!</span>
            )}
          </div>
        </div>

        {/* High risk count */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground dark:text-zinc-500">High Risk</span>
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-xs font-medium tabular-nums',
              summary.high_risk_count > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
            )}>
              {summary.high_risk_count}
            </span>
            <span className={cn('text-xs', summary.high_risk_count > 0 ? 'text-red-500' : 'text-emerald-500')}>
              {summary.high_risk_count > 0 ? '!' : '✓'}
            </span>
          </div>
        </div>

        {/* System packages info */}
        {summary.system_packages > 0 && (
          <div className="pt-2 mt-2 border-t border-zinc-200 dark:border-white/10">
            <div className="text-[10px] text-muted-foreground dark:text-zinc-500">
              {summary.system_packages} system package{summary.system_packages !== 1 ? 's' : ''} (safe)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DependencySummaryCard;
