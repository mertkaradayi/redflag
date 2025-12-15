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
import { ConfidenceBadge } from './ConfidenceBadge';
import { AnalysisQualityCard } from './AnalysisQualityCard';
import { DependencySummaryCard } from './DependencySummaryCard';
import { TechnicalFindingsSection } from './TechnicalFindingsSection';
import { EvidenceBlock } from './EvidenceBlock';

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
    <Card className="relative overflow-hidden rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 bg-transparent p-0 shadow-sm dark:shadow-lg">
      <CardContent className="relative space-y-3 p-4 sm:space-y-4 sm:p-6 bg-white/80 backdrop-blur-xl supports-backdrop-filter:bg-white/80 dark:bg-zinc-950/80 dark:supports-backdrop-filter:bg-zinc-950/80">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 min-w-0 space-y-2.5 sm:space-y-3">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.3em] shrink-0',
                  getRiskLevelBadge(contract.analysis.risk_level),
                )}
              >
                <span className="text-xs leading-none">{getRiskLevelIcon(contract.analysis.risk_level)}</span>
                <span className="leading-tight">{getRiskLevelName(contract.analysis.risk_level)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--surface-muted))] dark:bg-black/40 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground dark:text-zinc-400 shrink-0">
                <Network className="h-3 w-3 shrink-0" />
                <span>{contract.network}</span>
              </span>
              <div className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--surface-muted))] dark:bg-black/40 px-2.5 py-1 shrink-0">
                <Gauge className={cn('h-3 w-3 shrink-0', getRiskScoreTextColor(contract.analysis.risk_score))} />
                <span className={cn('text-xs font-bold leading-tight tabular-nums', getRiskScoreTextColor(contract.analysis.risk_score))}>
                  {contract.analysis.risk_score}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground leading-tight">/ 100</span>
              </div>
              {contract.analysis.confidence_level && (
                <ConfidenceBadge
                  level={contract.analysis.confidence_level}
                  interval={contract.analysis.confidence_interval}
                />
              )}
            </div>
            
            {/* Package ID Field Block */}
            <div className="min-w-0 space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-500">
                Package ID
              </label>
              <div className="flex min-w-0 items-center gap-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-black/40 h-10 px-3 transition">
                <span className="min-w-0 flex-1 truncate font-mono text-sm text-zinc-900 dark:text-white/90">
                  {contract.package_id}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-accent h-7 w-7 rounded-md text-zinc-600 dark:text-white/70 hover:text-zinc-900 dark:hover:text-white shrink-0"
                    onClick={handleCopyPackageId}
                    aria-label="Copy package ID"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-accent h-7 w-7 rounded-md text-zinc-600 dark:text-white/70 hover:text-zinc-900 dark:hover:text-white shrink-0"
                    onClick={() => window.open(explorerUrl, '_blank', 'noopener,noreferrer')}
                    aria-label="View package on Sui Explorer"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-[10px] text-muted-foreground dark:text-zinc-400 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Analyzed {relativeAnalyzedAt}
              </div>
              <div className="h-1.5 w-full max-w-[100px] overflow-hidden rounded-full bg-foreground/10 dark:bg-white/10">
                <div
                  className={cn('h-full rounded-full transition-all', getRiskScoreBarColor(contract.analysis.risk_score))}
                  style={{ width: `${contract.analysis.risk_score}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Toast notification for copy */}
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
        <section className="space-y-2">
          <h4 className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-500 flex items-center gap-1.5">
            <FileText className="h-3 w-3" />
            Summary
          </h4>
          <p className="text-sm leading-5 text-foreground/80 dark:text-white/80">
            {contract.analysis.summary}
          </p>
          <div
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium',
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
                    <AlertTriangle className="h-4 w-4 text-[#D12226] dark:text-[#ff6b6e]" />
                    Risky Functions ({contract.analysis.risky_functions.length})
                  </h5>
                  <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleAllFunctionContent}
                      disabled={!contract.analysis.risky_functions.length}
                      className="inline-flex h-9 w-full items-center justify-center gap-1 px-2 text-xs font-semibold text-foreground dark:text-white hover:bg-[hsl(var(--surface-muted))] dark:hover:bg-black/40 sm:h-7 sm:w-auto"
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
                        className="inline-flex h-9 w-full items-center justify-center gap-1 px-2 text-xs font-semibold text-foreground dark:text-white hover:bg-[hsl(var(--surface-muted))] dark:hover:bg-black/40 sm:h-7 sm:w-auto"
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
                          'rounded-lg bg-[hsl(var(--surface-muted))] dark:bg-black/40 px-3 py-2 text-sm transition-colors duration-150',
                          isExpanded && 'border border-zinc-200/50 dark:border-zinc-800/50',
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
                                'mt-0.5 h-4 w-4 shrink-0 text-[#D12226] dark:text-[#ff6b6e] transition-transform duration-150 sm:mt-0',
                                isExpanded && 'rotate-90',
                              )}
                            />
                            <span className={cn(
                              'whitespace-pre-wrap wrap-break-word font-mono text-sm font-semibold leading-5',
                              getRiskLevelEmphasis(contract.analysis.risk_level),
                            )}>
                              {func.function_name}
                            </span>
                          </span>
                          <span className={cn(
                            'mt-1 flex w-full items-center gap-1 text-xs font-medium uppercase tracking-wide text-left sm:mt-0 sm:w-auto sm:justify-end sm:text-right sm:whitespace-nowrap',
                            getRiskLevelEmphasis(contract.analysis.risk_level),
                          )}>
                            {getRiskLevelIcon(contract.analysis.risk_level)}
                            <span className="font-semibold">{getRiskLevelName(contract.analysis.risk_level)}</span>
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="mt-3">
                            <EvidenceBlock text={func.reason} />
                          </div>
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
                      className="inline-flex h-9 w-full items-center justify-center gap-1 px-2 text-xs font-semibold text-foreground dark:text-white hover:bg-[hsl(var(--surface-muted))] dark:hover:bg-black/40 sm:h-7 sm:w-auto"
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
                      className="space-y-1.5 rounded-lg border border-[#D12226]/30 dark:border-[#D12226]/40 bg-[#D12226]/5 dark:bg-[#D12226]/10 px-3 py-2 text-sm"
                    >
                      <div className="font-semibold text-[#D12226] dark:text-[#ff6b6e] mb-2">
                        {indicator.pattern_name}
                      </div>
                      <EvidenceBlock text={indicator.evidence} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Findings (detailed findings with pattern IDs and evidence) */}
            {contract.analysis.technical_findings && contract.analysis.technical_findings.length > 0 && (
              <TechnicalFindingsSection
                findings={contract.analysis.technical_findings}
                onExpand={onAutoRefreshPause}
              />
            )}
          </div>
          <div className="space-y-4">
                <div className="rounded-lg border border-zinc-200 dark:border-white/10 bg-[hsl(var(--surface-muted))]/50 dark:bg-black/20 p-4 sm:p-5 transition-colors duration-200">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--surface-muted))] dark:bg-black/40">
                      <Users className="h-4 w-4 text-muted-foreground dark:text-zinc-400" />
                    </div>
                    <h6 className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-foreground dark:text-white">
                      Impact On Users
                    </h6>
                  </div>
                  <p className="text-sm leading-5 text-foreground/90 dark:text-white/90">
                    {contract.analysis.impact_on_user}
                  </p>
                </div>

                {/* Analysis Quality Card (NEW) */}
                {contract.analysis.analysis_quality && (
                  <AnalysisQualityCard
                    quality={contract.analysis.analysis_quality}
                    validationSummary={contract.analysis.validation_summary}
                  />
                )}

                {/* Dependency Summary Card (NEW) */}
                {contract.analysis.dependency_summary &&
                 contract.analysis.dependency_summary.total_dependencies > 0 && (
                  <DependencySummaryCard summary={contract.analysis.dependency_summary} />
                )}

                {/* Limitations Card (NEW) */}
                {contract.analysis.limitations && contract.analysis.limitations.length > 0 && (
                  <div className="rounded-lg border border-orange-200 dark:border-orange-500/30 bg-orange-50/50 dark:bg-orange-500/10 p-4 sm:p-5 transition-colors duration-200">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-500/20">
                        <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <h6 className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-orange-800 dark:text-orange-300">
                        Limitations
                      </h6>
                    </div>
                    <ul className="space-y-1.5">
                      {contract.analysis.limitations.map((limitation, index) => (
                        <li key={index} className="text-xs text-orange-700 dark:text-orange-200/80 flex items-start gap-1.5">
                          <span className="shrink-0">-</span>
                          <span>{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-lg border border-zinc-200 dark:border-white/10 bg-[hsl(var(--surface-muted))]/50 dark:bg-black/20 p-4 sm:p-5 transition-colors duration-200">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--surface-muted))] dark:bg-black/40">
                      <Package className="h-4 w-4 text-muted-foreground dark:text-zinc-400" />
                    </div>
                    <h6 className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-foreground dark:text-white">
                      Data Source
                    </h6>
                  </div>
                  <div className="space-y-2.5">
                <div className="group flex flex-wrap items-center justify-between gap-3 rounded-xl px-2 py-1.5 -mx-2 -my-1.5 hover:bg-[hsl(var(--surface-muted))] dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <dt className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-500 shrink-0">Package</dt>
                  </div>
                  <div className="flex w-full items-center gap-1.5 min-w-0 flex-1 justify-end sm:w-auto">
                    <dd 
                      className="font-mono text-xs text-foreground dark:text-white break-all cursor-pointer hover:text-[#D12226] transition-colors sm:truncate"
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
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-2 py-1.5 -mx-2 -my-1.5">
                  <div className="flex items-center gap-2">
                    <Network className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <dt className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-500">Network</dt>
                  </div>
                  <dd className="text-xs font-semibold uppercase tracking-[0.3em] text-foreground dark:text-white">
                    {contract.network}
                  </dd>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-2 py-1.5 -mx-2 -my-1.5">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <dt className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-500">Generated</dt>
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
