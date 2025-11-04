'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { RefreshCcw, Search, X, TrendingUp, TrendingDown } from 'lucide-react';
import { formatAddress, isSuiHash, parseSearchQuery } from '@/lib/deployments';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import DeploymentCard from './DeploymentCard';
import {
  calculateStats,
  fetchDeployments,
  fetchDeploymentStats,
  type Deployment,
  type DeploymentsResponse,
} from '@/lib/deployments';

interface DeploymentsTableProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const ITEMS_PER_PAGE = 20;
const SORT_LABELS: Record<'timestamp' | 'checkpoint', string> = {
  timestamp: 'By time',
  checkpoint: 'By checkpoint',
};

export default function DeploymentsTable({
  autoRefresh = true,
  refreshInterval = 30000,
}: DeploymentsTableProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'timestamp' | 'checkpoint'>('timestamp');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showTypeahead, setShowTypeahead] = useState(false);
  const [network, setNetwork] = useState<'mainnet' | 'testnet' | undefined>(undefined);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Filter states for KPI tiles
  const [activeFilter, setActiveFilter] = useState<'all' | 'last24h' | 'checkpoint' | null>(null);
  

  // Stats from database (accurate counts, not just paginated results)
  const [dbStats, setDbStats] = useState<{
    total: number;
    last24h: number;
    previous24h: number;
    last24hDelta: number;
    latestCheckpoint: number | null;
  } | null>(null);

  const loadDeploymentStats = useCallback(async () => {
    try {
      const stats = await fetchDeploymentStats();
      if (stats.success) {
        setDbStats({
          total: stats.total,
          last24h: stats.last24h,
          previous24h: stats.previous24h,
          last24hDelta: stats.last24hDelta,
          latestCheckpoint: stats.latestCheckpoint,
        });
      }
    } catch (err) {
      console.error('Error fetching deployment stats:', err);
      // Don't set error state here - stats are non-critical
    }
  }, []);

  const loadDeployments = useCallback(async (offset: number = 0, append = false) => {
    try {
      if (offset === 0) {
        setLoading(true);
        setError(null);
        // Load stats when refreshing the list
        loadDeploymentStats();
      } else {
        setLoadingMore(true);
      }

      const response: DeploymentsResponse = await fetchDeployments(ITEMS_PER_PAGE, offset);

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch deployments');
      }

      const newDeployments = response.deployments;
      setDeployments((prev) => {
        const updated = append ? [...prev, ...newDeployments] : newDeployments;
        return updated;
      });
      setHasMore(newDeployments.length === ITEMS_PER_PAGE);
      setLastUpdate(new Date());
      if (response.network) {
        setNetwork(response.network);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      console.error('Error fetching deployments:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [loadDeploymentStats]);

  useEffect(() => {
    loadDeployments(0, false);

    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadDeployments(0, false);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, loadDeployments, refreshInterval]);

  // Load stats on mount and when auto-refresh is enabled
  useEffect(() => {
    loadDeploymentStats();

    if (!autoRefresh) return;

    const statsInterval = setInterval(() => {
      loadDeploymentStats();
    }, refreshInterval);

    return () => clearInterval(statsInterval);
  }, [autoRefresh, loadDeploymentStats, refreshInterval]);

  // Use database stats if available, otherwise fall back to calculated stats from paginated data
  const stats = useMemo(() => {
    if (dbStats) {
      return {
        total: dbStats.total,
        last24h: dbStats.last24h,
        previous24h: dbStats.previous24h,
        last24hDelta: dbStats.last24hDelta,
        latestCheckpoint: dbStats.latestCheckpoint,
        previousCheckpoint: null, // Not needed for display
        checkpointDelta: null, // Not calculated from DB stats
        mostActiveDeployer: null, // Not in DB stats
        mostActiveDeployerCount: 0, // Not in DB stats
      };
    }
    // Fallback to calculated stats from paginated deployments
    return calculateStats(deployments);
  }, [dbStats, deployments]);

  const filteredDeployments = useMemo(() => {
    let filtered = deployments;

    // Apply time-based filter from KPI tiles
    if (activeFilter === 'last24h') {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      filtered = filtered.filter((d) => new Date(d.timestamp) > last24h);
    } else if (activeFilter === 'checkpoint' && stats.latestCheckpoint !== null) {
      // Filter to show deployments near the latest checkpoint (within 100 checkpoints)
      filtered = filtered.filter(
        (d) => Math.abs(d.checkpoint - stats.latestCheckpoint!) < 100
      );
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const { type, value } = parseSearchQuery(searchTerm);
      const term = value.toLowerCase();

      if (type === 'deployer') {
        filtered = filtered.filter((d) => d.deployer_address.toLowerCase().includes(term));
      } else if (type === 'package') {
        filtered = filtered.filter((d) => d.package_id.toLowerCase().includes(term));
      } else if (type === 'tx') {
        filtered = filtered.filter((d) => d.tx_digest.toLowerCase().includes(term));
      } else {
        // Default: search all fields
        filtered = filtered.filter(
          (deployment) =>
            deployment.package_id.toLowerCase().includes(term) ||
            deployment.deployer_address.toLowerCase().includes(term) ||
            deployment.tx_digest.toLowerCase().includes(term),
        );
      }
    }

    return filtered;
  }, [deployments, searchTerm, activeFilter, stats.latestCheckpoint]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    
    // Show typeahead suggestions if it looks like a hash
    if (isSuiHash(value) && !value.includes(':')) {
      setShowTypeahead(true);
    } else {
      setShowTypeahead(false);
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text').trim();
    
    // If pasted text is a hash without a prefix, auto-format it
    if (isSuiHash(pastedText) && !pastedText.includes(':')) {
      e.preventDefault();
      // Try to detect what type it might be based on deployment data
      const matchingDeployment = deployments.find(
        (d) =>
          d.package_id.toLowerCase() === pastedText.toLowerCase() ||
          d.deployer_address.toLowerCase() === pastedText.toLowerCase() ||
          d.tx_digest.toLowerCase() === pastedText.toLowerCase()
      );
      
      if (matchingDeployment) {
        // Auto-detect type
        if (matchingDeployment.package_id.toLowerCase() === pastedText.toLowerCase()) {
          setSearchTerm(`package:${pastedText}`);
        } else if (matchingDeployment.deployer_address.toLowerCase() === pastedText.toLowerCase()) {
          setSearchTerm(`deployer:${pastedText}`);
        } else if (matchingDeployment.tx_digest.toLowerCase() === pastedText.toLowerCase()) {
          setSearchTerm(`tx:${pastedText}`);
        } else {
          setSearchTerm(pastedText);
        }
      } else {
        setSearchTerm(pastedText);
      }
      setShowTypeahead(false);
    }
  }, [deployments]);

  const sortedDeployments = useMemo(() => {
    return [...filteredDeployments].sort((a, b) =>
      sortBy === 'timestamp'
        ? new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        : b.checkpoint - a.checkpoint,
    );
  }, [filteredDeployments, sortBy]);


  // Filter handlers for KPI tiles
  const handleFilterByLast24h = useCallback(() => {
    if (activeFilter === 'last24h') {
      setActiveFilter(null);
    } else {
      setActiveFilter('last24h');
    }
  }, [activeFilter]);

  const handleFilterByCheckpoint = useCallback(() => {
    if (stats.latestCheckpoint === null) return;
    if (activeFilter === 'checkpoint') {
      setActiveFilter(null);
    } else {
      setActiveFilter('checkpoint');
    }
  }, [activeFilter, stats.latestCheckpoint]);

  const handleClearFilters = useCallback(() => {
    setActiveFilter(null);
    setSearchTerm('');
  }, []);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadDeployments(deployments.length, true);
    }
  };

  const handleRefresh = () => {
    loadDeployments(0, false);
    loadDeploymentStats();
  };

  const renderSkeleton = () => (
    <Card className="border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-white/5 text-foreground dark:text-white shadow-sm shadow-black/5 dark:shadow-white/5 transition-colors duration-200">
      <CardHeader>
        <CardTitle className="text-foreground dark:text-white">Smart contract deployments</CardTitle>
        <CardDescription className="text-muted-foreground">Loading the latest deployments…</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="h-32 rounded-xl border border-border dark:border-white/10 bg-[hsl(var(--surface-muted))] dark:bg-white/10 animate-pulse" />
        ))}
      </CardContent>
    </Card>
  );

  const renderError = (message: string) => (
    <Card className="border-[#D12226]/60 dark:border-[#D12226]/60 bg-[#D12226]/15 dark:bg-[#D12226]/15 text-foreground dark:text-white shadow-sm shadow-black/5 dark:shadow-white/5 transition-colors duration-200">
      <CardHeader>
        <CardTitle className="text-foreground dark:text-white">Smart contract deployments</CardTitle>
        <CardDescription className="text-foreground/80 dark:text-white/80">Error loading deployments</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 py-10 text-sm">
        <p className="text-foreground dark:text-white">{message}</p>
        <Button
          onClick={handleRefresh}
          variant="outline"
          className="border-border dark:border-white/60 text-foreground dark:text-white hover:bg-[hsl(var(--surface-elevated))] dark:hover:bg-white/10"
        >
          Try again
        </Button>
      </CardContent>
    </Card>
  );

  if (loading && deployments.length === 0) {
    return renderSkeleton();
  }

  if (error) {
    return renderError(error);
  }

  return (
    <Card className="bg-[hsl(var(--surface-elevated))] dark:bg-black/40 text-foreground dark:text-white shadow-lg backdrop-blur">
      <CardHeader className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-2xl font-semibold leading-none tracking-tight text-foreground dark:text-white">Smart contract deployments</CardTitle>
              <CardDescription className="mt-2 text-sm text-muted-foreground dark:text-zinc-400">
                {deployments.length > 0 ? (
                  <>
                    {stats.total} tracked deployments
                    {stats.last24h > 0 && (
                      <span className="text-foreground/70 dark:text-white/70"> • {stats.last24h} in the last 24 hours</span>
                    )}
                    {lastUpdate && (
                      <span className="text-muted-foreground dark:text-white/60">
                        {' '}
                        • Last updated {lastUpdate.toLocaleTimeString()}
                      </span>
                    )}
                  </>
                ) : (
                  'No deployments detected yet'
                )}
              </CardDescription>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className={cn(
                'justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border bg-background hover:text-accent-foreground h-9 rounded-md px-3 inline-flex items-center gap-2 border-[#D12226]/40 text-[#D12226] hover:bg-[#D12226]/10',
                loading && 'pointer-events-none opacity-60',
              )}
            >
              <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          {deployments.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {/* Total Deployments Tile */}
              <button
                onClick={handleClearFilters}
                className={cn(
                  "group relative rounded-xl border p-3.5 text-left transition-all cursor-pointer",
                  activeFilter === null
                    ? "border-[#D12226]/60 dark:border-[#D12226]/60 bg-[#D12226]/10 dark:bg-[#D12226]/20"
                    : "border-border dark:border-white/10 bg-[hsl(var(--surface-muted))] dark:bg-black/40 hover:border-[#D12226]/40 dark:hover:border-[#D12226]/60 hover:bg-[#D12226]/5 dark:hover:bg-[#D12226]/10"
                )}
              >
                <div className="mb-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground dark:text-zinc-400">
                    Total
                  </div>
                </div>
                <div className="text-2xl font-bold text-foreground dark:text-white tabular-nums">
                  {stats.total.toLocaleString()}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground dark:text-zinc-500">Current window</p>
              </button>

              {/* Last 24h Tile */}
              <button
                onClick={handleFilterByLast24h}
                className={cn(
                  "group relative rounded-xl border p-3.5 text-left transition-all cursor-pointer",
                  activeFilter === 'last24h'
                    ? "border-[#D12226]/60 dark:border-[#D12226]/60 bg-[#D12226]/10 dark:bg-[#D12226]/20"
                    : "border-border dark:border-white/10 bg-[hsl(var(--surface-muted))] dark:bg-black/40 hover:border-[#D12226]/40 dark:hover:border-[#D12226]/60 hover:bg-[#D12226]/5 dark:hover:bg-[#D12226]/10"
                )}
              >
                <div className="mb-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground dark:text-zinc-400">
                    Last 24h
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold text-[#D12226] tabular-nums">
                    {stats.last24h.toLocaleString()}
                  </div>
                  {stats.last24hDelta !== 0 && (
                    <div className={cn(
                      "flex items-center gap-0.5 text-[10px] font-semibold",
                      stats.last24hDelta > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {stats.last24hDelta > 0 ? (
                        <TrendingUp className="h-2.5 w-2.5" />
                      ) : (
                        <TrendingDown className="h-2.5 w-2.5" />
                      )}
                      <span>{Math.abs(stats.last24hDelta)}</span>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground dark:text-zinc-500">
                  vs previous 24h
                </p>
              </button>

              {/* Latest Checkpoint Tile */}
              <button
                onClick={handleFilterByCheckpoint}
                disabled={stats.latestCheckpoint === null}
                className={cn(
                  "group relative rounded-xl border p-3.5 text-left transition-all",
                  stats.latestCheckpoint === null
                    ? "border-border dark:border-white/10 bg-[hsl(var(--surface-muted))] dark:bg-black/40 cursor-default opacity-60"
                    : activeFilter === 'checkpoint'
                      ? "border-[#D12226]/60 dark:border-[#D12226]/60 bg-[#D12226]/10 dark:bg-[#D12226]/20 cursor-pointer"
                      : "border-border dark:border-white/10 bg-[hsl(var(--surface-muted))] dark:bg-black/40 hover:border-[#D12226]/40 dark:hover:border-[#D12226]/60 hover:bg-[#D12226]/5 dark:hover:bg-[#D12226]/10 cursor-pointer"
                )}
              >
                <div className="mb-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground dark:text-zinc-400">
                    Latest checkpoint
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold text-foreground dark:text-white tabular-nums">
                    {stats.latestCheckpoint?.toLocaleString() ?? '—'}
                  </div>
                  {stats.checkpointDelta !== null && stats.checkpointDelta !== 0 && (
                    <div className="text-[10px] font-semibold text-muted-foreground">
                      +{stats.checkpointDelta.toLocaleString()}
                    </div>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground dark:text-zinc-500">
                  {stats.latestCheckpoint !== null ? 'Most recent index' : 'No data'}
                </p>
              </button>
            </div>
          )}

          {deployments.length > 0 && (
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground dark:text-zinc-500" />
                <input
                  ref={searchInputRef}
                  id="deployments-search"
                  type="text"
                  value={searchTerm}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  onPaste={handlePaste}
                  onFocus={() => {
                    if (isSuiHash(searchTerm) && !searchTerm.includes(':')) {
                      setShowTypeahead(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding to allow clicks on typeahead items
                    setTimeout(() => setShowTypeahead(false), 200);
                  }}
                  placeholder="Search packages, deployers, tx."
                  className="w-full rounded-full border border-border dark:border-white/15 bg-[hsl(var(--surface-muted))] dark:bg-black/60 py-2 pl-11 pr-10 text-sm text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-zinc-500 focus:border-[#D12226] focus:outline-none focus:ring-2 focus:ring-[#D12226]/40"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setShowTypeahead(false);
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                {showTypeahead && isSuiHash(searchTerm) && !searchTerm.includes(':') && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-black/60 shadow-lg z-50 overflow-hidden">
                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground dark:text-zinc-400 px-3 py-2 border-b border-border dark:border-white/10">
                      Filter by type
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm(`deployer:${searchTerm}`);
                        setShowTypeahead(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-foreground dark:text-white hover:bg-[hsl(var(--surface-muted))] dark:hover:bg-white/5 transition-colors"
                    >
                      <span className="font-mono text-[#D12226]">deployer:</span>
                      <span className="ml-1">{formatAddress(searchTerm)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm(`package:${searchTerm}`);
                        setShowTypeahead(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-foreground dark:text-white hover:bg-[hsl(var(--surface-muted))] dark:hover:bg-white/5 transition-colors"
                    >
                      <span className="font-mono text-[#D12226]">package:</span>
                      <span className="ml-1">{formatAddress(searchTerm)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm(`tx:${searchTerm}`);
                        setShowTypeahead(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-foreground dark:text-white hover:bg-[hsl(var(--surface-muted))] dark:hover:bg-white/5 transition-colors"
                    >
                      <span className="font-mono text-[#D12226]">tx:</span>
                      <span className="ml-1">{formatAddress(searchTerm)}</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {(['timestamp', 'checkpoint'] as const).map((option) => {
                  const isActive = sortBy === option;
                  return (
                    <Button
                      key={option}
                      variant="outline"
                      size="sm"
                      onClick={() => setSortBy(option)}
                      className={cn(
                        'inline-flex items-center justify-center whitespace-nowrap ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border hover:text-accent-foreground h-9 rounded-full border-[#D12226]/40 px-4 text-sm font-semibold capitalize transition',
                        isActive
                          ? 'bg-[#D12226] text-white hover:bg-[#a8181b]'
                          : 'text-[#D12226] hover:bg-[#D12226]/10',
                      )}
                    >
                      {SORT_LABELS[option]}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </CardHeader>

      <CardContent className="p-6 pt-0 space-y-6">
        {sortedDeployments.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="text-6xl">📦</div>
            <h3 className="text-lg font-semibold text-foreground dark:text-white">
              {searchTerm ? 'No matching deployments' : 'No deployments yet'}
            </h3>
            <p className="max-w-md text-sm text-muted-foreground dark:text-zinc-400">
              {searchTerm
                ? 'Try adjusting your search terms or clearing the search box.'
                : 'Deployments will appear here as soon as they are detected on the Sui testnet.'}
            </p>
            {searchTerm && (
              <Button
                onClick={() => setSearchTerm('')}
                variant="outline"
                className="border-border dark:border-white/40 text-foreground dark:text-white hover:bg-[hsl(var(--surface-elevated))] dark:hover:bg-white/10"
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4">
              {sortedDeployments.map((deployment) => (
                <DeploymentCard key={`${deployment.package_id}-${deployment.timestamp}`} deployment={deployment} network={network} />
              ))}
            </div>

            {hasMore && (
              <div className="text-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  variant="outline"
                  className={cn(
                    'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border bg-background hover:text-accent-foreground h-10 px-4 py-2 w-full sm:w-auto border-[#D12226]/40 text-[#D12226] hover:bg-[#D12226]/10',
                    loadingMore && 'opacity-60',
                  )}
                >
                  {loadingMore ? 'Loading…' : 'Load more deployments'}
                </Button>
              </div>
            )}

            {!hasMore && deployments.length > 0 && (
              <div className="text-center text-sm text-muted-foreground dark:text-zinc-400">
                You&apos;ve reached the end of the results
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
