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
  queryStrategy?: string | null;
}

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
const DEFAULT_POLL_INTERVAL = 3000;

export default function SuiDeploymentsCheck() {
  const [deploymentsData, setDeploymentsData] = useState<SuiDeploymentsResponse | null>(null);
  const [sessionDeployments, setSessionDeployments] = useState<ContractDeployment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [resolvedPollInterval, setResolvedPollInterval] = useState(DEFAULT_POLL_INTERVAL);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckpointRef = useRef<number | null>(null);
  const seenPackageIdsRef = useRef<Set<string>>(new Set());
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
          lastCheckpointRef.current = Math.max(lastCheckpointRef.current ?? 0, data.latestCheckpoint);
        }

        setDeploymentsData(data);

        if (data.deployments && data.deployments.length > 0) {
          const newDeployments: ContractDeployment[] = [];

          for (const deployment of data.deployments) {
            if (!seenPackageIdsRef.current.has(deployment.packageId)) {
              seenPackageIdsRef.current.add(deployment.packageId);
              newDeployments.push(deployment);
            }
          }

          if (newDeployments.length > 0) {
            setSessionDeployments((prev) => [...newDeployments, ...prev]);
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
    []
  );

  const startPolling = useCallback(() => {
    setSessionDeployments([]);
    seenPackageIdsRef.current = new Set();
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
        <CardDescription>Monitor smart contract publishes on the Sui testnet.</CardDescription>
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
              🔍 Monitoring every {pollIntervalString} second{pollIntervalSuffix} — detected {sessionDeployments.length} new
              package{sessionDeployments.length === 1 ? '' : 's'} this session.
            </p>
          )}
        </div>

        {error ? (
          <StatusBanner variant="error" title="Deployments fetch failed">
            <p>{error}</p>
            <p>
              <strong>Backend URL:</strong> {backendUrl}
            </p>
          </StatusBanner>
        ) : null}

        {deploymentsData ? (
          <StatusBanner
            variant={deploymentsData.success ? 'success' : 'error'}
            title={
              deploymentsData.success
                ? `Latest check: ${deploymentsData.totalDeployments} deployment${deploymentsData.totalDeployments === 1 ? '' : 's'} returned`
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
            {deploymentsData.queryStrategy && (
              <p>
                <strong>Query strategy:</strong> {deploymentsData.queryStrategy}
              </p>
            )}
            {sessionDeployments.length === 0 && deploymentsData.success && deploymentsData.deployments.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">Most recent deployments from RPC:</p>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {deploymentsData.deployments.map((deployment, index) => (
                    <div
                      key={`${deployment.packageId}-${deployment.txDigest}-${index}`}
                      className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700 text-sm"
                    >
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
                          <strong className="text-zinc-900 dark:text-zinc-100">Published:</strong> {formatTimestamp(deployment.timestamp)}
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

        {sessionDeployments.length > 0 && (
          <div className="space-y-2 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900/40">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
              Detected this session ({sessionDeployments.length})
            </p>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {sessionDeployments.map((deployment) => (
                <div
                  key={`${deployment.packageId}-${deployment.txDigest}`}
                  className="space-y-2 rounded border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <div>
                    <strong className="text-zinc-900 dark:text-zinc-100">Package ID:</strong>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="break-all rounded bg-zinc-200 px-2 py-1 font-mono text-xs text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200">
                        {deployment.packageId}
                      </code>
                      <button
                        onClick={() => copyToClipboard(deployment.packageId)}
                        className="text-cyan-600 underline hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
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
                    <strong className="text-zinc-900 dark:text-zinc-100">Published:</strong> {formatTimestamp(deployment.timestamp)}
                  </p>
                  <p className="text-zinc-700 dark:text-zinc-300">
                    <strong className="text-zinc-900 dark:text-zinc-100">Checkpoint:</strong> {deployment.checkpoint}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
