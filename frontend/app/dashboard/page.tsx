'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PauseCircle, PlayCircle, RefreshCcw, X, Search, Loader2, BarChart3, Filter, ShieldAlert, Timer, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AnalyzedContractCard from '@/app/components/AnalyzedContractCard';
import { UnanalyzedPackageCard } from '@/app/components/UnanalyzedPackageCard';
import type { AnalyzedContract, DashboardData } from '@/app/dashboard/types';
import type { Deployment } from '@/lib/deployments';
import {
  getRiskFilterStyles,
  getRiskLevelDot,
  getRiskLevelName,
} from '@/app/dashboard/risk-utils';
import { usePagination } from '@/app/dashboard/usePagination';
import { cn } from '@/lib/utils';

const AUTO_REFRESH_SECONDS = 30;
const RISK_LEVELS: Array<'critical' | 'high' | 'moderate' | 'low'> = ['critical', 'high', 'moderate', 'low'];

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

type PackageStatusState = {
  packageId: string;
  deployment: Deployment | null;
  analysis: AnalyzedContract['analysis'] | null;
  analyzedAt: string | null;
  status: 'analyzed' | 'not_analyzed' | 'analysis_failed' | 'not_found';
  network: 'mainnet' | 'testnet';
};

type PackageStatusResponse = {
  success: boolean;
  package_id: string;
  deployment: Deployment | null;
  analysis: AnalyzedContract['analysis'] | null;
  analyzed_at: string | null;
  status: PackageStatusState['status'];
  network: 'mainnet' | 'testnet';
  message?: string;
};

type PendingPackageStatus = Exclude<PackageStatusState['status'], 'analyzed'>;

const buildRequestKey = (pkg: string, net?: 'mainnet' | 'testnet') => `${pkg.toLowerCase()}::${net ?? 'auto'}`;

export default function Dashboard() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<Set<'critical' | 'high' | 'moderate' | 'low'>>(new Set(RISK_LEVELS));
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState(AUTO_REFRESH_SECONDS);
  const [pauseReason, setPauseReason] = useState<'toolbar' | 'details' | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedPackageNetwork, setSelectedPackageNetwork] = useState<'mainnet' | 'testnet' | null>(null);
  
  // Package status state (for URL-based package lookup)
  const [packageStatus, setPackageStatus] = useState<PackageStatusState | null>(null);
  const [packageStatusLoading, setPackageStatusLoading] = useState(false);
  const [packageStatusError, setPackageStatusError] = useState<string | null>(null);

  // Initialize pagination hook
  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: 50,
    total: data?.total ?? 0
  });

  const {
    currentPage,
    pageSize,
    totalPages,
    offset,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    setPageSize: setPaginationPageSize
  } = pagination;

  const activePackageIdRef = useRef<string | null>(null);
  const goToPageRef = useRef(goToPage);

  useEffect(() => {
    goToPageRef.current = goToPage;
  }, [goToPage]);

  const fetchAnalyzedContracts = useCallback(async ({ silent }: { silent?: boolean } = {}) => {
    try {
      if (!silent) {
        setIsRefreshing(true);
      }
      if (debouncedSearchQuery) {
        setIsSearching(true);
      }
      setError(null);

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: offset.toString(),
      });
      
      if (debouncedSearchQuery.trim()) {
        params.append('packageId', debouncedSearchQuery.trim());
      }

      const response = await fetch(`${backendUrl}/api/llm/analyzed-contracts?${params}`, {
        cache: 'no-store',
      });
      const result: DashboardData = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Failed to fetch analyzed contracts (${response.status})`);
      }

      if (result.success) {
        setData(result);
        const updatedAt = result.last_updated ? new Date(result.last_updated) : new Date();
        setLastUpdated(Number.isNaN(updatedAt.getTime()) ? new Date() : updatedAt);
        setRefreshCountdown(AUTO_REFRESH_SECONDS);

        const needsReset = offset >= result.total && result.total > 0;
        const noResults = result.total === 0 && offset !== 0;
        if ((needsReset || noResults) && goToPageRef.current) {
          goToPageRef.current(1);
        }
      } else {
        throw new Error(result.message || 'Failed to fetch analyzed contracts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      setIsSearching(false);
      if (!silent) {
        setIsRefreshing(false);
      }
    }
  }, [debouncedSearchQuery, offset, pageSize]);

  const fetchPackageStatus = useCallback(async (packageId: string, networkOverride?: 'mainnet' | 'testnet') => {
    const requestKey = buildRequestKey(packageId, networkOverride);
    activePackageIdRef.current = requestKey;
    setPackageStatusLoading(true);
    setPackageStatusError(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const url = new URL(`${backendUrl}/api/llm/package-status/${packageId}`);
      if (networkOverride) {
        url.searchParams.set('network', networkOverride);
      }
      const response = await fetch(url.toString(), {
        cache: 'no-store',
      });
      const result = (await response.json()) as PackageStatusResponse;

      if (!response.ok) {
        throw new Error(result.message || `Failed to fetch package status (${response.status})`);
      }

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch package status');
      }

      if (activePackageIdRef.current !== requestKey) {
        return;
      }

      const status = result.status;
      const analyzedAt = typeof result.analyzed_at === 'string' ? result.analyzed_at : null;

      setPackageStatus({
        packageId: result.package_id,
        deployment: result.deployment ?? null,
        analysis: result.analysis ?? null,
        analyzedAt,
        status,
        network: result.network,
      });

      if (status === 'analyzed' && result.analysis) {
        setSearchQuery(packageId);
      }
    } catch (err) {
      if (activePackageIdRef.current === requestKey) {
        setPackageStatus(null);
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        const networkLabel = networkOverride ? ` on ${networkOverride}` : '';
        setPackageStatusError(`Failed to fetch package status${networkLabel} for ${packageId}: ${message}`);
      }
    } finally {
      if (activePackageIdRef.current === requestKey) {
        setPackageStatusLoading(false);
      }
    }
  }, [setSearchQuery]);

  const packageIdParam = searchParams.get('packageId');
  const normalizedPackageId = packageIdParam ? packageIdParam.trim() : null;
  const networkParam = searchParams.get('network');
  const normalizedNetwork = networkParam === 'testnet' ? 'testnet' : networkParam === 'mainnet' ? 'mainnet' : null;

  useEffect(() => {
    if (!normalizedPackageId) {
      activePackageIdRef.current = null;
      setSelectedPackageId(null);
      setSelectedPackageNetwork(null);
      setPackageStatus(null);
      setPackageStatusError(null);
      setPackageStatusLoading(false);
      return;
    }

    setSelectedPackageId(normalizedPackageId);
    setSelectedPackageNetwork(normalizedNetwork);
    setPackageStatus(null);
    fetchPackageStatus(normalizedPackageId, normalizedNetwork ?? undefined);
  }, [normalizedPackageId, normalizedNetwork, fetchPackageStatus]);

  // Debounce search query
  useEffect(() => {
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    searchDebounceTimer.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      goToPage(1); // Reset to page 1 on new search
    }, 400);

    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, [searchQuery, goToPage]);

  // Fetch when pagination or search changes
  useEffect(() => {
    fetchAnalyzedContracts();
  }, [fetchAnalyzedContracts]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !data) {
      return;
    }

    const refreshTimer = setInterval(() => {
      fetchAnalyzedContracts({ silent: true });
    }, AUTO_REFRESH_SECONDS * 1000);

    return () => clearInterval(refreshTimer);
  }, [autoRefresh, data, fetchAnalyzedContracts]);

  useEffect(() => {
    if (!autoRefresh || !data || !lastUpdated) {
      return;
    }

    setRefreshCountdown(AUTO_REFRESH_SECONDS);
    const countdownTimer = setInterval(
      () =>
        setRefreshCountdown((prev) => {
          if (prev <= 1) {
            return AUTO_REFRESH_SECONDS;
          }
          return prev - 1;
        }),
      1000,
    );

    return () => clearInterval(countdownTimer);
  }, [autoRefresh, data, lastUpdated]);

  const filteredContracts = useMemo(() => {
    if (!data) {
      return [];
    }
    // Show all if all filters are selected or none are selected (empty set means show all)
    if (selectedFilters.size === 0 || selectedFilters.size === RISK_LEVELS.length) {
      return data.contracts;
    }
    // Filter by selected risk levels
    return data.contracts.filter((contract) => selectedFilters.has(contract.analysis.risk_level));
  }, [data, selectedFilters]);

  const hasSelectedAnalyzedPackage = !!(
    packageStatus &&
    packageStatus.status === 'analyzed' &&
    packageStatus.analysis
  );

  const displayedContracts = useMemo(() => {
    if (!hasSelectedAnalyzedPackage || !packageStatus) {
      return filteredContracts;
    }

    return filteredContracts.filter(
      (contract) =>
        !(
          contract.package_id.toLowerCase() === packageStatus.packageId.toLowerCase() &&
          contract.network === packageStatus.network
        )
    );
  }, [filteredContracts, hasSelectedAnalyzedPackage, packageStatus]);

  const riskStats = useMemo(() => {
    if (!data) {
      return null;
    }

    const counts: Record<'critical' | 'high' | 'moderate' | 'low', number> = {
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
    };

    data.contracts.forEach((contract: AnalyzedContract) => {
      counts[contract.analysis.risk_level] += 1;
    });

    return {
      total: data.total,
      counts,
    };
  }, [data]);

  const riskCounts = useMemo(() => {
    const countsFromResponse = data?.risk_counts;
    if (countsFromResponse) {
      return countsFromResponse;
    }
    if (riskStats) {
      return riskStats.counts;
    }
    return {
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
    };
  }, [data?.risk_counts, riskStats]);

  const totalAnalyzed = useMemo(() => {
    if (typeof data?.total === 'number') {
      return data.total;
    }
    return riskCounts.critical + riskCounts.high + riskCounts.moderate + riskCounts.low;
  }, [data?.total, riskCounts]);

  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) {
      return null;
    }
    return lastUpdated.toLocaleString();
  }, [lastUpdated]);

  const heroStats = useMemo(() => {
    if (!data && !riskStats) {
      return [];
    }

    const visible = displayedContracts.length + (hasSelectedAnalyzedPackage ? 1 : 0);
    const visiblePercent = totalAnalyzed > 0 ? Math.round((visible / totalAnalyzed) * 100) : null;
    const criticalAndHigh = riskCounts.critical + riskCounts.high;

    return [
      {
        key: 'total',
        label: 'Analyzed packages',
        value: totalAnalyzed,
        meta: 'All time',
        icon: BarChart3,
        span: 'double' as const,
      },
      {
        key: 'highRisk',
        label: 'High risk detected',
        value: criticalAndHigh,
        meta: `${riskCounts.critical.toLocaleString()} critical • ${riskCounts.high.toLocaleString()} high`,
        icon: ShieldAlert,
      },
      {
        key: 'visible',
        label: 'In current view',
        value: visible,
        meta: visiblePercent !== null ? `${visiblePercent}% of total` : null,
        icon: Filter,
      },
      {
        key: 'refresh',
        label: autoRefresh ? 'Auto-refresh' : 'Refresh paused',
        value: autoRefresh ? `${refreshCountdown}s` : 'Manual',
        meta: autoRefresh
          ? formattedLastUpdated
            ? `Updated ${formattedLastUpdated}`
            : 'Until next sync'
          : pauseReason === 'details'
            ? 'Paused while exploring details'
            : 'Use toolbar controls to resume',
        icon: Timer,
      },
    ];
  }, [
    autoRefresh,
    data,
    displayedContracts,
    formattedLastUpdated,
    hasSelectedAnalyzedPackage,
    pauseReason,
    refreshCountdown,
    riskCounts,
    riskStats,
    totalAnalyzed,
  ]);

  // Handle search input Enter key (instant submit)
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
      setDebouncedSearchQuery(searchQuery);
      goToPage(1);
    }
  }, [searchQuery, goToPage]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    goToPage(1);
  }, [goToPage]);

  const pauseAutoRefreshFromDetails = useCallback(() => {
    setAutoRefresh((prev) => {
      if (!prev) {
        return prev;
      }
      setPauseReason('details');
      return false;
    });
  }, []);

  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh((prev) => {
      const next = !prev;
      setPauseReason(next ? null : 'toolbar');
      if (next) {
        setRefreshCountdown(AUTO_REFRESH_SECONDS);
      }
      return next;
    });
  }, []);

  const isEmptyState = !loading && displayedContracts.length === 0;
  const isRiskFiltered = selectedFilters.size > 0 && selectedFilters.size < RISK_LEVELS.length;
  const activeFilters = isRiskFiltered 
    ? RISK_LEVELS.filter(level => selectedFilters.has(level))
    : [];
  const activeFilterLabels = activeFilters.map(level => getRiskLevelName(level));
  const emptyTitle = debouncedSearchQuery
    ? activeFilterLabels.length > 0
      ? `No ${activeFilterLabels.join(', ')} contracts match "${debouncedSearchQuery}"`
      : `No contracts found for "${debouncedSearchQuery}"`
    : activeFilterLabels.length > 0
      ? `No ${activeFilterLabels.join(', ')} contracts yet`
      : 'No analyzed contracts yet';
  const emptySubtitle = debouncedSearchQuery
    ? 'Adjust your filters or verify the package ID to keep exploring.'
    : 'Run an analysis to populate your dashboard, or switch filters to review previous findings.';

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-11 w-11 animate-spin rounded-full border-2 border-border dark:border-white/20 border-t-transparent transition-colors duration-200" />
          <p className="text-sm text-muted-foreground">Loading analyzed contracts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-24 transition-colors duration-200 sm:px-8 lg:gap-8 lg:px-16">
      {/* Header: Title + Key Stats */}
      <header className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground dark:text-white sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">
            Monitor and analyze your Sui smart contracts
          </p>
        </div>

        {/* Key Stats */}
        {heroStats.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {heroStats.map(({ key, label, value, meta, icon: Icon, span }) => {
              const displayValue = typeof value === 'number' ? value.toLocaleString() : value;
              
              return (
                <div
                  key={key}
                  className={cn(
                    'flex flex-col justify-between rounded-lg border border-border/60 dark:border-white/10 bg-[hsl(var(--surface-muted))] dark:bg-white/5 px-4 py-3.5 transition-colors',
                    span === 'double' && 'sm:col-span-2 lg:col-span-1',
                  )}
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="rounded-md p-1.5 shrink-0 bg-foreground/5 text-foreground/70 dark:bg-white/10 dark:text-white/80">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate">
                      {label}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-2xl sm:text-3xl font-bold tabular-nums leading-none text-foreground dark:text-white">
                      {displayValue}
                    </span>
                    {meta && (
                      <span className="text-xs text-muted-foreground text-right leading-tight whitespace-nowrap">
                        {meta}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </header>

      {error && (
        <Alert className="rounded-xl border border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-white/5 text-foreground dark:text-white/90 shadow-sm shadow-black/5 dark:shadow-white/5 transition-colors duration-200">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Controls: Search, Filters, Actions */}
      <section className="rounded-xl border border-border/60 dark:border-white/10 bg-card/50 dark:bg-white/5 p-4">
        <div className="space-y-4">
          {/* Search and Filters Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search by package ID..."
                className={cn('h-9 pl-9 pr-9 text-sm', isSearching && 'pr-14')}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {isSearching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                {searchQuery && (
                  <button onClick={clearSearch} className="p-0.5 text-muted-foreground hover:text-foreground" aria-label="Clear search">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelectedFilters(new Set(RISK_LEVELS));
                }}
                size="sm"
                className={cn(
                  'h-8 gap-1.5 rounded-full px-2.5 text-xs',
                  (selectedFilters.size === 0 || selectedFilters.size === RISK_LEVELS.length)
                    ? 'bg-muted/50 dark:bg-white/10 border-2'
                    : ''
                )}
              >
                <span>All</span>
                {(data || riskStats) && (
                  <span className={cn('ml-0.5 rounded px-1 text-[10px] font-semibold', (selectedFilters.size === 0 || selectedFilters.size === RISK_LEVELS.length) ? 'bg-background/80 dark:bg-white/20' : 'bg-muted/60 dark:bg-white/5')}>
                    {totalAnalyzed.toLocaleString()}
                  </span>
                )}
              </Button>
              {RISK_LEVELS.map((level) => {
                const isActive = selectedFilters.has(level);
                const label = getRiskLevelName(level);
                const count = riskCounts[level] ?? 0;
                const styles = getRiskFilterStyles(level);

                return (
                  <Button
                    key={level}
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const newFilters = new Set(selectedFilters);
                      if (newFilters.has(level)) {
                        newFilters.delete(level);
                      } else {
                        newFilters.add(level);
                      }
                      setSelectedFilters(newFilters);
                    }}
                    size="sm"
                    className={cn(
                      'h-8 gap-1.5 rounded-full px-2.5 text-xs',
                      styles && cn(
                        styles.border,
                        styles.bg,
                        styles.text,
                        isActive && cn(styles.bgActive, styles.borderActive, 'border-2')
                      )
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', getRiskLevelDot(level))} />
                    <span>{label}</span>
                    {(data || riskStats) && (
                      <span className={cn('ml-0.5 rounded px-1 text-[10px] font-semibold', isActive ? 'bg-background/80 dark:bg-white/20' : 'bg-muted/60 dark:bg-white/5')}>
                        {count.toLocaleString()}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Active Filters */}
          {(debouncedSearchQuery || isRiskFiltered) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {debouncedSearchQuery && (
                <span className="flex items-center gap-1.5 rounded-full border border-border/60 dark:border-white/10 bg-muted/40 dark:bg-white/5 px-2 py-0.5">
                  <Search className="h-3 w-3 text-muted-foreground" />
                  <span className="text-foreground">&apos;{debouncedSearchQuery}&apos;</span>
                  <button onClick={clearSearch} className="p-0.5 hover:text-foreground" aria-label="Clear search">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {isRiskFiltered && activeFilters.length > 0 && (
                <>
                  {activeFilters.map((level) => {
                    const label = getRiskLevelName(level);
                    const styles = getRiskFilterStyles(level);
                    return (
                      <span key={level} className="flex items-center gap-1.5 rounded-full border border-border/60 dark:border-white/10 bg-muted/40 dark:bg-white/5 px-2 py-0.5">
                        <span className={cn('h-1.5 w-1.5 rounded-full', styles.dot)} />
                        <span className="text-foreground">{label}</span>
                        <button 
                          onClick={() => {
                            const newFilters = new Set(selectedFilters);
                            newFilters.delete(level);
                            setSelectedFilters(newFilters);
                          }} 
                          className="p-0.5 hover:text-foreground" 
                          aria-label={`Remove ${label} filter`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                  <button 
                    onClick={() => setSelectedFilters(new Set(RISK_LEVELS))} 
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                    aria-label="Show all filters"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex flex-col gap-3 border-t border-border/60 dark:border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/analyze">
                <Button size="sm" className="h-8 gap-1.5 text-xs">Analyze this package</Button>
              </Link>
              <Button onClick={() => fetchAnalyzedContracts()} variant="outline" size="sm" disabled={isRefreshing} className="h-8 gap-1.5 text-xs">
                <RefreshCcw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
                Refresh
              </Button>
              <Button onClick={toggleAutoRefresh} variant={autoRefresh ? 'default' : 'outline'} size="sm" className="h-8 gap-1.5 text-xs">
                {autoRefresh ? <PauseCircle className="h-3 w-3" /> : <PlayCircle className="h-3 w-3" />}
                {autoRefresh ? 'Pause' : 'Resume'}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {formattedLastUpdated && (
                <span className="rounded-full border border-border/60 dark:border-white/10 bg-muted/40 dark:bg-white/5 px-2 py-0.5">
                  Updated {formattedLastUpdated}
                  {autoRefresh && ` • ${refreshCountdown}s`}
                </span>
              )}
              <span className="text-foreground font-medium">
                {filteredContracts.length} of {data?.total ?? 0} contracts
                {totalPages > 1 && ` • Page ${currentPage}/${totalPages}`}
              </span>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-border/60 dark:border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPaginationPageSize(Number.parseInt(e.target.value, 10))}
                  className="h-8 rounded-md border border-border/60 dark:border-white/10 bg-background/60 dark:bg-white/5 px-2.5 text-xs sm:text-sm text-foreground transition-colors focus:border-[#D12226]/50 focus:outline-none focus:ring-2 focus:ring-[#D12226]/20 dark:focus:border-[#D12226]/50 dark:focus:ring-[#D12226]/20"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">per page</span>
              </div>

              <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                {currentPage > 4 && totalPages > 7 && (
                  <>
                    <Button
                      onClick={() => goToPage(1)}
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 border-border/60 dark:border-white/10 hover:bg-muted/50 dark:hover:bg-white/10"
                      aria-label="First page"
                    >
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </Button>
                    {currentPage > 5 && (
                      <span className="px-1 text-xs text-muted-foreground">...</span>
                    )}
                  </>
                )}

                <Button
                  onClick={previousPage}
                  disabled={!hasPreviousPage}
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 border-border/60 dark:border-white/10 hover:bg-muted/50 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
                  <span className="hidden sm:inline text-xs">Prev</span>
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (currentPage <= 4) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          'h-8 min-w-8 px-2 text-xs font-medium transition-all',
                          currentPage === pageNum
                            ? 'bg-[#D12226] text-white border-[#D12226] hover:bg-[#B31B1E] dark:bg-[#D12226] dark:hover:bg-[#ff6b6e] shadow-sm'
                            : 'border-border/60 dark:border-white/10 hover:bg-muted/50 dark:hover:bg-white/10'
                        )}
                        aria-label={`Page ${pageNum}`}
                        aria-current={currentPage === pageNum ? 'page' : undefined}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  onClick={nextPage}
                  disabled={!hasNextPage}
                  variant="outline"
                  size="sm"
                  className="h-8 px-2.5 border-border/60 dark:border-white/10 hover:bg-muted/50 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <span className="hidden sm:inline text-xs">Next</span>
                  <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                </Button>

                {currentPage < totalPages - 3 && totalPages > 7 && (
                  <>
                    {currentPage < totalPages - 4 && (
                      <span className="px-1 text-xs text-muted-foreground">...</span>
                    )}
                    <Button
                      onClick={() => goToPage(totalPages)}
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 border-border/60 dark:border-white/10 hover:bg-muted/50 dark:hover:bg-white/10"
                      aria-label="Last page"
                    >
                      <ChevronsRight className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {pauseReason === 'details' && !autoRefresh && (
        <Alert className="border-border/60 dark:border-white/10 bg-card/50 dark:bg-white/5">
          <AlertDescription className="text-sm">
            Auto-refresh paused while viewing contract details. Resume from the toolbar above.
          </AlertDescription>
        </Alert>
      )}

      {/* Contract List */}
      <section className="space-y-4">
        {/* Show package status card if packageId is in URL */}
        {selectedPackageId && (
          <>
            {packageStatusLoading ? (
              <div className="flex min-h-[20vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="h-11 w-11 animate-spin rounded-full border-2 border-border dark:border-white/20 border-t-transparent transition-colors duration-200" />
                  <p className="text-sm text-muted-foreground">
                    Loading package status{selectedPackageNetwork ? ` on ${selectedPackageNetwork}` : ''}...
                  </p>
                </div>
              </div>
            ) : packageStatusError ? (
              <Alert className="rounded-xl border border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-white/5 text-foreground dark:text-white/90 shadow-sm shadow-black/5 dark:shadow-white/5 transition-colors duration-200">
                <AlertDescription>{packageStatusError}</AlertDescription>
              </Alert>
            ) : packageStatus && packageStatus.status === 'analyzed' && packageStatus.analysis ? (
              <AnalyzedContractCard
                contract={{
                  package_id: packageStatus.packageId,
                  network: packageStatus.network,
                  analysis: packageStatus.analysis,
                  analyzed_at: packageStatus.analyzedAt || new Date().toISOString(),
                }}
                onAutoRefreshPause={pauseAutoRefreshFromDetails}
              />
            ) : packageStatus ? (
              <UnanalyzedPackageCard
                packageId={packageStatus.packageId}
                deployment={packageStatus.deployment}
                status={(packageStatus.status === 'analyzed' ? 'not_analyzed' : packageStatus.status) as PendingPackageStatus}
                network={packageStatus.network}
              />
            ) : (
              <Alert className="rounded-xl border border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-white/5 text-foreground dark:text-white/90 shadow-sm shadow-black/5 dark:shadow-white/5 transition-colors duration-200">
                <AlertDescription>
                  We could not locate package {selectedPackageId}
                  {selectedPackageNetwork ? ` on ${selectedPackageNetwork}` : ''}. Double-check the ID or try analyzing it manually.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {isEmptyState && !selectedPackageId ? (
          <div className="rounded-xl border border-border/60 dark:border-white/10 bg-card/50 dark:bg-white/5 p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/60 dark:border-white/10 bg-muted/40 dark:bg-white/5 text-2xl mb-4">
              📊
            </div>
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-2">{emptyTitle}</h3>
            <p className="text-sm text-muted-foreground mb-6">{emptySubtitle}</p>
            <div className="flex justify-center gap-2">
              {debouncedSearchQuery && (
                <Button onClick={clearSearch} variant="outline" size="sm">
                  Clear Search
                </Button>
              )}
              <Link href="/analyze">
                <Button size="sm">Analyze this package</Button>
              </Link>
            </div>
          </div>
        ) : (
          displayedContracts.map((contract) => (
            <AnalyzedContractCard
              key={`${contract.package_id}-${contract.network}-${contract.analyzed_at}`}
              contract={contract}
              onAutoRefreshPause={pauseAutoRefreshFromDetails}
            />
          ))
        )}
        </section>
    </div>
  );
}
