'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { PauseCircle, PlayCircle, RefreshCcw, X, Search, Loader2 } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AnalyzedContractCard from '@/app/components/AnalyzedContractCard';
import type { AnalyzedContract, DashboardData } from '@/app/dashboard/types';
import {
  getRiskFilterStyles,
  getRiskLevelDot,
  getRiskLevelName,
} from '@/app/dashboard/risk-utils';
import { usePagination } from '@/app/dashboard/usePagination';
import { cn } from '@/lib/utils';

const AUTO_REFRESH_SECONDS = 30;
const RISK_FILTERS: Array<'all' | 'critical' | 'high' | 'moderate' | 'low'> = ['all', 'critical', 'high', 'moderate', 'low'];

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'moderate' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState(AUTO_REFRESH_SECONDS);
  const [pauseReason, setPauseReason] = useState<'toolbar' | 'details' | null>(null);

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
        setLastUpdated(new Date());
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
    return data.contracts.filter((contract) => filter === 'all' || contract.analysis.risk_level === filter);
  }, [data, filter]);

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

  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) {
      return null;
    }
    return lastUpdated.toLocaleString();
  }, [lastUpdated]);

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

  const isEmptyState = !loading && filteredContracts.length === 0;
  const isRiskFiltered = filter !== 'all';
  const activeRiskLabel = isRiskFiltered ? getRiskLevelName(filter) : null;
  const activeRiskStyle = isRiskFiltered ? getRiskFilterStyles(filter) : null;
  const emptyTitle = debouncedSearchQuery
    ? activeRiskLabel
      ? `No ${activeRiskLabel} contracts match "${debouncedSearchQuery}"`
      : `No contracts found for "${debouncedSearchQuery}"`
    : activeRiskLabel
      ? `No ${activeRiskLabel} contracts yet`
      : 'No analyzed contracts yet';
  const emptySubtitle = debouncedSearchQuery
    ? 'Adjust your filters or verify the package ID to keep exploring.'
    : 'Run an analysis to populate your dashboard, or switch filters to review previous findings.';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] text-[hsl(var(--surface-contrast))] dark:bg-gradient-to-b dark:from-black dark:via-zinc-950 dark:to-black dark:text-white">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-11 w-11 animate-spin rounded-full border-2 border-border dark:border-white/20 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading analyzed contracts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[hsl(var(--background))] text-[hsl(var(--surface-contrast))] dark:bg-gradient-to-b dark:from-black dark:via-zinc-950 dark:to-black dark:text-white">
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 pb-24 sm:px-8 lg:gap-20 lg:px-16">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
              Monitor your analyzed Sui contracts at a glance.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Search by package ID, focus on the risk tiers that matter, and let auto-refresh surface fresh findings
              the moment they land.
            </p>
          </div>
          {riskStats && (
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent blur-xl" />
                <div className="relative flex h-28 w-28 flex-col items-center justify-center rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-[hsl(var(--surface-elevated))] dark:from-white/10 via-white/5 to-black/40 shadow-lg shadow-[0_0_30px_hsl(var(--primary)/0.1)] backdrop-blur-sm">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[hsl(var(--surface-contrast))] dark:text-white drop-shadow-lg">{riskStats.total.toLocaleString()}</div>
                    <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total</div>
                  </div>
                </div>
              </div>
              <div className="mt-2.5 text-center text-xs font-medium text-muted-foreground">
                {filteredContracts.length.toLocaleString()} in view
              </div>
            </div>
          )}
        </header>


        {error && (
          <Alert className="border-border dark:border-white/15 bg-[hsl(var(--surface-elevated))] dark:bg-white/5 text-foreground dark:text-white/90">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <section className="rounded-xl border border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-white/5 p-4 shadow-md shadow-black/5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/60 dark:text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search by package ID..."
                className={cn(
                  'h-9 rounded-lg border-border/60 bg-background/60 px-9 text-sm text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground/80',
                  isSearching && 'pr-14'
                )}
              />
              <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                {isSearching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="rounded-full p-0.5 text-muted-foreground transition hover:bg-[hsl(var(--surface-elevated))] dark:bg-white/10 hover:text-[hsl(var(--surface-contrast))] dark:text-white"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {RISK_FILTERS.map((level) => {
                const isActive = filter === level;
                const isAll = level === 'all';
                const label = isAll ? 'All risk levels' : getRiskLevelName(level);
                const count = isAll ? riskStats?.total ?? 0 : riskStats?.counts[level] ?? 0;
                const styles = isAll ? null : getRiskFilterStyles(level);

                return (
                  <Button
                    key={level}
                    type="button"
                    variant="outline"
                    onClick={() => setFilter(level)}
                    className={cn(
                      'group relative flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-200',
                      isAll
                        ? cn(
                            'text-foreground dark:text-white hover:shadow-sm transition-all',
                            !isActive && 'border-2 border-border dark:border-white/20 bg-muted/20 dark:bg-white/5 shadow-sm shadow-black/5 dark:shadow-white/5',
                            isActive && 'border-2 border-border dark:border-white/40 bg-muted/50 dark:bg-white/10 shadow-md dark:shadow-lg shadow-black/10 dark:shadow-white/10',
                            'hover:border-border dark:hover:border-white/30 hover:bg-muted/40 dark:hover:bg-white/10'
                          )
                        : styles && cn(
                            styles.border,
                            styles.bg,
                            styles.text,
                            'hover:border-opacity-60 hover:shadow-lg',
                            isActive
                              ? cn(
                                  styles.bgActive,
                                  styles.borderActive,
                                  'border-2 shadow-lg',
                                  styles.glow
                                )
                              : 'hover:bg-opacity-15'
                          )
                    )}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full transition-all duration-200 shrink-0',
                        isAll ? (!isActive ? 'bg-black dark:bg-white/40' : 'bg-foreground dark:bg-white ring-2 ring-offset-2 ring-offset-background dark:ring-offset-black/50 ring-foreground/20 dark:ring-white/30') : getRiskLevelDot(level),
                        isActive && !isAll && styles && cn('ring-2 ring-offset-2 ring-offset-black/50', styles.ring)
                      )}
                    />
                    <span className="relative z-10 whitespace-nowrap">{label}</span>
                    {riskStats && (
                      <span
                        className={cn(
                          'relative z-10 ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition-colors',
                          isAll
                            ? isActive
                              ? 'bg-foreground/10 dark:bg-white/20 text-foreground dark:text-white font-semibold shadow-sm'
                              : 'bg-background/60 dark:bg-white/10 text-muted-foreground group-hover:bg-background/80 dark:group-hover:bg-white/15'
                            : isActive
                              ? styles
                                ? 'bg-[hsl(var(--surface-elevated))] dark:bg-white/20 ' + styles.text
                                : 'bg-[hsl(var(--surface-elevated))] dark:bg-white/20 text-[hsl(var(--surface-contrast))] dark:text-white'
                              : styles
                                ? 'bg-[hsl(var(--surface-elevated))] dark:bg-white/5 ' + styles.text + ' opacity-80 group-hover:opacity-100'
                                : 'bg-[hsl(var(--surface-elevated))] dark:bg-white/5 text-muted-foreground group-hover:bg-[hsl(var(--surface-elevated))] dark:bg-white/10'
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-muted-foreground">
            {debouncedSearchQuery && (
              <span className="flex items-center gap-1.5 rounded-full border border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-white/5 px-2 py-0.5">
                <Search className="h-3 w-3 text-muted-foreground" />
                <span className="text-foreground dark:text-white/90">&apos;{debouncedSearchQuery}&apos;</span>
                <button
                  onClick={clearSearch}
                  className="rounded-full p-0.5 text-muted-foreground transition hover:bg-[hsl(var(--surface-elevated))] dark:bg-white/10 hover:text-[hsl(var(--surface-contrast))] dark:text-white"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {isRiskFiltered && activeRiskLabel && activeRiskStyle && (
              <span className="flex items-center gap-1.5 rounded-full border border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-white/5 px-2 py-0.5">
                <span className={cn('h-2 w-2 rounded-full', activeRiskStyle.dot)} />
                <span className="text-foreground dark:text-white/90">{activeRiskLabel} focus</span>
                <button
                  onClick={() => setFilter('all')}
                  className="rounded-full p-0.5 text-muted-foreground transition hover:bg-[hsl(var(--surface-elevated))] dark:bg-white/10 hover:text-[hsl(var(--surface-contrast))] dark:text-white"
                  aria-label="Clear risk level filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <span className="text-muted-foreground">
              Showing {filteredContracts.length} of {data?.total ?? 0} contracts
              {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
            </span>
          </div>
          <div className="flex flex-col gap-2 pt-3 border-t border-border dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link href="/analyze">
                <Button size="sm" className="gap-1.5 h-8 text-xs">
                  ➕ Analyze Contract
                </Button>
              </Link>
              <Button
                onClick={() => fetchAnalyzedContracts()}
                variant="outline"
                size="sm"
                disabled={isRefreshing}
                className="flex items-center gap-1.5 h-8 text-xs border-border dark:border-white/20 text-[hsl(var(--surface-contrast))] dark:text-white hover:bg-[hsl(var(--surface-elevated))] dark:bg-white/10"
              >
                <RefreshCcw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
                Refresh
              </Button>
              <Button
                onClick={toggleAutoRefresh}
                variant={autoRefresh ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'flex items-center gap-1.5 h-8 text-xs transition-colors',
                  autoRefresh
                    ? 'bg-white text-black hover:bg-white/90'
                    : 'border-border dark:border-white/20 text-[hsl(var(--surface-contrast))] dark:text-white hover:bg-[hsl(var(--surface-elevated))] dark:bg-white/10',
                )}
              >
                {autoRefresh ? <PauseCircle className="h-3 w-3" /> : <PlayCircle className="h-3 w-3" />}
                {autoRefresh ? 'Pause' : 'Resume'}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground">
              {formattedLastUpdated && (
                <span className="rounded-full border border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-white/5 px-2 py-0.5">
                  Updated {formattedLastUpdated}
                  {autoRefresh && ` • ${refreshCountdown}s`}
                </span>
              )}
              <span className="rounded-full border border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-white/5 px-2 py-0.5">Supabase Synced</span>
              <span className="rounded-full border border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-white/5 px-2 py-0.5">Move Pattern Library</span>
            </div>
          </div>
        </section>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Page size:</span>
              <select
                value={pageSize}
                onChange={(e) => setPaginationPageSize(Number.parseInt(e.target.value, 10))}
                className="rounded-lg border border-border dark:border-white/15 bg-[hsl(var(--surface-muted))] dark:bg-[hsl(var(--background))] dark:bg-black/40 px-3 py-1.5 text-sm text-[hsl(var(--surface-contrast))] dark:text-white focus:border-border dark:border-white/40 focus:outline-none focus:ring-0"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={previousPage}
                disabled={!hasPreviousPage}
                variant="outline"
                size="sm"
                className="border-border dark:border-white/15 text-[hsl(var(--surface-contrast))] dark:text-white hover:bg-[hsl(var(--surface-elevated))] dark:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
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
                        'min-w-[2.5rem]',
                        currentPage === pageNum
                          ? 'bg-white text-black hover:bg-white'
                          : 'border-border dark:border-white/15 text-[hsl(var(--surface-contrast))] dark:text-white hover:bg-[hsl(var(--surface-elevated))] dark:bg-white/10'
                      )}
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
                className="border-border dark:border-white/15 text-[hsl(var(--surface-contrast))] dark:text-white hover:bg-[hsl(var(--surface-elevated))] dark:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </Button>
            </div>
          </section>
        )}

        {pauseReason === 'details' && !autoRefresh && (
          <Alert className="border-border dark:border-white/15 bg-[hsl(var(--surface-elevated))] dark:bg-white/5 text-foreground dark:text-white/85">
            <AlertDescription>
              Auto refresh is paused so the results stay put while you explore a contract. Resume it from the toolbar when you&apos;re ready for new data.
            </AlertDescription>
          </Alert>
        )}

        <section className="space-y-5">
          {isEmptyState ? (
            <div className="rounded-2xl border border-border dark:border-white/10 bg-[hsl(var(--surface-muted))] dark:bg-[hsl(var(--background))] dark:bg-black/40 p-12 text-center shadow-sm shadow-black/10">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border dark:border-white/15 text-2xl">
                📊
              </div>
              <h3 className="mt-4 text-xl font-semibold text-[hsl(var(--surface-contrast))] dark:text-white">{emptyTitle}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{emptySubtitle}</p>
              <div className="mt-6 flex justify-center gap-3">
                {debouncedSearchQuery && (
                  <Button
                    onClick={clearSearch}
                    variant="outline"
                    className="border-border dark:border-white/15 text-[hsl(var(--surface-contrast))] dark:text-white hover:bg-[hsl(var(--surface-elevated))] dark:bg-white/10"
                  >
                    Clear Search
                  </Button>
                )}
                <Link href="/analyze">
                  <Button>
                    Analyze a Contract
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            filteredContracts.map((contract) => (
              <AnalyzedContractCard
                key={`${contract.package_id}-${contract.network}-${contract.analyzed_at}`}
                contract={contract}
                onAutoRefreshPause={pauseAutoRefreshFromDetails}
              />
            ))
          )}
        </section>
      </main>
    </div>
  );
}
