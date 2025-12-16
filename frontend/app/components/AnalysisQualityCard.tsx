'use client';

import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnalysisQuality, ValidationSummary } from '@/app/dashboard/types';
import { getCoverageIndicator, getValidationRateColor } from '@/app/dashboard/risk-utils';

interface AnalysisQualityCardProps {
  quality: AnalysisQuality;
  validationSummary?: ValidationSummary;
}

export function AnalysisQualityCard({ quality, validationSummary }: AnalysisQualityCardProps) {
  const moduleIndicator = getCoverageIndicator(quality.modules_analyzed, quality.modules_total);
  const functionIndicator = getCoverageIndicator(quality.functions_analyzed, quality.functions_total);
  const validationRate = validationSummary
    ? Math.round(validationSummary.avg_validation_score * 100)
    : Math.round(quality.validation_rate * 100);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-white/10 bg-[hsl(var(--surface-muted))]/50 dark:bg-black/20 p-4 sm:p-5 md:p-6 transition-colors duration-200 w-full max-w-full overflow-x-hidden">
      <div className="mb-3 md:mb-4 flex items-center gap-2 md:gap-3">
        <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg bg-[hsl(var(--surface-muted))] dark:bg-black/40 shrink-0">
          <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground dark:text-zinc-400" />
        </div>
        <h6 className="text-[10px] sm:text-xs md:text-sm font-semibold uppercase tracking-[0.3em] text-foreground dark:text-white">
          Analysis Quality
        </h6>
      </div>

      <div className="space-y-2 md:space-y-2.5">
        {/* Modules coverage */}
        <div className="flex items-center justify-between gap-2 md:gap-3">
          <span className="text-xs md:text-sm text-muted-foreground dark:text-zinc-400">Modules</span>
          <div className="flex items-center gap-2 md:gap-2.5">
            <span className="text-xs md:text-sm font-medium text-foreground dark:text-white tabular-nums">
              {quality.modules_analyzed}/{quality.modules_total}
            </span>
            <span className={cn('text-xs md:text-sm', moduleIndicator.color)}>{moduleIndicator.icon}</span>
          </div>
        </div>

        {/* Functions coverage */}
        <div className="flex items-center justify-between gap-2 md:gap-3">
          <span className="text-xs md:text-sm text-muted-foreground dark:text-zinc-400">Functions</span>
          <div className="flex items-center gap-2 md:gap-2.5">
            <span className="text-xs md:text-sm font-medium text-foreground dark:text-white tabular-nums">
              {quality.functions_analyzed}/{quality.functions_total}
            </span>
            <span className={cn('text-xs md:text-sm', functionIndicator.color)}>{functionIndicator.icon}</span>
          </div>
        </div>

        {/* Validation rate */}
        <div className="flex items-center justify-between gap-2 md:gap-3">
          <span className="text-xs md:text-sm text-muted-foreground dark:text-zinc-400">Validation</span>
          <div className="flex items-center gap-2 md:gap-2.5">
            <span className={cn('text-xs md:text-sm font-medium tabular-nums', getValidationRateColor(validationRate))}>
              {validationRate}%
            </span>
            <span className={cn('text-xs md:text-sm', validationRate >= 90 ? 'text-emerald-500' : validationRate >= 70 ? 'text-yellow-500' : 'text-orange-500')}>
              {validationRate >= 90 ? '✓' : validationRate >= 70 ? '~' : '!'}
            </span>
          </div>
        </div>

        {/* Truncation status */}
        <div className="flex items-center justify-between gap-2 md:gap-3">
          <span className="text-xs md:text-sm text-muted-foreground dark:text-zinc-400">Truncated</span>
          <div className="flex items-center gap-2 md:gap-2.5">
            <span className={cn(
              'text-xs md:text-sm font-medium',
              quality.truncation_occurred ? 'text-orange-600 dark:text-orange-400' : 'text-emerald-600 dark:text-emerald-400'
            )}>
              {quality.truncation_occurred ? 'Yes' : 'No'}
            </span>
            <span className={cn('text-xs md:text-sm', quality.truncation_occurred ? 'text-orange-500' : 'text-emerald-500')}>
              {quality.truncation_occurred ? '!' : '✓'}
            </span>
          </div>
        </div>

        {/* Validation summary breakdown (if available) */}
        {validationSummary && validationSummary.total > 0 && (
          <div className="pt-2 md:pt-2.5 mt-2 md:mt-2.5 border-t border-zinc-200 dark:border-white/10">
            <div className="text-[10px] md:text-xs uppercase tracking-wide text-muted-foreground dark:text-zinc-500 mb-1.5 md:mb-2">
              Findings Validation
            </div>
            <div className="flex items-center gap-3 md:gap-4 text-[10px] md:text-xs">
              <span className="text-emerald-600 dark:text-emerald-400">
                {validationSummary.validated} verified
              </span>
              {validationSummary.invalid > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  {validationSummary.invalid} invalid
                </span>
              )}
              {validationSummary.unvalidated > 0 && (
                <span className="text-muted-foreground dark:text-zinc-500">
                  {validationSummary.unvalidated} pending
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalysisQualityCard;
