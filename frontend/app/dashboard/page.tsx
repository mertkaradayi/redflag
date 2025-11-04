'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { PauseCircle, PlayCircle, RefreshCcw, X, Search, Loader2, BarChart3, Filter, ShieldAlert, Timer, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

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
const RISK_LEVELS: Array<'critical' | 'high' | 'moderate' | 'low'> = ['critical', 'high', 'moderate', 'low'];

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

export default function Dashboard() {
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

    const visible = filteredContracts.length;
    const visiblePercent = totalAnalyzed > 0 ? Math.round((visible / totalAnalyzed) * 100) : null;
    const criticalAndHigh = riskCounts.critical + riskCounts.high;

    return [
      {
        key: 'total',
        label: 'Analyzed packages',
        value: totalAnalyzed,
        meta: 'All time',
        icon: BarChart3,
        accent: 'info' as const,
        span: 'double' as const,
      },
      {
        key: 'highRisk',
        label: 'High risk detected',
        value: criticalAndHigh,
        meta: `${riskCounts.critical.toLocaleString()} critical • ${riskCounts.high.toLocaleString()} high`,
        icon: ShieldAlert,
        accent: 'alert' as const,
      },
      {
        key: 'visible',
        label: 'In current view',
        value: visible,
        meta: visiblePercent !== null ? `${visiblePercent}% of total` : null,
        icon: Filter,
        accent: 'muted' as const,
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
        accent: autoRefresh ? 'muted' : 'alert',
      },
    ];
  }, [autoRefresh, data, filteredContracts.length, formattedLastUpdated, pauseReason, refreshCountdown, riskCounts, riskStats, totalAnalyzed]);

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

  const isEmptyState = !loading && filteredContracts.length === 0;
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
      <section className="rounded-xl border border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-black/40 p-6 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold leading-none tracking-tight text-foreground dark:text-white">
                Analyzed contracts
              </h1>
              <p className="mt-2 text-sm text-muted-foreground dark:text-zinc-400">
                {data && data.total > 0 ? (
                  <>
                    {totalAnalyzed.toLocaleString()} analyzed packages
                    {criticalAndHigh > 0 && (
                      <span className="text-foreground/70 dark:text-white/70"> • {criticalAndHigh.toLocaleString()} high risk detected</span>
                    )}
                    {formattedLastUpdated && (
                      <span className="text-muted-foreground dark:text-white/60">
                        {' '}
                        • Last updated {formattedLastUpdated}
                      </span>
                    )}
                  </>
                ) : (
                  'No analyzed contracts yet'
                )}
              </p>
            </div>
            <Button
              onClick={() => fetchAnalyzedContracts()}
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              className={cn(
                'h-9 rounded-md px-3 inline-flex items-center gap-2 border-[#D12226]/40 text-[#D12226] hover:bg-[#D12226]/10',
                isRefreshing && 'pointer-events-none opacity-60',
              )}
            >
              <RefreshCcw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {/* Key Stats */}
          {heroStats.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {heroStats.map(({ key, label, value, meta, icon: Icon, accent = 'muted' }) => {
                const displayValue = typeof value === 'number' ? value.toLocaleString() : value;
                const isHighRisk = key === 'highRisk';
                
                return (
                  <div
                    key={key}
                    className="rounded-2xl border border-border dark:border-white/10 bg-[hsl(var(--surface-muted))] dark:bg-black/40 p-4"
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground dark:text-zinc-400">
                      {label}
                    </div>
                    <div className={cn(
                      'mt-2 text-3xl font-semibold tabular-nums',
                      isHighRisk ? 'text-[#D12226]' : 'text-foreground dark:text-white'
                    )}>
                      {displayValue}
                    </div>
                    {meta && (
                      <p className="mt-1 text-xs text-muted-foreground dark:text-zinc-500">
                        {meta}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {error && (
        <Alert className="rounded-xl border border-[#D12226]/60 dark:border-[#D12226]/60 bg-[#D12226]/15 dark:bg-[#D12226]/15 text-foreground dark:text-white shadow-sm shadow-black/5 dark:shadow-white/5">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Controls: Search, Filters, Actions */}
      <section className="rounded-xl border border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-black/40 p-6 shadow-lg backdrop-blur">
        <div className="space-y-6">
          {/* Search and Filters Row */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground dark:text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search by package ID..."
                className={cn(
                  'w-full rounded-full border border-border dark:border-white/15 bg-[hsl(var(--surface-muted))] dark:bg-black/60 py-2 pl-11 pr-4 text-sm text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-zinc-500 focus:border-[#D12226] focus:outline-none focus:ring-2 focus:ring-[#D12226]/40',
                  isSearching && 'pr-11'
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground dark:text-zinc-500" />}
                {searchQuery && !isSearching && (
                  <button onClick={clearSearch} className="p-0.5 text-muted-foreground hover:text-foreground dark:hover:text-white" aria-label="Clear search">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {(['all', ...RISK_LEVELS] as const).map((level) => {
                const isAll = level === 'all';
                const isActive = isAll 
                  ? (selectedFilters.size === 0 || selectedFilters.size === RISK_LEVELS.length)
                  : selectedFilters.has(level);
                const label = isAll ? 'All' : getRiskLevelName(level);
                const count = isAll ? totalAnalyzed : riskCounts[level] ?? 0;
                const styles = isAll ? null : getRiskFilterStyles(level);

                return (
                  <Button
                    key={level}
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (isAll) {
                        setSelectedFilters(new Set(RISK_LEVELS));
                      } else {
                        const newFilters = new Set(selectedFilters);
                        if (newFilters.has(level)) {
                          newFilters.delete(level);
                        } else {
                          newFilters.add(level);
                        }
                        setSelectedFilters(newFilters);
                      }
                    }}
                    size="sm"
                    className={cn(
                      'h-9 rounded-md px-3 text-sm font-medium',
                      isActive
                        ? isAll
                          ? 'bg-[#D12226] text-white border-[#D12226] hover:bg-[#a8181b]'
                          : styles && cn(styles.bgActive, styles.borderActive, styles.text)
                        : isAll
                          ? 'border-border dark:border-white/15 text-foreground dark:text-white hover:bg-[hsl(var(--surface-elevated))] dark:hover:bg-white/10'
                          : styles && cn(styles.border, styles.bg, styles.text, 'hover:bg-opacity-15')
                    )}
                  >
                    {!isAll && <span className={cn('h-1.5 w-1.5 rounded-full mr-1.5', getRiskLevelDot(level))} />}
                    <span>{label}</span>
                    {(data || riskStats) && count > 0 && (
                      <span className={cn('ml-1.5 rounded px-1.5 py-0.5 text-xs font-semibold', isActive ? 'bg-white/20' : 'bg-[hsl(var(--surface-elevated))] dark:bg-white/5')}>
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
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {debouncedSearchQuery && (
                <span className="flex items-center gap-1.5 rounded-full border border-border dark:border-white/15 bg-[hsl(var(--surface-muted))] dark:bg-black/60 px-3 py-1">
                  <Search className="h-3.5 w-3.5 text-muted-foreground dark:text-zinc-500" />
                  <span className="text-foreground dark:text-white">&apos;{debouncedSearchQuery}&apos;</span>
                  <button onClick={clearSearch} className="p-0.5 hover:text-foreground dark:hover:text-white" aria-label="Clear search">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
              {isRiskFiltered && activeFilters.length > 0 && (
                <>
                  {activeFilters.map((level) => {
                    const label = getRiskLevelName(level);
                    const styles = getRiskFilterStyles(level);
                    return (
                      <span key={level} className="flex items-center gap-1.5 rounded-full border border-border dark:border-white/15 bg-[hsl(var(--surface-muted))] dark:bg-black/60 px-3 py-1">
                        <span className={cn('h-1.5 w-1.5 rounded-full', styles.dot)} />
                        <span className="text-foreground dark:text-white">{label}</span>
                        <button 
                          onClick={() => {
                            const newFilters = new Set(selectedFilters);
                            newFilters.delete(level);
                            setSelectedFilters(newFilters);
                          }} 
                          className="p-0.5 hover:text-foreground dark:hover:text-white" 
                          aria-label={`Remove ${label} filter`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    );
                  })}
                  <button 
                    onClick={() => setSelectedFilters(new Set(RISK_LEVELS))} 
                    className="text-sm text-muted-foreground hover:text-foreground dark:hover:text-white underline"
                    aria-label="Show all filters"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </div>
          )}

          {/* Actions and Info Bar */}
          <div className="flex flex-col gap-4 border-t border-border dark:border-white/10 pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/analyze">
                <Button size="sm" className="h-9 bg-[#D12226] text-white hover:bg-[#a8181b]">
                  Analyze Contract
                </Button>
              </Link>
              <Button onClick={toggleAutoRefresh} variant={autoRefresh ? 'default' : 'outline'} size="sm" className="h-9">
                {autoRefresh ? <PauseCircle className="h-4 w-4 mr-1.5" /> : <PlayCircle className="h-4 w-4 mr-1.5" />}
                {autoRefresh ? 'Pause' : 'Resume'}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground dark:text-zinc-400">
              {formattedLastUpdated && (
                <span>
                  Updated {formattedLastUpdated}
                  {autoRefresh && ` • ${refreshCountdown}s`}
                </span>
              )}
              <span className="text-foreground dark:text-white font-medium">
                {filteredContracts.length} of {data?.total ?? 0}
                {totalPages > 1 && ` • Page ${currentPage}/${totalPages}`}
              </span>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col gap-4 border-t border-border dark:border-white/10 pt-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground dark:text-zinc-400 whitespace-nowrap">Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPaginationPageSize(Number.parseInt(e.target.value, 10))}
                  className="h-9 rounded-md border border-border dark:border-white/15 bg-[hsl(var(--surface-muted))] dark:bg-black/60 px-3 text-sm text-foreground dark:text-white transition-colors focus:border-[#D12226] focus:outline-none focus:ring-2 focus:ring-[#D12226]/40"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-muted-foreground dark:text-zinc-400 hidden sm:inline">per page</span>
              </div>

              <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                {currentPage > 4 && totalPages > 7 && (
                  <>
                <Button
                  onClick={() => goToPage(1)}
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 border-border dark:border-white/15 hover:bg-[hsl(var(--surface-elevated))] dark:hover:bg-white/10"
                  aria-label="First page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                    {currentPage > 5 && (
                      <span className="px-1 text-sm text-muted-foreground dark:text-zinc-400">...</span>
                    )}
                  </>
                )}

                <Button
                  onClick={previousPage}
                  disabled={!hasPreviousPage}
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 border-border dark:border-white/15 text-foreground dark:text-white hover:bg-[hsl(var(--surface-elevated))] dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline text-sm">Prev</span>
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
                          'h-9 min-w-9 px-3 text-sm font-medium transition-all',
                          currentPage === pageNum
                            ? 'bg-[#D12226] text-white border-[#D12226] hover:bg-[#a8181b]'
                            : 'border-border dark:border-white/15 text-foreground dark:text-white hover:bg-[hsl(var(--surface-elevated))] dark:hover:bg-white/10'
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
                  className="h-9 px-3 border-border dark:border-white/15 text-foreground dark:text-white hover:bg-[hsl(var(--surface-elevated))] dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <span className="hidden sm:inline text-sm">Next</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>

                {currentPage < totalPages - 3 && totalPages > 7 && (
                  <>
                    {currentPage < totalPages - 4 && (
                      <span className="px-1 text-sm text-muted-foreground dark:text-zinc-400">...</span>
                    )}
                    <Button
                      onClick={() => goToPage(totalPages)}
                      variant="outline"
                      size="sm"
                      className="h-9 w-9 p-0 border-border dark:border-white/15 hover:bg-[hsl(var(--surface-elevated))] dark:hover:bg-white/10"
                      aria-label="Last page"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {pauseReason === 'details' && !autoRefresh && (
        <Alert className="border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-black/40">
          <AlertDescription className="text-sm text-foreground dark:text-white">
            Auto-refresh paused while viewing contract details. Resume from the toolbar above.
          </AlertDescription>
        </Alert>
      )}

      {/* Contract List */}
      <section className="space-y-4">
        {isEmptyState ? (
          <div className="rounded-xl border border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-black/40 p-12 text-center shadow-lg backdrop-blur">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border dark:border-white/10 bg-[hsl(var(--surface-muted))] dark:bg-black/40 text-2xl mb-4">
              📊
            </div>
            <h3 className="text-lg font-semibold text-foreground dark:text-white mb-2">{emptyTitle}</h3>
            <p className="text-sm text-muted-foreground dark:text-zinc-400 mb-6">{emptySubtitle}</p>
            <div className="flex justify-center gap-2">
              {debouncedSearchQuery && (
                <Button onClick={clearSearch} variant="outline" size="sm" className="border-border dark:border-white/15">
                  Clear Search
                </Button>
              )}
              <Link href="/analyze">
                <Button size="sm" className="bg-[#D12226] text-white hover:bg-[#a8181b]">
                  Analyze Contract
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
    </div>
  );
}
