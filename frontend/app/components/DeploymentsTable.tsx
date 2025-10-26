'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DeploymentCard from './DeploymentCard';
import { 
  fetchDeployments, 
  calculateStats, 
  type Deployment, 
  type DeploymentsResponse 
} from '@/lib/deployments';

interface DeploymentsTableProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function DeploymentsTable({ 
  autoRefresh = true, 
  refreshInterval = 30000 
}: DeploymentsTableProps) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'timestamp' | 'checkpoint'>('timestamp');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const ITEMS_PER_PAGE = 20;

  // Fetch deployments with pagination
  const loadDeployments = useCallback(async (offset: number = 0, append: boolean = false) => {
    try {
      if (offset === 0) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const response: DeploymentsResponse = await fetchDeployments(ITEMS_PER_PAGE, offset);
      
      if (response.success) {
        const newDeployments = response.deployments;
        
        if (append) {
          setDeployments(prev => [...prev, ...newDeployments]);
        } else {
          setDeployments(newDeployments);
        }
        
        setHasMore(newDeployments.length === ITEMS_PER_PAGE);
        setLastUpdate(new Date());
      } else {
        throw new Error(response.message || 'Failed to fetch deployments');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching deployments:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Load more deployments
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadDeployments(deployments.length, true);
    }
  };

  // Refresh deployments
  const handleRefresh = () => {
    loadDeployments(0, false);
  };

  // Auto-refresh effect
  useEffect(() => {
    loadDeployments(0, false);

    if (autoRefresh) {
      const interval = setInterval(() => {
        loadDeployments(0, false);
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [loadDeployments, autoRefresh, refreshInterval]);

  // Filter deployments based on search term
  const filteredDeployments = deployments.filter(deployment => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      deployment.package_id.toLowerCase().includes(term) ||
      deployment.deployer_address.toLowerCase().includes(term) ||
      deployment.tx_digest.toLowerCase().includes(term)
    );
  });

  // Sort deployments
  const sortedDeployments = [...filteredDeployments].sort((a, b) => {
    if (sortBy === 'timestamp') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    } else {
      return b.checkpoint - a.checkpoint;
    }
  });

  // Calculate statistics
  const stats = calculateStats(deployments);

  if (loading && deployments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Smart Contract Deployments</CardTitle>
          <CardDescription>Loading deployments...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Smart Contract Deployments</CardTitle>
          <CardDescription>Error loading deployments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Smart Contract Deployments</CardTitle>
            <CardDescription>
              {deployments.length > 0 ? (
                <>
                  {stats.total} total deployments
                  {stats.last24h > 0 && ` • ${stats.last24h} in last 24h`}
                  {lastUpdate && (
                    <span className="text-zinc-400">
                      {' '}• Last updated {lastUpdate.toLocaleTimeString()}
                    </span>
                  )}
                </>
              ) : (
                'No deployments found yet'
              )}
            </CardDescription>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            Refresh
          </Button>
        </div>

        {/* Statistics Summary */}
        {deployments.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {stats.total}
              </div>
              <div className="text-sm text-zinc-500">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.last24h}
              </div>
              <div className="text-sm text-zinc-500">Last 24h</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.latestCheckpoint?.toLocaleString() || 'N/A'}
              </div>
              <div className="text-sm text-zinc-500">Latest Checkpoint</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.mostActiveDeployer ? 
                  (stats.mostActiveDeployer.slice(0, 6) + '...') : 
                  'N/A'
                }
              </div>
              <div className="text-sm text-zinc-500">Most Active</div>
            </div>
          </div>
        )}

        {/* Search and Sort Controls */}
        {deployments.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by package ID, deployer, or transaction..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={sortBy === 'timestamp' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('timestamp')}
              >
                By Time
              </Button>
              <Button
                variant={sortBy === 'checkpoint' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('checkpoint')}
              >
                By Checkpoint
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {sortedDeployments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              {searchTerm ? 'No matching deployments' : 'No deployments yet'}
            </h3>
            <p className="text-zinc-500 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Deployments will appear here as they are detected on Sui testnet'
              }
            </p>
            {searchTerm && (
              <Button onClick={() => setSearchTerm('')} variant="outline">
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4">
              {sortedDeployments.map((deployment) => (
                <DeploymentCard key={deployment.package_id} deployment={deployment} />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center pt-6">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}

            {/* End of results indicator */}
            {!hasMore && deployments.length > 0 && (
              <div className="text-center py-4 text-zinc-500 text-sm">
                You've reached the end of the results
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
