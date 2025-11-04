'use client';

import { useCallback, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, ExternalLink, Check, Package, Network, Clock, Users, FileText, AlertTriangle, Gauge } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import type { AnalyzedContract } from '@/app/dashboard/types';
import { getSuiPackageExplorerUrl } from '@/lib/deployments';
import {
  getRiskLevelBadge,
  getRiskLevelEmphasis,
  getRiskLevelIcon,
  getRiskLevelName,
  getRiskLevelSubtle,
  getRiskLevelSubtleText,
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

const getFunctionKey = (functionName: string, index: number) => `${functionName}-${index}`;

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
  const [copied, setCopied] = useState(false);
  const [expandedFunctions, setExpandedFunctions] = useState<Record<string, boolean>>({});
  const { showToast } = useToast();

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
  const explorerUrl = useMemo(() => getSuiPackageExplorerUrl(contract.package_id, contract.network), [contract.package_id, contract.network]);
  const allRiskyFunctions = useMemo(
    () =>
      contract.analysis.risky_functions.map((func, originalIndex) => ({
        data: func,
        originalIndex,
      })),
    [contract.analysis.risky_functions],
  );

  const visibleRiskyFunctions = showAllFunctions
    ? allRiskyFunctions
    : allRiskyFunctions.slice(0, DEFAULT_VISIBLE_FUNCTIONS);

  const rugPullIndicators = showAllIndicators
    ? contract.analysis.rug_pull_indicators
    : contract.analysis.rug_pull_indicators.slice(0, DEFAULT_VISIBLE_INDICATORS);

  const hasRiskyFunctions = contract.analysis.risky_functions.length > 0;
  const hasRugPullIndicators = contract.analysis.rug_pull_indicators.length > 0;

  const allFunctionsExpanded = useMemo(() => {
    if (!contract.analysis.risky_functions.length) {
      return false;
    }

    return contract.analysis.risky_functions.every((func, index) => expandedFunctions[getFunctionKey(func.function_name, index)]);
  }, [contract.analysis.risky_functions, expandedFunctions]);

  const handleCopyPackageId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(contract.package_id);
      setCopied(true);
      showToast('Package ID copied to clipboard', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy package id', err);
    }
  }, [contract.package_id, showToast]);

  const handleToggleFunctionContent = useCallback(
    (key: string) => {
      setExpandedFunctions((prev) => {
        const nextExpanded = !prev[key];
        const nextState = {
          ...prev,
          [key]: nextExpanded,
        };

        if (nextExpanded && onAutoRefreshPause) {
          onAutoRefreshPause();
        }

        return nextState;
      });
    },
    [onAutoRefreshPause],
  );

  const handleToggleAllFunctionContent = useCallback(() => {
    setExpandedFunctions((prev) => {
      const nextExpanded = !allFunctionsExpanded;
      const nextState = { ...prev };

      contract.analysis.risky_functions.forEach((func, index) => {
        nextState[getFunctionKey(func.function_name, index)] = nextExpanded;
      });

      return nextState;
    });

    if (!allFunctionsExpanded && onAutoRefreshPause) {
      onAutoRefreshPause();
    }
  }, [allFunctionsExpanded, contract.analysis.risky_functions, onAutoRefreshPause]);

  return (
    <Card className="border border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-white/5 text-foreground dark:text-white shadow-sm shadow-black/5 dark:shadow-white/5 transition-colors duration-200 hover:border-border/50 dark:hover:border-white/20">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-1 min-w-0 flex-wrap">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide shrink-0 shadow-sm',
                  getRiskLevelBadge(contract.analysis.risk_level),
                )}
              >
                <span className="text-xs leading-none">{getRiskLevelIcon(contract.analysis.risk_level)}</span>
                <span className="leading-tight">{getRiskLevelName(contract.analysis.risk_level)}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/60 dark:border-white/25 bg-[hsl(var(--surface-elevated))] dark:bg-white/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-foreground/90 dark:text-white/90 shrink-0 shadow-sm backdrop-blur-sm">
                <Network className="h-3 w-3" />
                {contract.network}
              </span>
              <div className="inline-flex items-center gap-1 rounded-full border border-border/50 dark:border-white/20 bg-[hsl(var(--surface-elevated))] dark:bg-white/5 px-2.5 py-1 shrink-0 shadow-sm">
                <Gauge className={cn('h-3 w-3 shrink-0', getRiskScoreTextColor(contract.analysis.risk_score))} />
                <span className={cn('text-sm font-bold leading-tight', getRiskScoreTextColor(contract.analysis.risk_score))}>
                  {contract.analysis.risk_score}
                </span>
                <span className="text-xs font-medium text-muted-foreground leading-tight">/ 100</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1 min-w-0 relative">
              <CardTitle
                className="min-w-0 flex-1 break-all font-mono text-sm font-semibold text-foreground dark:text-white sm:break-normal sm:truncate"
                onClick={handleCopyPackageId}
                title={`${contract.package_id} - Click to copy`}
              >
                {contract.package_id}
              </CardTitle>
              <div className="flex w-full items-center justify-start gap-1 sm:w-auto sm:justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyPackageId}
                  className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground dark:hover:text-white relative group"
                  aria-label="Copy package id"
                  title={copied ? 'Copied to clipboard!' : `Copy package ID to clipboard\n\n${contract.package_id}`}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {!copied && (
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-800 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                      Copy package ID
                      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></span>
                    </span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(explorerUrl, '_blank', 'noopener,noreferrer')}
                  className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground dark:hover:text-white relative group"
                  aria-label="View on Sui Explorer"
                  title={`View this package on Sui Explorer (${contract.network})\n\nOpens in a new tab`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-800 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                    View on Sui Explorer
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></span>
                  </span>
                </Button>
              </div>
              <div
                className={cn(
                  'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5 shadow-lg transition-all duration-200',
                  copied
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-2 pointer-events-none'
                )}
                role="status"
                aria-live="polite"
              >
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-300 shrink-0" />
                <span className="text-sm font-medium text-emerald-800 dark:text-emerald-100">
                  Package ID copied to clipboard
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <CardDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Analyzed {relativeAnalyzedAt}
              </CardDescription>
              <div className="h-2 w-full max-w-[120px] overflow-hidden rounded-full bg-foreground/10 dark:bg-white/10">
                <div
                  className={cn('h-full rounded-full transition-all', getRiskScoreBarColor(contract.analysis.risk_score))}
                  style={{ width: `${contract.analysis.risk_score}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3 w-3" />
            Summary
          </h4>
          <p className="text-sm leading-5 text-foreground/80 dark:text-white/80">
            {contract.analysis.summary}
          </p>
          <div
            className={cn(
              'rounded-lg border px-3 py-2 text-sm font-medium',
              getRiskLevelSubtle(contract.analysis.risk_level),
              getRiskLevelSubtleText(contract.analysis.risk_level),
            )}
          >
            {contract.analysis.why_risky_one_liner}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            {hasRiskyFunctions && (
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h5 className="text-sm font-semibold text-foreground dark:text-white flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Risky Functions ({contract.analysis.risky_functions.length})
                  </h5>
                  <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleAllFunctionContent}
                      disabled={!contract.analysis.risky_functions.length}
                      className="inline-flex h-9 w-full items-center justify-center gap-1 px-2 text-xs font-semibold text-[#D12226] hover:bg-[#D12226]/15 hover:text-white sm:h-7 sm:w-auto"
                    >
                      {allFunctionsExpanded ? 'Fold all' : 'Unfold all'}
                      <ChevronDown
                        className={cn('h-3.5 w-3.5 transition-transform', allFunctionsExpanded && 'rotate-180')}
                      />
                    </Button>
                    {contract.analysis.risky_functions.length > DEFAULT_VISIBLE_FUNCTIONS && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleFunctions}
                        className="inline-flex h-9 w-full items-center justify-center gap-1 px-2 text-xs font-semibold text-[#D12226] hover:bg-[#D12226]/15 hover:text-white sm:h-7 sm:w-auto"
                      >
                        {showAllFunctions ? 'Show less' : `Show all (+${contract.analysis.risky_functions.length - DEFAULT_VISIBLE_FUNCTIONS})`}
                        <ChevronDown
                          className={cn('h-3.5 w-3.5 transition-transform', showAllFunctions && 'rotate-180')}
                        />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {visibleRiskyFunctions.map(({ data: func, originalIndex }) => {
                    const functionKey = getFunctionKey(func.function_name, originalIndex);
                    const isExpanded = Boolean(expandedFunctions[functionKey]);

                    return (
                      <div
                        key={functionKey}
                        className={cn(
                          'rounded-lg border border-transparent px-3 py-2 text-sm transition-colors duration-150 backdrop-blur',
                          getRiskLevelSubtle(contract.analysis.risk_level),
                          isExpanded && 'border-border dark:border-white/15',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleFunctionContent(functionKey)}
                          className="flex w-full flex-wrap items-start gap-2 text-left sm:flex-nowrap sm:items-center sm:justify-between sm:gap-3"
                          aria-expanded={isExpanded}
                        >
                          <span className="flex min-w-0 flex-1 items-start gap-2">
                            <ChevronRight
                              className={cn(
                                'mt-0.5 h-4 w-4 shrink-0 text-[#D12226] transition-transform duration-150 sm:mt-0',
                                isExpanded && 'rotate-90',
                              )}
                            />
                            <span
                              className={cn(
                                'whitespace-pre-wrap wrap-break-word font-mono text-sm font-semibold leading-5',
                                getRiskLevelSubtleText(contract.analysis.risk_level),
                              )}
                            >
                              {func.function_name}
                            </span>
                          </span>
                          <span
                            className={cn(
                              'mt-1 flex w-full items-center gap-1 text-xs font-medium uppercase tracking-wide text-left sm:mt-0 sm:w-auto sm:justify-end sm:text-right sm:whitespace-nowrap',
                              getRiskLevelEmphasis(contract.analysis.risk_level),
                            )}
                          >
                            {getRiskLevelIcon(contract.analysis.risk_level)}
                            <span className="font-semibold">{getRiskLevelName(contract.analysis.risk_level)}</span>
                          </span>
                        </button>
                        {isExpanded && (
                          <p className={cn('mt-2 text-sm leading-5', getRiskLevelSubtleText(contract.analysis.risk_level), 'opacity-90')}>
                            {func.reason}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {hasRugPullIndicators && (
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h5 className="text-sm font-semibold text-[#D12226] dark:text-[#ff6b6e] flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>Rug Pull Indicators ({contract.analysis.rug_pull_indicators.length})</span>
                  </h5>
                  {contract.analysis.rug_pull_indicators.length > DEFAULT_VISIBLE_INDICATORS && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleIndicators}
                      className="inline-flex h-9 w-full items-center justify-center gap-1 px-2 text-xs font-semibold text-[#D12226] hover:bg-[#D12226]/15 hover:text-white dark:text-[#ff6b6e] dark:hover:bg-[#D12226]/20 sm:h-7 sm:w-auto"
                    >
                      {showAllIndicators
                        ? 'Less'
                        : `+${contract.analysis.rug_pull_indicators.length - DEFAULT_VISIBLE_INDICATORS}`}
                      <ChevronDown
                        className={cn('h-3.5 w-3.5 transition-transform', showAllIndicators && 'rotate-180')}
                      />
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {rugPullIndicators.map((indicator, index) => (
                    <div
                      key={`${indicator.pattern_name}-${index}`}
                      className="space-y-1.5 rounded-lg border-2 border-[#D12226]/50 dark:border-[#D12226]/60 bg-[#D12226]/10 dark:bg-[#D12226]/15 px-3 py-2 text-sm backdrop-blur shadow-sm shadow-[#D12226]/10"
                    >
                      <div className="font-semibold text-[#8B1518] dark:text-[#ff8a8c]">
                        {indicator.pattern_name}
                      </div>
                      <p className="text-sm leading-5 text-[#8B1518]/90 dark:text-[#ffbdbf]">{indicator.evidence}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-4">
                <div className="space-y-2 rounded-lg border border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-white/5 p-3 shadow-sm shadow-black/5 dark:shadow-white/5">
                  <h6 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    Impact On Users
                  </h6>
                  <p className="text-sm leading-5 text-foreground/80 dark:text-white/80">
                    {contract.analysis.impact_on_user}
                  </p>
                </div>
                <div className="space-y-2 rounded-lg border border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-white/5 p-3 shadow-sm shadow-black/5 dark:shadow-white/5">
              <h6 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Package className="h-3 w-3" />
                Data Source
              </h6>
              <div className="space-y-2">
                <div className="group flex flex-wrap items-center justify-between gap-3 rounded-md px-2 py-1.5 -mx-2 -my-1.5 hover:bg-background/50 dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground shrink-0">Package</dt>
                  </div>
                  <div className="flex w-full items-center gap-1.5 min-w-0 flex-1 justify-end sm:w-auto">
                    <dd 
                      className="font-mono text-xs text-foreground dark:text-white break-all cursor-pointer hover:text-primary transition-colors sm:truncate"
                      onClick={handleCopyPackageId}
                      title={`${contract.package_id} - Click to copy`}
                    >
                      {contract.package_id}
                    </dd>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyPackageId}
                      className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-foreground dark:hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Copy package id"
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-300" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md px-2 py-1.5 -mx-2 -my-1.5">
                  <div className="flex items-center gap-2">
                    <Network className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Network</dt>
                  </div>
                  <dd className="text-xs font-semibold uppercase tracking-wide text-foreground dark:text-white">
                    {contract.network}
                  </dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md px-2 py-1.5 -mx-2 -my-1.5">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Generated</dt>
                  </div>
                  <dd className="text-xs font-medium text-foreground/80 dark:text-white/80" title={absoluteAnalyzedAt}>
                    {relativeAnalyzedAt}
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

export default AnalyzedContractCard;
