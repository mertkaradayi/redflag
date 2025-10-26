'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBanner } from './StatusBanner';

interface ContractDeployment {
  packageId: string;
  deployer: string;
  txDigest: string;
  timestamp: number;
  checkpoint: number;
}

interface SuiDeploymentsResponse {
  success: boolean;
  message: string;
  timestamp: string;
  connectionInfo: {
    url: string;
    hasRpcUrl: boolean;
  };
  deployments: ContractDeployment[];
  totalDeployments: number;
  latestCheckpoint?: number | null;
  nextCursor?: string | null;
  pollIntervalMs?: number;
}

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
const DEFAULT_POLL_INTERVAL = 3000;

export default function SuiDeploymentsCheck() {
  const [deploymentsData, setDeploymentsData] = useState<SuiDeploymentsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [detectedPackageId, setDetectedPackageId] = useState<string | null>(null);
  const [resolvedPollInterval, setResolvedPollInterval] = useState(DEFAULT_POLL_INTERVAL);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSeenPackageIdRef = useRef<string | null>(null);
  const lastCheckpointRef = useRef<number | null>(null);
  const isFetchingRef = useRef(false);

  const clearPollingInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    clearPollingInterval();
    setPolling(false);
  }, [clearPollingInterval]);

  const fetchDeployments = useCallback(
    async (isPollingRequest = false) => {
      if (isFetchingRef.current) {
        return;
      }
      isFetchingRef.current = true;

      if (!isPollingRequest) {
        setLoading(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set('limit', '3');

        if (lastCheckpointRef.current !== null) {
          params.set('afterCheckpoint', String(lastCheckpointRef.current));
        }

        const response = await fetch(`${backendUrl}/api/sui/recent-deployments?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data: SuiDeploymentsResponse = await response.json();

        if (typeof data.pollIntervalMs === 'number' && data.pollIntervalMs > 0) {
          setResolvedPollInterval(data.pollIntervalMs);
        }

        if (typeof data.latestCheckpoint === 'number') {
          lastCheckpointRef.current = data.latestCheckpoint;
        }

        setDeploymentsData(data);

        if (data.deployments && data.deployments.length > 0) {
          const latestPackageId = data.deployments[0].packageId;
          const previousPackageId = lastSeenPackageIdRef.current;

          if (previousPackageId && latestPackageId !== previousPackageId) {
            setDetectedPackageId(latestPackageId);
            lastSeenPackageIdRef.current = latestPackageId;

            if (isPollingRequest) {
              stopPolling();
            }
          } else if (!previousPackageId) {
            lastSeenPackageIdRef.current = latestPackageId;
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch deployments';
        setError(message);
      } finally {
        if (!isPollingRequest) {
          setLoading(false);
        }
        isFetchingRef.current = false;
      }
    },
    [stopPolling]
  );

  const startPolling = useCallback(() => {
    setDetectedPackageId(null);
    lastSeenPackageIdRef.current = null;
    lastCheckpointRef.current = null;
    setError(null);
    setPolling(true);
    void fetchDeployments(false);
  }, [fetchDeployments]);

  useEffect(() => {
    if (!polling) {
      clearPollingInterval();
      return;
    }

    clearPollingInterval();
    intervalRef.current = setInterval(() => {
      void fetchDeployments(true);
    }, resolvedPollInterval > 0 ? resolvedPollInterval : DEFAULT_POLL_INTERVAL);

    return () => {
      clearPollingInterval();
    };
  }, [polling, resolvedPollInterval, fetchDeployments, clearPollingInterval]);

  useEffect(() => {
    return () => {
      clearPollingInterval();
    };
  }, [clearPollingInterval]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const pollIntervalSeconds = resolvedPollInterval / 1000;
  const pollIntervalString = pollIntervalSeconds % 1 === 0
    ? pollIntervalSeconds.toFixed(0)
    : pollIntervalSeconds.toFixed(1);
  const pollIntervalSuffix = Math.abs(pollIntervalSeconds - 1) < 0.01 ? '' : 's';

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Sui Contract Deployments</CardTitle>
        <CardDescription>View recent smart contract deployments on Sui testnet.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4" aria-live="polite">
        <div className="space-y-2">
          <Button
            onClick={polling ? stopPolling : startPolling}
            disabled={loading && !polling}
            className={`w-full ${
              polling
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-cyan-600 hover:bg-cyan-700 text-white'
            } dark:bg-cyan-500 dark:hover:bg-cyan-600`}
          >
            {loading && !polling ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Fetching…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-white" />
                {polling ? 'Stop Monitoring' : 'Monitor New Deployments'}
              </span>
            )}
          </Button>

          {polling && (
            <p className="text-sm text-zinc-600 dark:text-zinc-300 text-center">
              🔍 Monitoring for new deployments every {pollIntervalString} second{pollIntervalSuffix}...
            </p>
          )}
        </div>

        {detectedPackageId ? (
          <StatusBanner variant="success" title="New deployment detected">
            <p>
              <strong>Package ID:</strong> {detectedPackageId}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Monitoring paused so you can review the latest publish.
            </p>
          </StatusBanner>
        ) : null}

        {deploymentsData ? (
          <StatusBanner
            variant={deploymentsData.success ? 'success' : 'error'}
            title={
              deploymentsData.success
                ? `Found ${deploymentsData.totalDeployments} deployment${deploymentsData.totalDeployments === 1 ? '' : 's'}`
                : 'Failed to fetch deployments'
            }
          >
            <p>
              <strong>Status:</strong> {deploymentsData.success ? 'Success' : 'Failed'}
            </p>
            <p>
              <strong>Message:</strong> {deploymentsData.message}
            </p>
            <p>
              <strong>Timestamp:</strong> {new Date(deploymentsData.timestamp).toLocaleString()}
            </p>
            {typeof deploymentsData.latestCheckpoint === 'number' && (
              <p>
                <strong>Latest checkpoint inspected:</strong> {deploymentsData.latestCheckpoint}
              </p>
            )}
            {deploymentsData.pollIntervalMs && deploymentsData.pollIntervalMs !== resolvedPollInterval && (
              <p>
                <strong>Suggested polling interval:</strong> {Math.round(deploymentsData.pollIntervalMs / 100) / 10}s
              </p>
            )}
            {deploymentsData.success && deploymentsData.deployments.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">Recent Deployments:</p>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {deploymentsData.deployments.map((deployment, index) => (
                    <div key={index} className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 text-sm">
                      <div className="space-y-2">
                        <div>
                          <strong className="text-zinc-900 dark:text-zinc-100">Package ID:</strong>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-2 py-1 rounded text-xs font-mono break-all">
                              {deployment.packageId}
                            </code>
                            <button
                              onClick={() => copyToClipboard(deployment.packageId)}
                              className="text-cyan-600 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300 text-xs underline"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                        <p className="text-zinc-700 dark:text-zinc-300">
                          <strong className="text-zinc-900 dark:text-zinc-100">Deployer:</strong> {truncateAddress(deployment.deployer)}
                        </p>
                        <p className="text-zinc-700 dark:text-zinc-300">
                          <strong className="text-zinc-900 dark:text-zinc-100">Transaction:</strong> {truncateAddress(deployment.txDigest)}
                        </p>
                        <p className="text-zinc-700 dark:text-zinc-300">
                          <strong className="text-zinc-900 dark:text-zinc-100">Deployed:</strong> {formatTimestamp(deployment.timestamp)}
                        </p>
                        <p className="text-zinc-700 dark:text-zinc-300">
                          <strong className="text-zinc-900 dark:text-zinc-100">Checkpoint:</strong> {deployment.checkpoint}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </StatusBanner>
        ) : null}

        {error ? (
          <StatusBanner variant="error" title="Deployments fetch failed">
            <p>{error}</p>
            <p>
              <strong>Backend URL:</strong> {backendUrl}
            </p>
          </StatusBanner>
        ) : null}
      </CardContent>
    </Card>
  );
}
