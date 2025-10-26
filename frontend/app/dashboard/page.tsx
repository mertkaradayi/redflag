'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, PauseCircle, PlayCircle, RefreshCcw } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AnalyzedContractCard from '@/app/components/AnalyzedContractCard';
import type { AnalyzedContract, DashboardData } from '@/app/dashboard/types';
import { getRiskLevelBadge, getRiskLevelEmphasis, getRiskLevelIcon } from '@/app/dashboard/risk-utils';
import { cn } from '@/lib/utils';

const AUTO_REFRESH_SECONDS = 30;
const RISK_FILTERS: Array<'all' | 'critical' | 'high' | 'moderate' | 'low'> = ['all', 'critical', 'high', 'moderate', 'low'];

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'moderate' | 'low'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState(AUTO_REFRESH_SECONDS);
  const [pauseReason, setPauseReason] = useState<'toolbar' | 'details' | null>(null);

  const fetchAnalyzedContracts = useCallback(async ({ silent }: { silent?: boolean } = {}) => {
    try {
      if (!silent) {
        setIsRefreshing(true);
      }
      setError(null);

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/llm/analyzed-contracts`, {
        cache: 'no-store',
      });
      const result: DashboardData = await response.json();

      if (result.success) {
        setData(result);
        setLastUpdated(new Date());
        setRefreshCountdown(AUTO_REFRESH_SECONDS);
      } else {
        throw new Error(result.message || 'Failed to fetch analyzed contracts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
      if (!silent) {
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchAnalyzedContracts();
  }, [fetchAnalyzedContracts]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <div className="container mx-auto px-6 py-16">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#D12226] border-t-transparent"></div>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">Loading analyzed contracts...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-950">
      <div className="container mx-auto px-6 py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  🏠 Home
                </Button>
              </Link>
              <div className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                Live Security Insights
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                Contract Analysis Dashboard
              </h1>
              <p className="mt-2 max-w-2xl text-base text-zinc-600 dark:text-zinc-300">
                Monitor Sui smart contract risks, drill into vulnerable functions, and keep track of how findings evolve over time.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 text-left lg:items-end lg:text-right">
            <div className="flex gap-2">
              <Button
                onClick={() => fetchAnalyzedContracts()}
                variant="outline"
                size="sm"
                disabled={isRefreshing}
                className="flex items-center gap-2 border-[#D12226]/40 text-[#D12226] hover:bg-[#D12226]/10"
              >
                <RefreshCcw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                Refresh
              </Button>
              <Button
                onClick={toggleAutoRefresh}
                variant={autoRefresh ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'flex items-center gap-2',
                  autoRefresh
                    ? 'bg-[#D12226] text-white hover:bg-[#a8181b]'
                    : 'border-[#D12226]/40 text-[#D12226] hover:bg-[#D12226]/10',
                )}
              >
                {autoRefresh ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                {autoRefresh ? 'Pause Auto Refresh' : 'Resume Auto Refresh'}
              </Button>
              <Link href="/analyze">
                <Button className="bg-[#D12226] text-white hover:bg-[#a8181b]">
                  ➕ Analyze New Contract
                </Button>
              </Link>
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {formattedLastUpdated ? `Last updated ${formattedLastUpdated}` : 'Waiting for first update'}
              {autoRefresh
                ? ` • Refreshing in ${refreshCountdown}s`
                : pauseReason === 'details'
                  ? ' • Auto refresh paused while you review contract details'
                  : ' • Auto refresh paused'}
            </div>
          </div>
        </div>

        {error && (
          <Alert className="mt-8 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
            <AlertDescription className="text-red-800 dark:text-red-200">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {riskStats && (
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Card className="border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <CardContent className="flex flex-col gap-3 p-6">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <Activity className="h-4 w-4" />
                  Total Analyzed
                </div>
                <div className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {riskStats.total}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {data?.contracts.length ?? 0} recent runs stored
                </p>
              </CardContent>
            </Card>
            {(['critical', 'high', 'moderate', 'low'] as const).map((level) => (
              <Card
                key={level}
                className="border border-zinc-200 bg-white shadow-sm transition hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
              >
                <CardContent className="flex flex-col gap-3 p-6">
                  <div
                    className={cn(
                      'inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                      getRiskLevelBadge(level),
                    )}
                  >
                    {getRiskLevelIcon(level)} {level}
                  </div>
                  <div className={cn('text-3xl font-semibold capitalize', getRiskLevelEmphasis(level))}>
                    {riskStats.counts[level]}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Contracts flagged as {level}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-10 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {RISK_FILTERS.map((level) => (
                <Button
                  key={level}
                  variant={filter === level ? 'default' : 'outline'}
                  onClick={() => setFilter(level)}
                  className={cn(
                    filter === level
                      ? 'bg-[#D12226] text-white hover:bg-[#a8181b]'
                      : 'border-[#D12226]/40 text-[#D12226] hover:bg-[#D12226]/10',
                    'px-4 py-2 capitalize',
                  )}
                >
                  {level === 'all' ? 'All' : level}
                  {level !== 'all' && riskStats && (
                    <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium dark:bg-black/60">
                      {riskStats.counts[level]}
                    </span>
                  )}
                </Button>
              ))}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              Showing {filteredContracts.length} of {data?.contracts.length ?? 0} stored analyses
            </div>
          </div>
        </div>

        {pauseReason === 'details' && !autoRefresh && (
          <Alert className="mt-6 border-[#D12226]/40 bg-[#D12226]/10 dark:border-[#D12226]/60 dark:bg-[#D12226]/15">
            <AlertDescription className="text-[#D12226] dark:text-white">
              Auto refresh is paused so the results stay put while you explore a contract. Resume it from the toolbar when you&apos;re ready for new data.
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-8 space-y-5">
          {isEmptyState ? (
            <Card className="border border-dashed border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
                <div className="text-5xl">📊</div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {filter === 'all' ? 'No analyzed contracts yet' : `No ${filter} risk contracts yet`}
                </h3>
                <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-300">
                  Run an analysis to populate your dashboard, or switch filters to review previous findings.
                </p>
                <Link href="/analyze">
                  <Button className="bg-[#D12226] text-white hover:bg-[#a8181b]">
                    Analyze a Contract
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            filteredContracts.map((contract) => (
              <AnalyzedContractCard
                key={`${contract.package_id}-${contract.network}-${contract.analyzed_at}`}
                contract={contract}
                onAutoRefreshPause={pauseAutoRefreshFromDetails}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
