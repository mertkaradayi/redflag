'use client';

import { useState } from 'react';
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

interface LatestDeploymentResponse {
  success: boolean;
  message: string;
  timestamp: string;
  connectionInfo: {
    url: string;
    hasRpcUrl: boolean;
  };
  deployment: ContractDeployment | null;
  latestCheckpoint?: number | null;
  nextCursor?: string | null;
  pollIntervalMs?: number;
  queryStrategy?: string | null;
}

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function LatestDeploymentFetcher() {
  const [data, setData] = useState<LatestDeploymentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${backendUrl}/api/sui/latest-deployment`);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const result: LatestDeploymentResponse = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch latest deployment');
    } finally {
      setLoading(false);
    }
  };

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

  const deployment = data?.deployment ?? null;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Latest Deployment</CardTitle>
        <CardDescription>Fetch the most recent package published to Sui testnet.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleFetch}
          disabled={loading}
          className="w-full bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Fetching…
            </span>
          ) : (
            'Get Latest Deployment'
          )}
        </Button>

        {error ? (
          <StatusBanner variant="error" title="Failed to fetch latest deployment">
            <p>{error}</p>
            <p>
              <strong>Backend URL:</strong> {backendUrl}
            </p>
          </StatusBanner>
        ) : null}

        {data ? (
          <StatusBanner
            variant={data.success ? 'success' : 'error'}
            title={data.success ? data.message : 'Failed to fetch latest deployment'}
          >
            <p>
              <strong>Status:</strong> {data.success ? 'Success' : 'Failed'}
            </p>
            <p>
              <strong>Timestamp:</strong> {new Date(data.timestamp).toLocaleString()}
            </p>
            {typeof data.latestCheckpoint === 'number' && (
              <p>
                <strong>Latest checkpoint inspected:</strong> {data.latestCheckpoint}
              </p>
            )}
            {data.queryStrategy && (
              <p>
                <strong>Query strategy:</strong> {data.queryStrategy}
              </p>
            )}

            {deployment ? (
              <div className="mt-4 space-y-2">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">Deployment Details</p>
                <div className="space-y-2 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800">
                  <div>
                    <strong className="text-zinc-900 dark:text-zinc-100">Package ID:</strong>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="break-all rounded bg-zinc-200 px-2 py-1 font-mono text-xs text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200">
                        {deployment.packageId}
                      </code>
                      <button
                        onClick={() => copyToClipboard(deployment.packageId)}
                        className="text-emerald-600 underline hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
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
            ) : (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                No deployments have been published yet.
              </p>
            )}
          </StatusBanner>
        ) : null}
      </CardContent>
    </Card>
  );
}
