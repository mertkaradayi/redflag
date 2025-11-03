'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import DeploymentCard from './DeploymentCard';
import {
  calculateStats,
  fetchDeployments,
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

  const loadDeployments = useCallback(async (offset: number = 0, append = false) => {
    try {
      if (offset === 0) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const response: DeploymentsResponse = await fetchDeployments(ITEMS_PER_PAGE, offset);

      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch deployments');
      }

      const newDeployments = response.deployments;
      setDeployments((prev) => (append ? [...prev, ...newDeployments] : newDeployments));
      setHasMore(newDeployments.length === ITEMS_PER_PAGE);
      setLastUpdate(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      console.error('Error fetching deployments:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadDeployments(0, false);

    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadDeployments(0, false);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, loadDeployments, refreshInterval]);

  const filteredDeployments = useMemo(() => {
    if (!searchTerm.trim()) {
      return deployments;
    }

    const term = searchTerm.toLowerCase();
    return deployments.filter(
      (deployment) =>
        deployment.package_id.toLowerCase().includes(term) ||
        deployment.deployer_address.toLowerCase().includes(term) ||
        deployment.tx_digest.toLowerCase().includes(term),
    );
  }, [deployments, searchTerm]);

  const sortedDeployments = useMemo(() => {
    return [...filteredDeployments].sort((a, b) =>
      sortBy === 'timestamp'
        ? new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        : b.checkpoint - a.checkpoint,
    );
  }, [filteredDeployments, sortBy]);

  const stats = useMemo(() => calculateStats(deployments), [deployments]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadDeployments(deployments.length, true);
    }
  };

  const handleRefresh = () => {
    loadDeployments(0, false);
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
    <Card className="border-border dark:border-white/10 bg-[hsl(var(--surface-elevated))] dark:bg-white/5 text-foreground dark:text-white shadow-sm shadow-black/5 dark:shadow-white/5 transition-colors duration-200">
      <CardHeader className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-foreground dark:text-white">Smart contract deployments</CardTitle>
            <CardDescription className="mt-2 text-sm text-muted-foreground">
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
              'inline-flex items-center gap-2 border-[#D12226]/40 dark:border-[#D12226]/40 text-[#D12226] dark:text-[#D12226] hover:bg-[#D12226]/10 dark:hover:bg-[#D12226]/10',
              loading && 'pointer-events-none opacity-60',
            )}
          >
            <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {deployments.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border dark:border-white/10 bg-[hsl(var(--surface-muted))] dark:bg-black/40 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Total</div>
              <div className="mt-2 text-3xl font-semibold text-foreground dark:text-white">
                {stats.total.toLocaleString()}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Across current feed window</p>
            </div>
            <div className="rounded-xl border border-border dark:border-white/10 bg-[hsl(var(--surface-muted))] dark:bg-black/40 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Last 24h
              </div>
              <div className="mt-2 text-3xl font-semibold text-[#D12226] dark:text-[#D12226]">
                {stats.last24h.toLocaleString()}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Fresh launches since yesterday</p>
            </div>
            <div className="rounded-xl border border-border dark:border-white/10 bg-[hsl(var(--surface-muted))] dark:bg-black/40 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Latest checkpoint
              </div>
              <div className="mt-2 text-3xl font-semibold text-foreground dark:text-white">
                {stats.latestCheckpoint?.toLocaleString() ?? '—'}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Most recent index observed</p>
            </div>
            <div className="rounded-xl border border-border dark:border-white/10 bg-[hsl(var(--surface-muted))] dark:bg-black/40 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Most active deployer
              </div>
              <div className="mt-2 text-xl font-semibold text-foreground dark:text-white">
                {stats.mostActiveDeployer
                  ? `${stats.mostActiveDeployer.slice(0, 6)}…${stats.mostActiveDeployer.slice(-4)}`
                  : '—'}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Top account in current window</p>
            </div>
          </div>
        )}

        {deployments.length > 0 && (
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by package, deployer, or transaction…"
                className="w-full rounded-full border border-border dark:border-white/15 bg-[hsl(var(--surface-muted))] dark:bg-black/60 py-2 pl-11 pr-4 text-sm text-foreground dark:text-white placeholder:text-muted-foreground focus:border-[#D12226] focus:outline-none focus:ring-2 focus:ring-[#D12226]/40 transition-colors duration-200"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['timestamp', 'checkpoint'] as const).map((option) => {
                const isActive = sortBy === option;
                return (
                  <Button
                    key={option}
                    variant="outline"
                    size="sm"
                    onClick={() => setSortBy(option)}
                    className={cn(
                      'rounded-full border-[#D12226]/40 dark:border-[#D12226]/40 px-4 text-sm font-semibold capitalize transition',
                      isActive
                        ? 'bg-[#D12226] text-white hover:bg-[#a8181b]'
                        : 'text-[#D12226] dark:text-[#D12226] hover:bg-[#D12226]/10 dark:hover:bg-[#D12226]/10',
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

      <CardContent className="space-y-6">
        {sortedDeployments.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="text-6xl">📦</div>
            <h3 className="text-lg font-semibold text-foreground dark:text-white">
              {searchTerm ? 'No matching deployments' : 'No deployments yet'}
            </h3>
            <p className="max-w-md text-sm text-muted-foreground">
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
                <DeploymentCard key={`${deployment.package_id}-${deployment.timestamp}`} deployment={deployment} />
              ))}
            </div>

            {hasMore && (
              <div className="text-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  variant="outline"
                  className={cn(
                    'w-full sm:w-auto border-[#D12226]/40 dark:border-[#D12226]/40 text-[#D12226] dark:text-[#D12226] hover:bg-[#D12226]/10 dark:hover:bg-[#D12226]/10',
                    loadingMore && 'opacity-60',
                  )}
                >
                  {loadingMore ? 'Loading…' : 'Load more deployments'}
                </Button>
              </div>
            )}

            {!hasMore && deployments.length > 0 && (
              <div className="text-center text-sm text-muted-foreground">
                You&apos;ve reached the end of the results
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
