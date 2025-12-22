'use client';

import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Copy, ExternalLink, Check, Package, Network, Clock, Users, FileText, AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import type { AnalyzedContract } from '@/app/dashboard/types';
import { getSuiPackageExplorerUrl } from '@/lib/deployments';
import {
  getRiskLevelBadge,
  getRiskLevelIcon,
  getRiskLevelName,
  getRiskScoreBarColor,
} from '@/app/dashboard/risk-utils';
import { cn } from '@/lib/utils';
import { ConfidenceBadge } from './ConfidenceBadge';
import { AnalysisQualityCard } from './AnalysisQualityCard';
import { DependencySummaryCard } from './DependencySummaryCard';
import { TechnicalFindingsSection } from './TechnicalFindingsSection';
import { EvidenceBlock } from './EvidenceBlock';
import { RiskScoreGauge } from './RiskScoreGauge';

interface AnalyzedContractCardProps {
  contract: AnalyzedContract;
  index?: number;
  onAutoRefreshPause?: () => void;
  isInline?: boolean;  // When true, removes outer card styling for inline use
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

const getIndicatorKey = (patternName: string, index: number) => `${patternName}-${index}`;

export function AnalyzedContractCard({ contract, index = 0, onAutoRefreshPause, isInline = false }: AnalyzedContractCardProps) {
  const [showAllFunctions, setShowAllFunctions] = useState(false);
  const [showAllIndicators, setShowAllIndicators] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedFunctions, setExpandedFunctions] = useState<Record<string, boolean>>({});
  const [expandedIndicators, setExpandedIndicators] = useState<Record<string, boolean>>({});
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

  // Deployment time calculations
  const relativeDeployedAt = useMemo(
    () => (contract.deployment?.timestamp ? formatRelativeTime(contract.deployment.timestamp) : null),
    [contract.deployment?.timestamp],
  );
  const absoluteDeployedAt = useMemo(
    () => (contract.deployment?.timestamp ? new Date(contract.deployment.timestamp).toLocaleString() : null),
    [contract.deployment?.timestamp],
  );

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

  const handleToggleIndicatorContent = useCallback(
    (key: string) => {
      setExpandedIndicators((prev) => {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: isInline ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: isInline ? 0.15 : 0.3, delay: isInline ? 0 : index * 0.05 }}
    >
    <Card className={cn(
      "relative overflow-hidden p-0",
      isInline
        ? "rounded-xl border-0 bg-transparent shadow-none"
        : "rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 bg-transparent shadow-sm dark:shadow-lg"
    )}>
      <CardContent className={cn(
        "relative space-y-2 sm:space-y-3 md:space-y-4",
        isInline
          ? "p-0 bg-transparent"
          : "p-4 sm:p-6 bg-white/80 backdrop-blur-xl supports-backdrop-filter:bg-white/80 dark:bg-zinc-950/80 dark:supports-backdrop-filter:bg-zinc-950/80"
      )}>
        {/* Header section - hidden when inline since compact row already shows this info */}
        {!isInline && (
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
                <RiskScoreGauge score={contract.analysis.risk_score} size="sm" />
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
                      className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-accent h-9 w-9 sm:h-7 sm:w-7 rounded-md text-zinc-600 dark:text-white/70 hover:text-zinc-900 dark:hover:text-white active:scale-95 transition-transform shrink-0"
                      onClick={handleCopyPackageId}
                      aria-label="Copy package ID"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-300" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-accent h-9 w-9 sm:h-7 sm:w-7 rounded-md text-zinc-600 dark:text-white/70 hover:text-zinc-900 dark:hover:text-white active:scale-95 transition-transform shrink-0"
                      onClick={() => window.open(explorerUrl, '_blank', 'noopener,noreferrer')}
                      aria-label="View package on Sui Explorer"
                    >
                      <ExternalLink className="h-4 w-4 shrink-0" />
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
        )}

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
        <section className="w-full max-w-full overflow-x-hidden">
          <div className="rounded-lg border border-border/50 dark:border-white/5 bg-[hsl(var(--surface-muted))]/30 dark:bg-white/[0.02] p-4 sm:p-5 md:p-6 transition-colors duration-200 w-full max-w-full overflow-x-hidden">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--surface-muted))]/50 dark:bg-white/[0.03] shrink-0">
                <FileText className="h-3.5 w-3.5 text-muted-foreground dark:text-zinc-500" />
              </div>
              <h4 className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-foreground dark:text-white">
                Summary
              </h4>
            </div>
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-muted-foreground dark:text-zinc-400 break-words">
                {contract.analysis.summary}
              </p>
              <div className="rounded-lg border border-border/40 dark:border-white/[0.03] bg-[hsl(var(--surface-muted))]/40 dark:bg-white/[0.015] px-3 py-2 text-xs text-muted-foreground dark:text-zinc-400 leading-relaxed break-words w-full max-w-full overflow-x-hidden">
                {contract.analysis.why_risky_one_liner}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] w-full max-w-full overflow-x-hidden">
          <div className="space-y-4 md:space-y-5 lg:space-y-6 w-full max-w-full min-w-0">
            {hasRiskyFunctions && (
              <div className="rounded-lg border border-border/50 dark:border-white/5 bg-[hsl(var(--surface-muted))]/30 dark:bg-white/[0.02] p-4 sm:p-5 md:p-6 transition-colors duration-200 w-full max-w-full overflow-x-hidden">
                <div className="mb-3 flex items-center justify-between">
                  <h5 className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-foreground dark:text-white flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--surface-muted))]/50 dark:bg-white/[0.03] shrink-0">
                      <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground dark:text-zinc-500" />
                    </div>
                    Risky Functions
                    <span className="text-muted-foreground dark:text-zinc-500 font-normal">({contract.analysis.risky_functions.length})</span>
                  </h5>
                </div>
                <div className="space-y-1.5">
                  {visibleRiskyFunctions.map(({ data: func, originalIndex }) => {
                    const functionKey = getFunctionKey(func.function_name, originalIndex);
                    const isExpanded = Boolean(expandedFunctions[functionKey]);

                    return (
                      <div
                        key={functionKey}
                        className={cn(
                          'rounded-lg bg-[hsl(var(--surface-muted))]/30 dark:bg-black/40 border border-border/50 dark:border-white/5 px-3 py-2 transition-colors duration-150 w-full max-w-full overflow-x-hidden',
                          isExpanded && 'border-border/60 dark:border-white/10 bg-[hsl(var(--surface-muted))]/40 dark:bg-black/50',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleFunctionContent(functionKey)}
                          className="flex w-full flex-wrap items-start gap-2 text-left sm:flex-nowrap sm:items-center sm:justify-between min-w-0"
                          aria-expanded={isExpanded}
                        >
                          <span className="flex min-w-0 flex-1 items-start gap-2">
                            <ChevronRight
                              className={cn(
                                'mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150 sm:mt-0',
                                isExpanded && 'rotate-90',
                              )}
                            />
                            <span className="break-words font-mono text-xs font-medium leading-5 text-muted-foreground dark:text-zinc-300 line-clamp-2 sm:line-clamp-none min-w-0">
                              {func.function_name}
                            </span>
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="mt-2.5 sm:mt-3 md:mt-4 pl-5 sm:pl-6 md:pl-7 w-full max-w-full overflow-x-hidden">
                            <EvidenceBlock text={func.reason} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {contract.analysis.risky_functions.length > DEFAULT_VISIBLE_FUNCTIONS && (
                    <button
                      type="button"
                      onClick={toggleFunctions}
                      className="w-full pt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                    >
                      {showAllFunctions ? (
                        <>Show less <ChevronDown className="h-3 w-3 rotate-180" /></>
                      ) : (
                        <>+{contract.analysis.risky_functions.length - DEFAULT_VISIBLE_FUNCTIONS} more <ChevronDown className="h-3 w-3" /></>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {hasRugPullIndicators && (
              <div className="rounded-lg border border-border/50 dark:border-white/5 bg-[hsl(var(--surface-muted))]/30 dark:bg-white/[0.02] p-4 transition-colors duration-200 w-full max-w-full overflow-x-hidden">
                <div className="mb-3 flex items-center justify-between">
                  <h5 className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-foreground dark:text-white flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--surface-muted))]/50 dark:bg-white/[0.03] shrink-0">
                      <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground dark:text-zinc-500" />
                    </div>
                    Rug Pull Indicators
                    <span className="text-muted-foreground dark:text-zinc-500 font-normal">({contract.analysis.rug_pull_indicators.length})</span>
                  </h5>
                </div>
                <div className="space-y-1.5">
                  {rugPullIndicators.map((indicator, index) => {
                    const indicatorKey = getIndicatorKey(indicator.pattern_name, index);
                    const isExpanded = Boolean(expandedIndicators[indicatorKey]);

                    return (
                      <div
                        key={indicatorKey}
                        className={cn(
                          'rounded-lg bg-[hsl(var(--surface-muted))]/30 dark:bg-black/40 border border-border/50 dark:border-white/5 px-3 py-2 transition-colors duration-150 w-full max-w-full overflow-x-hidden',
                          isExpanded && 'border-border/60 dark:border-white/10 bg-[hsl(var(--surface-muted))]/40 dark:bg-black/50',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleIndicatorContent(indicatorKey)}
                          className="flex w-full flex-wrap items-start gap-2 text-left sm:flex-nowrap sm:items-center sm:justify-between min-w-0"
                          aria-expanded={isExpanded}
                        >
                          <span className="flex min-w-0 flex-1 items-start gap-2">
                            <ChevronRight
                              className={cn(
                                'mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150 sm:mt-0',
                                isExpanded && 'rotate-90',
                              )}
                            />
                            <span className="break-words font-medium text-xs leading-5 text-muted-foreground dark:text-zinc-300 line-clamp-2 sm:line-clamp-none min-w-0">
                              {indicator.pattern_name}
                            </span>
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="mt-2.5 sm:mt-3 md:mt-4 pl-5 sm:pl-6 md:pl-7 w-full max-w-full overflow-x-hidden">
                            <EvidenceBlock text={indicator.evidence} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {contract.analysis.rug_pull_indicators.length > DEFAULT_VISIBLE_INDICATORS && (
                    <button
                      type="button"
                      onClick={toggleIndicators}
                      className="w-full pt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                    >
                      {showAllIndicators ? (
                        <>Show less <ChevronDown className="h-3 w-3 rotate-180" /></>
                      ) : (
                        <>+{contract.analysis.rug_pull_indicators.length - DEFAULT_VISIBLE_INDICATORS} more <ChevronDown className="h-3 w-3" /></>
                      )}
                    </button>
                  )}
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
          <div className="space-y-4 md:space-y-5 lg:space-y-6 w-full max-w-full min-w-0">
                <div className="rounded-lg border border-border/50 dark:border-white/5 bg-[hsl(var(--surface-muted))]/30 dark:bg-white/[0.02] p-4 transition-colors duration-200 w-full max-w-full overflow-x-hidden">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--surface-muted))]/50 dark:bg-white/[0.03] shrink-0">
                      <Users className="h-3.5 w-3.5 text-muted-foreground dark:text-zinc-500" />
                    </div>
                    <h6 className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-foreground dark:text-white">
                      Impact On Users
                    </h6>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground dark:text-zinc-400 break-words">
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

                {/* Limitations Card */}
                {contract.analysis.limitations && contract.analysis.limitations.length > 0 && (
                  <div className="rounded-lg border border-border/50 dark:border-white/5 bg-[hsl(var(--surface-muted))]/30 dark:bg-white/[0.02] p-4 transition-colors duration-200 w-full max-w-full overflow-x-hidden">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--surface-muted))]/50 dark:bg-white/[0.03] shrink-0">
                        <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground dark:text-zinc-500" />
                      </div>
                      <h6 className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-foreground dark:text-white">
                        Limitations
                      </h6>
                    </div>
                    <ul className="space-y-1.5">
                      {contract.analysis.limitations.map((limitation, index) => (
                        <li key={index} className="text-xs text-muted-foreground dark:text-zinc-400 flex items-start gap-1.5">
                          <span className="shrink-0 text-zinc-400 dark:text-zinc-600">•</span>
                          <span className="break-words min-w-0">{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-lg border border-border/50 dark:border-white/5 bg-[hsl(var(--surface-muted))]/30 dark:bg-white/[0.02] p-4 transition-colors duration-200 w-full max-w-full overflow-x-hidden">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--surface-muted))]/50 dark:bg-white/[0.03] shrink-0">
                      <Package className="h-3.5 w-3.5 text-muted-foreground dark:text-zinc-500" />
                    </div>
                    <h6 className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-foreground dark:text-white">
                      Data Source
                    </h6>
                  </div>
                  <div className="space-y-2 w-full min-w-0">
                <div className="group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 rounded-lg px-2 py-1.5 hover:bg-[hsl(var(--surface-muted))]/50 dark:hover:bg-white/[0.03] transition-colors w-full min-w-0">
                  <div className="flex items-center gap-2 min-w-0 shrink-0">
                    <Package className="h-3 w-3 text-muted-foreground dark:text-zinc-500 shrink-0" />
                    <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground dark:text-zinc-500 shrink-0 whitespace-nowrap">Package</dt>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 sm:flex-initial sm:justify-end">
                    <dd
                      className="font-mono text-[11px] text-foreground/80 dark:text-zinc-300 truncate cursor-pointer hover:text-rose-400 active:text-rose-500 transition-colors min-w-0 flex-1"
                      onClick={handleCopyPackageId}
                      title={`${contract.package_id} - Tap to copy`}
                    >
                      {contract.package_id}
                    </dd>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyPackageId}
                      className="h-7 w-7 sm:h-6 sm:w-6 p-0 shrink-0 text-muted-foreground hover:text-foreground dark:hover:text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 active:scale-95 transition-all"
                      aria-label="Copy package id"
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 rounded-lg px-2 py-1.5 w-full min-w-0">
                  <div className="flex items-center gap-2 shrink-0">
                    <Network className="h-3 w-3 text-muted-foreground dark:text-zinc-500 shrink-0" />
                    <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground dark:text-zinc-500 whitespace-nowrap">Network</dt>
                  </div>
                  <dd className="text-[11px] text-foreground/80 dark:text-zinc-300 sm:text-right">
                    {contract.network}
                  </dd>
                </div>
                {relativeDeployedAt && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 rounded-lg px-2 py-2 w-full min-w-0 bg-foreground/5 dark:bg-white/5">
                    <div className="flex items-center gap-2 shrink-0">
                      <Package className="h-3.5 w-3.5 text-foreground dark:text-white shrink-0" />
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-foreground dark:text-white whitespace-nowrap">Deployed</dt>
                    </div>
                    <dd className="text-sm text-foreground dark:text-white font-semibold sm:text-right tabular-nums" title={absoluteDeployedAt || undefined}>
                      {relativeDeployedAt}
                    </dd>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 rounded-lg px-2 py-1 w-full min-w-0">
                  <div className="flex items-center gap-2 shrink-0">
                    <Clock className="h-2.5 w-2.5 text-muted-foreground dark:text-zinc-600 shrink-0" />
                    <dt className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground dark:text-zinc-600 whitespace-nowrap">Analyzed</dt>
                  </div>
                  <dd className="text-[10px] text-muted-foreground/70 dark:text-zinc-500 sm:text-right tabular-nums" title={absoluteAnalyzedAt}>
                    {relativeAnalyzedAt}
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
    </motion.div>
  );
}

export default AnalyzedContractCard;
