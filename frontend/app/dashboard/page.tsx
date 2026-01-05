'use client';

import { useCallback, useEffect, useMemo, useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { X, Search, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Clock, TrendingDown, ArrowRight } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

import AnalyzedContractCard from '@/app/components/AnalyzedContractCard';
import { UnanalyzedPackageCard } from '@/app/components/UnanalyzedPackageCard';
import { SkeletonCard } from '@/app/components/SkeletonCard';
import { QuickStatsBar } from '@/app/components/QuickStatsBar';
import { ViewModeToggle, type ViewMode } from '@/app/components/ViewModeToggle';
import { CompactContractCard } from '@/app/components/CompactContractCard';
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
const RISK_LEVELS = ['critical', 'high', 'moderate', 'low'] as const;
type RiskLevel = typeof RISK_LEVELS[number];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 200];

type SortOption = 'newest' | 'oldest' | 'risk_high' | 'risk_low';
type NetworkFilter = 'all' | 'mainnet' | 'testnet';

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

function DashboardContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<Set<RiskLevel>>(new Set(RISK_LEVELS));
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState(AUTO_REFRESH_SECONDS);
  const [pauseReason, setPauseReason] = useState<'toolbar' | 'details' | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [selectedPackageNetwork, setSelectedPackageNetwork] = useState<'mainnet' | 'testnet' | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('compact');
  const [expandedCompactCard, setExpandedCompactCard] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [networkFilter, setNetworkFilter] = useState<NetworkFilter>('all');
  const [timeFilter, setTimeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('all');

  // Load viewMode from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('dashboard-view-mode');
    if (savedMode === 'full' || savedMode === 'compact') {
      setViewMode(savedMode);
    }
  }, []);

  // Save viewMode to localStorage when it changes
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('dashboard-view-mode', mode);
    setExpandedCompactCard(null);
  }, []);


  // Package status state (for URL-based package lookup)
  const [packageStatus, setPackageStatus] = useState<PackageStatusState | null>(null);
  const [packageStatusLoading, setPackageStatusLoading] = useState(false);
  const [packageStatusError, setPackageStatusError] = useState<string | null>(null);

  const areAllFiltersSelected = useMemo(
    () => selectedFilters.size === RISK_LEVELS.length,
    [selectedFilters],
  );

  const activeRiskFilters = useMemo(() => {
    if (areAllFiltersSelected) {
      return [];
    }
    return Array.from(selectedFilters).sort(
      (a, b) => RISK_LEVELS.indexOf(a) - RISK_LEVELS.indexOf(b)
    );
  }, [areAllFiltersSelected, selectedFilters]);

  // Initialize pagination hook
  const pagination = usePagination({
    initialPage: 1,
    initialPageSize: 25,
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

  const handleResetFilters = useCallback(() => {
    setSelectedFilters(new Set(RISK_LEVELS));
    goToPage(1);
  }, [goToPage]);

  const handleToggleRiskFilter = useCallback(
    (level: RiskLevel) => {
      setSelectedFilters((prev) => {
        const next = new Set(prev);
        const wasAllSelected = prev.size === RISK_LEVELS.length;

        if (wasAllSelected) {
          return new Set<RiskLevel>([level]);
        }

        if (next.has(level)) {
          next.delete(level);
          if (next.size === 0) {
            return new Set(RISK_LEVELS);
          }
        } else {
          next.add(level);
        }

        return next;
      });
      goToPage(1);
    },
    [goToPage],
  );

  const handleNetworkFilterChange = useCallback(
    (network: NetworkFilter) => {
      setNetworkFilter(network);
      goToPage(1);
    },
    [goToPage],
  );

  const handleTimeFilterChange = useCallback(
    (filter: '24h' | '7d' | '30d' | 'all') => {
      setTimeFilter(filter);
      goToPage(1);
    },
    [goToPage],
  );

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

      if (activeRiskFilters.length > 0) {
        params.append('riskLevels', activeRiskFilters.join(','));
      }

      // Add network parameter for server-side filtering
      if (networkFilter !== 'all') {
        params.append('network', networkFilter);
      }

      // Add deployment time filter
      if (timeFilter !== 'all') {
        const now = new Date();
        const hoursAgo = timeFilter === '24h' ? 24 : timeFilter === '7d' ? 168 : 720; // 24h, 7d (168h), 30d (720h)
        const deployedAfter = new Date(now.getTime() - hoursAgo * 3600000).toISOString();
        params.append('deployedAfter', deployedAfter);
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
  }, [activeRiskFilters, debouncedSearchQuery, networkFilter, timeFilter, offset, pageSize]);

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

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

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

    let contracts = data.contracts;

    // Filter by risk level (show all if all filters are selected or none are selected)
    if (selectedFilters.size > 0 && selectedFilters.size < RISK_LEVELS.length) {
      contracts = contracts.filter((contract) => selectedFilters.has(contract.analysis.risk_level));
    }

    // Sort contracts
    const riskOrder: Record<RiskLevel, number> = { critical: 0, high: 1, moderate: 2, low: 3 };
    const sorted = [...contracts].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime();
        case 'oldest':
          return new Date(a.analyzed_at).getTime() - new Date(b.analyzed_at).getTime();
        case 'risk_high':
          if (riskOrder[a.analysis.risk_level] !== riskOrder[b.analysis.risk_level]) {
            return riskOrder[a.analysis.risk_level] - riskOrder[b.analysis.risk_level];
          }
          return b.analysis.risk_score - a.analysis.risk_score;
        case 'risk_low':
          if (riskOrder[a.analysis.risk_level] !== riskOrder[b.analysis.risk_level]) {
            return riskOrder[b.analysis.risk_level] - riskOrder[a.analysis.risk_level];
          }
          return a.analysis.risk_score - b.analysis.risk_score;
        default:
          return 0;
      }
    });

    return sorted;
  }, [data, selectedFilters, sortBy]);

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
    // Defer state update to avoid updating during render
    setTimeout(() => {
      setAutoRefresh((prev) => {
        if (!prev) {
          return prev;
        }
        setPauseReason('details');
        return false;
      });
    }, 0);
  }, []);

  const isEmptyState = !loading && displayedContracts.length === 0;
  const isRiskFiltered = activeRiskFilters.length > 0;
  const activeFilters = activeRiskFilters;
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
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-24 transition-colors duration-200 sm:px-8 lg:gap-6 lg:px-16">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} variant={viewMode} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-24 transition-colors duration-200 sm:px-8 lg:gap-5 lg:px-16">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-x-0 top-[-15%] h-[520px] bg-[radial-gradient(circle_at_center,rgba(209,34,38,0.26),transparent_60%)] dark:opacity-100 opacity-0" />
        <div className="absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(209,34,38,0.18),transparent_60%)] blur-3xl dark:opacity-100 opacity-0" />
      </div>

      <section className="space-y-6 transition-colors duration-200">
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground dark:text-white sm:text-5xl">
            Risk Intelligence Dashboard
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Monitor threats, analyze code, and protect your protocol with our advanced multi-agent security pipeline. Track deployment risk scores in real-time.
          </p>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center w-full lg:w-auto">
            <Link href="/analyze" className="w-full sm:w-auto">
              <Button className="w-full bg-[#D12226] text-white hover:bg-[#a8181b] sm:w-auto">
                Start analysis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground dark:text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search by package ID..."
                className={cn(
                  'w-full rounded-full border border-border dark:border-white/15 bg-[hsl(var(--surface-muted))] dark:bg-black/40 py-2 pl-11 pr-10 text-sm text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-zinc-500 focus:border-[#D12226] focus:outline-none focus:ring-2 focus:ring-[#D12226]/40',
                  isSearching && 'pr-14'
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {isSearching && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground dark:text-zinc-500" />}
                {searchQuery && (
                  <button onClick={clearSearch} className="p-1 text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors" aria-label="Clear search">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Network Filter */}
            <div className="inline-flex items-center gap-1 rounded-full border border-border dark:border-white/10 bg-[hsl(var(--surface-muted))] dark:bg-black/40 p-1">
              {(['all', 'mainnet', 'testnet'] as const).map((network) => (
                <button
                  key={network}
                  onClick={() => handleNetworkFilterChange(network)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-all',
                    networkFilter === network
                      ? 'bg-foreground dark:bg-white text-background dark:text-black'
                      : 'text-muted-foreground hover:text-foreground dark:hover:text-white'
                  )}
                >
                  {network === 'all' ? 'All' : network.charAt(0).toUpperCase() + network.slice(1)}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="h-4 w-px bg-border dark:bg-white/15" />

            {/* Time Filter */}
            <div className="inline-flex items-center gap-1 rounded-full border border-border dark:border-white/10 bg-[hsl(var(--surface-muted))] dark:bg-black/40 p-1">
              {(['24h', '7d', '30d', 'all'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => handleTimeFilterChange(filter)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-all',
                    timeFilter === filter
                      ? 'bg-foreground dark:bg-white text-background dark:text-black'
                      : 'text-muted-foreground hover:text-foreground dark:hover:text-white'
                  )}
                >
                  {filter === 'all' ? 'All Time' : filter.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="h-4 w-px bg-border dark:bg-white/15" />

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-8 appearance-none rounded-full border border-border dark:border-white/10 bg-[hsl(var(--surface-muted))] dark:bg-black/40 pl-3 pr-8 text-xs font-medium text-foreground dark:text-white transition-colors focus:border-[#D12226] focus:outline-none focus:ring-2 focus:ring-[#D12226]/40 cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="risk_high">Highest Risk</option>
                <option value="risk_low">Lowest Risk</option>
              </select>
              <ArrowUpDown className="absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>

            {/* View Mode */}
            <ViewModeToggle mode={viewMode} onChange={handleViewModeChange} />
          </div>
        </div>

        {/* Active Search */}
        {debouncedSearchQuery && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200/50 dark:border-zinc-800/50 bg-[hsl(var(--surface-muted))] dark:bg-black/40 px-2.5 py-1 text-[10px] font-medium text-foreground dark:text-white/80">
              <Search className="h-3 w-3 text-muted-foreground dark:text-zinc-400" />
              <span>&apos;{debouncedSearchQuery}&apos;</span>
              <button onClick={clearSearch} className="p-0.5 hover:text-foreground dark:hover:text-white transition-colors" aria-label="Clear search">
                <X className="h-3 w-3" />
              </button>
            </span>
          </div>
        )}
      </section>
      
      {error && (
        <Alert className="rounded-xl border border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-white/5 text-foreground dark:text-white/90 shadow-sm shadow-black/5 dark:shadow-white/5 transition-colors duration-200">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}



      {pauseReason === 'details' && !autoRefresh && (
        <Alert className="border-border/60 dark:border-white/10 bg-card/50 dark:bg-white/5">
          <AlertDescription className="text-sm">
            Auto-refresh paused while viewing contract details. Resume from the toolbar above.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats Bar */}
      <QuickStatsBar
        counts={riskCounts}
        activeFilters={Array.from(selectedFilters)}
        onFilterToggle={(level) => handleToggleRiskFilter(level as RiskLevel)}
        isLoading={isRefreshing}
        onRefresh={() => fetchAnalyzedContracts()}
        lastUpdated={lastUpdated}
      />

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
                index={0}
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
        ) : viewMode === 'compact' ? (
          <div className="rounded-xl border border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-black/40 backdrop-blur overflow-hidden">
            {/* Table Header */}
            <div className="hidden md:flex items-center gap-4 pl-6 pr-4 py-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 dark:text-zinc-500 border-b border-border/50 dark:border-white/5 bg-[hsl(var(--surface-muted))]/30 dark:bg-black/20">
              <div className="w-11 shrink-0 text-center">Score</div>
              <div className="w-[100px] shrink-0">Risk</div>
              <div className="w-[140px] shrink-0">Package</div>
              <div className="flex-1">Summary</div>
              <div className="w-12 shrink-0 text-center">Net</div>
              <div className="w-16 shrink-0 text-right">Deployed</div>
              <div className="w-16 shrink-0 text-right">Analyzed</div>
              <div className="w-4 shrink-0" />
            </div>

            {/* Table Body - with spacing between rows */}
            <div className="divide-y divide-border/30 dark:divide-white/[0.03]">
              {displayedContracts.map((contract, index) => {
                const cardKey = `${contract.package_id}-${contract.network}`;
                const isExpanded = expandedCompactCard === cardKey;

                return (
                  <div key={cardKey}>
                    {/* Compact row - always visible, click to toggle */}
                    <CompactContractCard
                      contract={contract}
                      index={index}
                      isExpanded={isExpanded}
                      onExpand={() => setExpandedCompactCard(isExpanded ? null : cardKey)}
                    />

                    {/* Expanded details - inline below the row */}
                    {isExpanded && (
                      <div className="bg-[hsl(var(--surface-muted))]/50 dark:bg-white/[0.02] w-full overflow-x-hidden">
                        <div className="px-4 py-5 sm:px-6 w-full max-w-full overflow-x-hidden">
                          <AnalyzedContractCard
                            contract={contract}
                            index={index}
                            onAutoRefreshPause={pauseAutoRefreshFromDetails}
                            isInline
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          displayedContracts.map((contract, index) => (
            <AnalyzedContractCard
              key={`${contract.package_id}-${contract.network}-${contract.analyzed_at}`}
              contract={contract}
              index={index}
              onAutoRefreshPause={pauseAutoRefreshFromDetails}
            />
          ))
        )}
        </section>

      {/* Pagination - Bottom */}
      <div className="flex flex-col gap-3 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {totalPages > 1 && (
            <>
              <span className="text-xs sm:text-sm text-muted-foreground dark:text-zinc-400 whitespace-nowrap">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => setPaginationPageSize(Number.parseInt(e.target.value, 10))}
                    className="h-8 rounded-md border border-zinc-200/50 dark:border-zinc-800/50 bg-[hsl(var(--surface-muted))] dark:bg-black/40 px-2.5 text-xs sm:text-sm text-foreground dark:text-white transition-colors focus:border-[#D12226] focus:outline-none focus:ring-2 focus:ring-[#D12226]/40"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-xs sm:text-sm text-muted-foreground dark:text-zinc-400 hidden sm:inline">per page</span>
            </>
          )}
          <span className="text-sm text-foreground dark:text-white font-medium ml-2">
            {displayedContracts.length} of {data?.total ?? 0} contracts
            {totalPages > 1 && ` • Page ${currentPage}/${totalPages}`}
          </span>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 sm:gap-1.5">
            {currentPage > 4 && totalPages > 7 && (
              <>
                    <button
                      onClick={() => goToPage(1)}
                      className="inline-flex items-center justify-center h-8 w-8 p-0 rounded-md border border-zinc-200/50 dark:border-zinc-800/50 bg-[hsl(var(--surface-muted))] dark:bg-black/40 text-foreground dark:text-white hover:border-[#D12226]/40 dark:hover:border-[#D12226]/60 hover:bg-[#D12226]/5 dark:hover:bg-[#D12226]/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-label="First page"
                    >
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </button>
                {currentPage > 5 && (
                  <span className="px-1 text-xs text-muted-foreground dark:text-zinc-400">...</span>
                )}
              </>
            )}

            <button
              onClick={previousPage}
              disabled={!hasPreviousPage}
                      className="inline-flex items-center justify-center h-8 px-2.5 rounded-md border border-zinc-200/50 dark:border-zinc-800/50 bg-[hsl(var(--surface-muted))] dark:bg-black/40 text-foreground dark:text-white hover:border-[#D12226]/40 dark:hover:border-[#D12226]/60 hover:bg-[#D12226]/5 dark:hover:bg-[#D12226]/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-0.5" />
              <span className="hidden sm:inline text-xs">Prev</span>
            </button>

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
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={cn(
                      'inline-flex items-center justify-center h-8 min-w-8 px-2 rounded-md text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                      currentPage === pageNum
                        ? 'bg-[#D12226] text-white border border-[#D12226] hover:bg-[#a8181b] shadow-sm focus-visible:ring-[#D12226]/50'
                        : 'border border-zinc-200/50 dark:border-zinc-800/50 bg-[hsl(var(--surface-muted))] dark:bg-black/40 text-foreground dark:text-white hover:border-[#D12226]/40 dark:hover:border-[#D12226]/60 hover:bg-[#D12226]/5 dark:hover:bg-[#D12226]/10 focus-visible:ring-ring'
                    )}
                    aria-label={`Page ${pageNum}`}
                    aria-current={currentPage === pageNum ? 'page' : undefined}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={nextPage}
              disabled={!hasNextPage}
                      className="inline-flex items-center justify-center h-8 px-2.5 rounded-md border border-zinc-200/50 dark:border-zinc-800/50 bg-[hsl(var(--surface-muted))] dark:bg-black/40 text-foreground dark:text-white hover:border-[#D12226]/40 dark:hover:border-[#D12226]/60 hover:bg-[#D12226]/5 dark:hover:bg-[#D12226]/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <span className="hidden sm:inline text-xs">Next</span>
              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
            </button>

            {currentPage < totalPages - 3 && totalPages > 7 && (
              <>
                {currentPage < totalPages - 4 && (
                  <span className="px-1 text-xs text-muted-foreground dark:text-zinc-400">...</span>
                )}
                    <button
                      onClick={() => goToPage(totalPages)}
                      className="inline-flex items-center justify-center h-8 w-8 p-0 rounded-md border border-zinc-200/50 dark:border-zinc-800/50 bg-[hsl(var(--surface-muted))] dark:bg-black/40 text-foreground dark:text-white hover:border-[#D12226]/40 dark:hover:border-[#D12226]/60 hover:bg-[#D12226]/5 dark:hover:bg-[#D12226]/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      aria-label="Last page"
                    >
                      <ChevronsRight className="h-3.5 w-3.5" />
                    </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-11 w-11 animate-spin rounded-full border-2 border-border dark:border-white/20 border-t-transparent transition-colors duration-200" />
            <p className="text-sm text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
