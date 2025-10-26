'use client';

import { useCallback, useMemo, useState } from 'react';
import { ChevronDown, Copy } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { AnalyzedContract } from '@/app/dashboard/types';
import {
  getRiskLevelBadge,
  getRiskLevelEmphasis,
  getRiskLevelIcon,
  getRiskLevelSubtle,
  getRiskScoreBarColor,
  getRiskScoreTextColor,
} from '@/app/dashboard/risk-utils';
import { cn } from '@/lib/utils';

interface AnalyzedContractCardProps {
  contract: AnalyzedContract;
  onAutoRefreshPause?: () => void;
}

const DEFAULT_VISIBLE_FUNCTIONS = 3;
const DEFAULT_VISIBLE_INDICATORS = 2;

function formatRelativeTime(timestamp: string) {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }

  const diffMs = parsed.getTime() - Date.now();
  const diffSeconds = Math.round(diffMs / 1000);
  const absoluteSeconds = Math.abs(diffSeconds);

  const divisions: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60, 'seconds'],
    [60, 'minutes'],
    [24, 'hours'],
    [7, 'days'],
    [4.34524, 'weeks'],
    [12, 'months'],
    [Infinity, 'years'],
  ];

  let duration = absoluteSeconds;
  let unit: Intl.RelativeTimeFormatUnit = 'seconds';

  for (const [amount, nextUnit] of divisions) {
    if (duration < amount) {
      unit = nextUnit;
      break;
    }
    duration /= amount;
    unit = nextUnit;
  }

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const roundedDuration = Math.round(duration) * Math.sign(diffSeconds);
  return rtf.format(roundedDuration, unit);
}

export function AnalyzedContractCard({ contract, onAutoRefreshPause }: AnalyzedContractCardProps) {
  const [showAllFunctions, setShowAllFunctions] = useState(false);
  const [showAllIndicators, setShowAllIndicators] = useState(false);

  const toggleFunctions = useCallback(() => {
    if (!showAllFunctions && onAutoRefreshPause) {
      onAutoRefreshPause();
    }
    setShowAllFunctions((prev) => !prev);
  }, [onAutoRefreshPause, showAllFunctions]);

  const toggleIndicators = useCallback(() => {
    if (!showAllIndicators && onAutoRefreshPause) {
      onAutoRefreshPause();
    }
    setShowAllIndicators((prev) => !prev);
  }, [onAutoRefreshPause, showAllIndicators]);

  const relativeAnalyzedAt = useMemo(() => formatRelativeTime(contract.analyzed_at), [contract.analyzed_at]);
  const absoluteAnalyzedAt = useMemo(() => new Date(contract.analyzed_at).toLocaleString(), [contract.analyzed_at]);

  const riskyFunctions = showAllFunctions
    ? contract.analysis.risky_functions
    : contract.analysis.risky_functions.slice(0, DEFAULT_VISIBLE_FUNCTIONS);

  const rugPullIndicators = showAllIndicators
    ? contract.analysis.rug_pull_indicators
    : contract.analysis.rug_pull_indicators.slice(0, DEFAULT_VISIBLE_INDICATORS);

  const hasRiskyFunctions = contract.analysis.risky_functions.length > 0;
  const hasRugPullIndicators = contract.analysis.rug_pull_indicators.length > 0;

  const handleCopyPackageId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(contract.package_id);
    } catch (err) {
      console.error('Failed to copy package id', err);
    }
  }, [contract.package_id]);

  return (
    <Card className="border border-zinc-200/60 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-950">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                  getRiskLevelBadge(contract.analysis.risk_level),
                )}
              >
                <span>{getRiskLevelIcon(contract.analysis.risk_level)}</span>
                {contract.analysis.risk_level}
              </span>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {contract.network}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyPackageId}
                className="h-auto px-2 py-1 text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                aria-label="Copy package id"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
            </div>
            <div>
              <CardTitle className="font-mono text-base font-semibold text-zinc-900 dark:text-zinc-100 break-all">
                {contract.package_id}
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                Analyzed {relativeAnalyzedAt} ({absoluteAnalyzedAt})
              </CardDescription>
            </div>
          </div>
          <div className="flex w-full max-w-[220px] flex-col items-start gap-3 rounded-lg border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white p-4 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950 md:items-end">
            <div className="flex items-baseline gap-2">
              <span className={cn('text-2xl font-semibold', getRiskScoreTextColor(contract.analysis.risk_score))}>
                {contract.analysis.risk_score}
              </span>
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">/ 100</span>
            </div>
            <div className="flex w-full items-center gap-3">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={cn('h-full rounded-full transition-all', getRiskScoreBarColor(contract.analysis.risk_score))}
                  style={{ width: `${contract.analysis.risk_score}%` }}
                />
              </div>
            </div>
            <div className="w-full text-right text-xs text-zinc-500 dark:text-zinc-400">
              Generated {formatRelativeTime(contract.analysis.timestamp)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Summary</h4>
          <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            {contract.analysis.summary}
          </p>
          <div
            className={cn(
              'rounded-lg border px-4 py-3 text-sm font-medium',
              getRiskLevelSubtle(contract.analysis.risk_level),
            )}
          >
            {contract.analysis.why_risky_one_liner}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            {hasRiskyFunctions && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h5 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Risky Functions ({contract.analysis.risky_functions.length})
                  </h5>
                  {contract.analysis.risky_functions.length > DEFAULT_VISIBLE_FUNCTIONS && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleFunctions}
                      className="inline-flex items-center gap-1 px-2 text-xs font-semibold text-purple-600 hover:bg-purple-100/60 hover:text-purple-700 dark:text-purple-300 dark:hover:bg-purple-950/30 dark:hover:text-purple-200"
                    >
                      {showAllFunctions
                        ? 'Show fewer'
                        : `Show ${contract.analysis.risky_functions.length - DEFAULT_VISIBLE_FUNCTIONS} more`}
                      <ChevronDown
                        className={cn('h-4 w-4 transition-transform', showAllFunctions && 'rotate-180')}
                      />
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {riskyFunctions.map((func, index) => (
                    <div
                      key={`${func.function_name}-${index}`}
                      className="space-y-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm dark:border-red-900/70 dark:bg-red-950/20"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-sm font-semibold text-red-800 dark:text-red-200">
                          {func.function_name}
                        </span>
                        <span className={cn('text-xs font-medium', getRiskLevelEmphasis(contract.analysis.risk_level))}>
                          {getRiskLevelIcon(contract.analysis.risk_level)} risk
                        </span>
                      </div>
                      <p className="text-sm leading-6 text-red-700 dark:text-red-300">{func.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasRugPullIndicators && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h5 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Rug Pull Indicators ({contract.analysis.rug_pull_indicators.length})
                  </h5>
                  {contract.analysis.rug_pull_indicators.length > DEFAULT_VISIBLE_INDICATORS && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleIndicators}
                      className="inline-flex items-center gap-1 px-2 text-xs font-semibold text-orange-600 hover:bg-orange-100/60 hover:text-orange-700 dark:text-orange-300 dark:hover:bg-orange-950/30 dark:hover:text-orange-200"
                    >
                      {showAllIndicators
                        ? 'Show fewer'
                        : `Show ${contract.analysis.rug_pull_indicators.length - DEFAULT_VISIBLE_INDICATORS} more`}
                      <ChevronDown
                        className={cn('h-4 w-4 transition-transform', showAllIndicators && 'rotate-180')}
                      />
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {rugPullIndicators.map((indicator, index) => (
                    <div
                      key={`${indicator.pattern_name}-${index}`}
                      className="space-y-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm dark:border-orange-900/70 dark:bg-orange-950/20"
                    >
                      <div className="font-medium text-orange-800 dark:text-orange-200">
                        {indicator.pattern_name}
                      </div>
                      <p className="text-sm leading-6 text-orange-700 dark:text-orange-300">{indicator.evidence}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-5">
            <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h6 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Impact On Users
              </h6>
              <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                {contract.analysis.impact_on_user}
              </p>
            </div>
            <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <h6 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Data Source
              </h6>
              <dl className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                <div className="flex items-start justify-between gap-3">
                  <dt className="uppercase tracking-wide text-xs text-zinc-500 dark:text-zinc-400">Package</dt>
                  <dd className="max-w-[200px] truncate font-mono text-xs text-zinc-700 dark:text-zinc-200">
                    {contract.package_id}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="uppercase tracking-wide text-xs text-zinc-500 dark:text-zinc-400">Network</dt>
                  <dd className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{contract.network}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="uppercase tracking-wide text-xs text-zinc-500 dark:text-zinc-400">Generated</dt>
                  <dd className="text-sm text-zinc-700 dark:text-zinc-200">{absoluteAnalyzedAt}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

export default AnalyzedContractCard;
