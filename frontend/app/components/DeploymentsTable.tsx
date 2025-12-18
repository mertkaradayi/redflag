'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { RefreshCcw, Search, X, TrendingUp, TrendingDown, WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRealtimeDeployments, type ConnectionStatus } from '@/lib/useRealtimeDeployments';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { useTimeTick } from '@/lib/useTimeTick';
import { formatAddress, isSuiHash, parseSearchQuery } from '@/lib/deployments';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import DeploymentCard from './DeploymentCard';
import ErrorBoundary from './ErrorBoundary';
import {
  calculateStats,
  fetchDeployments,
  fetchDeploymentStats,
  getDeploymentKey,
  type Deployment,
  type DeploymentsResponse,
} from '@/lib/deployments';

interface DeploymentsTableProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  networkFilter?: 'all' | 'mainnet' | 'testnet';
}

const ITEMS_PER_PAGE = 20;
const MAX_DEPLOYMENTS = 500; // Cap to prevent unbounded growth
const STATS_DEBOUNCE_MS = 2000; // Debounce stats refresh

const SORT_LABELS: Record<'timestamp' | 'checkpoint', string> = {
  timestamp: 'By time',
  checkpoint: 'By checkpoint',
};

const CONNECTION_STATUS_CONFIG: Record<ConnectionStatus, { label: string; color: string; showPing: boolean }> = {
  connected: { label: 'Live', color: 'text-green-600 dark:text-green-400 bg-green-500/10', showPing: true },
  connecting: { label: 'Connecting', color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10', showPing: false },
  disconnected: { label: 'Offline', color: 'text-zinc-500 dark:text-zinc-400 bg-zinc-500/10', showPing: false },
  error: { label: 'Error', color: 'text-red-600 dark:text-red-400 bg-red-500/10', showPing: false },
};

export default function DeploymentsTable({
  autoRefresh = true,
  refreshInterval = 30000,
  networkFilter = 'all',
}: DeploymentsTableProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const [sortBy, setSortBy] = useState<'timestamp' | 'checkpoint'>('timestamp');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showTypeahead, setShowTypeahead] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Single time tick for all cards (prevents N intervals)
  const tick = useTimeTick(60000);

  // Track IDs of newly arrived deployments for animation
  const [newDeploymentIds, setNewDeploymentIds] = useState<Set<string>>(new Set());

  // Refs for cleanup
  const animationTimeoutsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const statsRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingStatsRefreshRef = useRef(false);

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

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear all animation timeouts
      animationTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      animationTimeoutsRef.current.clear();
      // Clear stats refresh timeout
      if (statsRefreshTimeoutRef.current) {
        clearTimeout(statsRefreshTimeoutRef.current);
      }
      // Abort any pending fetch
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const loadDeploymentStats = useCallback(async () => {
    try {
      const networkParam = networkFilter !== 'all' ? networkFilter : null;
      const stats = await fetchDeploymentStats(networkParam);
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
    } finally {
      pendingStatsRefreshRef.current = false;
    }
  }, [networkFilter]);

  // Debounced stats refresh to prevent spam when multiple deployments arrive quickly
  const debouncedStatsRefresh = useCallback(() => {
    // If already pending, don't schedule another
    if (pendingStatsRefreshRef.current) return;

    // Clear any existing timeout
    if (statsRefreshTimeoutRef.current) {
      clearTimeout(statsRefreshTimeoutRef.current);
    }

    pendingStatsRefreshRef.current = true;
    statsRefreshTimeoutRef.current = setTimeout(() => {
      loadDeploymentStats();
    }, STATS_DEBOUNCE_MS);
  }, [loadDeploymentStats]);

  const loadDeployments = useCallback(async (offset: number = 0, append = false, isAutoRefresh = false) => {
    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (offset === 0 && !isAutoRefresh) {
        setLoading(true);
        setError(null);
      } else if (offset > 0) {
        setLoadingMore(true);
      }

      const networkParam = networkFilter !== 'all' ? networkFilter : null;
      const response: DeploymentsResponse = await fetchDeployments(ITEMS_PER_PAGE, offset, controller.signal, networkParam);

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch deployments');
      }

      const newDeployments = response.deployments;
      setDeployments((prev) => {
        if (append) {
          const updated = [...prev, ...newDeployments];
          // Cap the array
          return updated.length > MAX_DEPLOYMENTS ? updated.slice(0, MAX_DEPLOYMENTS) : updated;
        }
        if (isAutoRefresh && prev.length > 0) {
          // Merge new items: prepend truly new ones, keep existing loaded data
          const existingIds = new Set(prev.map(d => getDeploymentKey(d)));
          const trulyNew = newDeployments.filter(d => !existingIds.has(getDeploymentKey(d)));
          const updated = [...trulyNew, ...prev];
          // Cap the array
          return updated.length > MAX_DEPLOYMENTS ? updated.slice(0, MAX_DEPLOYMENTS) : updated;
        }
        return newDeployments;
      });
      if (!isAutoRefresh) {
        setHasMore(newDeployments.length === ITEMS_PER_PAGE);
      }
      setLastUpdate(new Date());
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      if (!isAutoRefresh) {
        setError(message);
      }
      console.error('Error fetching deployments:', err);
    } finally {
      // Only update loading state if this is still the active request
      if (abortControllerRef.current === controller) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [networkFilter]);

  // Handle new deployment from realtime subscription
  const handleNewDeployment = useCallback((deployment: Deployment) => {
    const deploymentKey = getDeploymentKey(deployment);

    // Add to deployments list (prepend) with cap
    setDeployments((prev) => {
      // Check if already exists
      const exists = prev.some(d => getDeploymentKey(d) === deploymentKey);
      if (exists) return prev;

      const updated = [deployment, ...prev];
      // Cap the array to prevent unbounded growth
      if (updated.length > MAX_DEPLOYMENTS) {
        return updated.slice(0, MAX_DEPLOYMENTS);
      }
      return updated;
    });

    // Mark as new for animation
    setNewDeploymentIds((prev) => new Set(prev).add(deploymentKey));

    // Remove "new" status after animation completes (with cleanup tracking)
    const timeout = setTimeout(() => {
      setNewDeploymentIds((prev) => {
        const next = new Set(prev);
        next.delete(deploymentKey);
        return next;
      });
      // Remove from tracking set
      animationTimeoutsRef.current.delete(timeout);
    }, 3000);

    // Track timeout for cleanup on unmount
    animationTimeoutsRef.current.add(timeout);

    // Update last update time
    setLastUpdate(new Date());

    // Refresh stats (debounced to prevent spam)
    debouncedStatsRefresh();
  }, [debouncedStatsRefresh]);

  // Subscribe to realtime deployments
  const { status: connectionStatus, reconnect } = useRealtimeDeployments({
    enabled: autoRefresh,
    onNewDeployment: handleNewDeployment,
    networkFilter,
  });

  // Reset deployments when network filter changes
  useEffect(() => {
    setDeployments([]);
    setError(null);
    setHasMore(true);
  }, [networkFilter]);

  // Initial load and stats refresh (no more deployment polling - realtime handles it)
  useEffect(() => {
    loadDeployments(0, false);
    loadDeploymentStats();

    if (!autoRefresh) return;

    // Only refresh stats periodically, not deployments (realtime handles those)
    const statsInterval = setInterval(() => {
      loadDeploymentStats();
    }, refreshInterval);

    return () => clearInterval(statsInterval);
  }, [autoRefresh, loadDeployments, loadDeploymentStats, refreshInterval]);

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

    // Apply search filter (uses debounced value for performance)
    if (debouncedSearchTerm.trim()) {
      const { type, value } = parseSearchQuery(debouncedSearchTerm);
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
  }, [deployments, debouncedSearchTerm, activeFilter, stats.latestCheckpoint]);

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
              <CardTitle className="text-2xl font-semibold leading-none tracking-tight text-foreground dark:text-white flex items-center gap-3">
                Smart contract deployments
                {autoRefresh && (
                  <button
                    onClick={connectionStatus === 'error' || connectionStatus === 'disconnected' ? reconnect : undefined}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                      CONNECTION_STATUS_CONFIG[connectionStatus].color,
                      (connectionStatus === 'error' || connectionStatus === 'disconnected') && 'cursor-pointer hover:opacity-80'
                    )}
                    title={connectionStatus === 'error' || connectionStatus === 'disconnected' ? 'Click to reconnect' : undefined}
                  >
                    {connectionStatus === 'error' || connectionStatus === 'disconnected' ? (
                      <WifiOff className="h-3 w-3" />
                    ) : (
                      <span className="relative flex h-2 w-2">
                        {CONNECTION_STATUS_CONFIG[connectionStatus].showPing && (
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                        )}
                        <span className={cn(
                          'relative inline-flex h-2 w-2 rounded-full',
                          connectionStatus === 'connected' && 'bg-green-500',
                          connectionStatus === 'connecting' && 'bg-yellow-500 animate-pulse'
                        )} />
                      </span>
                    )}
                    {CONNECTION_STATUS_CONFIG[connectionStatus].label}
                  </button>
                )}
              </CardTitle>
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
                : `Deployments will appear here as soon as they are detected on Sui ${networkFilter === 'all' ? 'mainnet and testnet' : networkFilter}.`}
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
              <AnimatePresence initial={false}>
                {sortedDeployments.map((deployment) => {
                  const deploymentKey = getDeploymentKey(deployment);
                  const isNew = newDeploymentIds.has(deploymentKey);

                  return (
                    <motion.div
                      key={deploymentKey}
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        boxShadow: isNew
                          ? '0 0 20px 4px rgba(209, 34, 38, 0.4)'
                          : '0 0 0px 0px rgba(209, 34, 38, 0)'
                      }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{
                        duration: 0.3,
                        boxShadow: { duration: isNew ? 0.5 : 1.5 }
                      }}
                      className={cn(
                        'rounded-xl transition-shadow',
                        isNew && 'ring-2 ring-[#D12226]/60'
                      )}
                    >
                      <ErrorBoundary>
                        <DeploymentCard deployment={deployment} network={networkFilter !== 'all' ? networkFilter : undefined} tick={tick} />
                      </ErrorBoundary>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
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
