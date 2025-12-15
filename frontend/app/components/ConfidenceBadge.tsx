'use client';

import { cn } from '@/lib/utils';
import type { ConfidenceLevel, ConfidenceInterval } from '@/app/dashboard/types';
import { getConfidenceLevelBadge, getConfidenceLevelIcon, getConfidenceLevelName } from '@/app/dashboard/risk-utils';

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  interval?: ConfidenceInterval;
  className?: string;
}

export function ConfidenceBadge({ level, interval, className }: ConfidenceBadgeProps) {
  const tooltipText = interval
    ? `${getConfidenceLevelName(level)} - Score range: ${interval.lower}-${interval.upper}`
    : getConfidenceLevelName(level);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold shrink-0',
        getConfidenceLevelBadge(level),
        className,
      )}
      title={tooltipText}
    >
      <span className="text-xs leading-none">{getConfidenceLevelIcon(level)}</span>
      <span className="leading-tight">{getConfidenceLevelName(level)}</span>
      {interval && (
        <span className="text-[10px] opacity-70 leading-tight">
          ({interval.lower}-{interval.upper})
        </span>
      )}
    </div>
  );
}

export default ConfidenceBadge;
