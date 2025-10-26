'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, PauseCircle, PlayCircle, RefreshCcw } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/app/components/BrandLogo';
import AnalyzedContractCard from '@/app/components/AnalyzedContractCard';
import type { AnalyzedContract, DashboardData } from '@/app/dashboard/types';
import { getRiskLevelIcon, getRiskLevelName } from '@/app/dashboard/risk-utils';
import { cn } from '@/lib/utils';

const AUTO_REFRESH_SECONDS = 30;
const RISK_FILTERS: Array<'all' | 'critical' | 'high' | 'moderate' | 'low'> = ['all', 'critical', 'high', 'moderate', 'low'];
const RISK_LEVEL_STYLES: Record<
  'critical' | 'high' | 'moderate' | 'low',
  {
    chip: string;
    value: string;
    buttonActive: string;
    buttonInactive: string;
    badge: string;
  }
> = {
  critical: {
    chip: 'border-[#D12226]/60 bg-[#D12226]/15 text-[#ff8a8c]',
    value: 'text-[#ff6b6e]',
    buttonActive: 'bg-[#D12226] text-white hover:bg-[#a8181b]',
    buttonInactive: 'border-[#D12226]/50 text-[#ff8a8c] hover:bg-[#D12226]/15 hover:text-white',
    badge: 'bg-[#D12226]/25 text-[#ffbdbf]',
  },
  high: {
    chip: 'border-orange-500/50 bg-orange-500/12 text-orange-200',
    value: 'text-orange-200',
    buttonActive: 'bg-orange-500 text-black hover:bg-orange-400',
    buttonInactive: 'border-orange-400/60 text-orange-200 hover:bg-orange-500/20 hover:text-white',
    badge: 'bg-orange-500/25 text-orange-100',
  },
  moderate: {
    chip: 'border-yellow-400/50 bg-yellow-400/12 text-yellow-200',
    value: 'text-yellow-200',
    buttonActive: 'bg-yellow-400 text-black hover:bg-yellow-300',
    buttonInactive: 'border-yellow-300/60 text-yellow-200 hover:bg-yellow-400/20 hover:text-black',
    badge: 'bg-yellow-400/20 text-yellow-100',
  },
  low: {
    chip: 'border-emerald-500/50 bg-emerald-500/12 text-emerald-200',
    value: 'text-emerald-200',
    buttonActive: 'bg-emerald-400 text-black hover:bg-emerald-300',
    buttonInactive: 'border-emerald-400/60 text-emerald-200 hover:bg-emerald-400/20 hover:text-black',
    badge: 'bg-emerald-400/20 text-emerald-100',
  },
};

const FILTER_META = {
  all: {
    label: 'All Findings',
    icon: '🧾',
    active: 'bg-white text-black hover:bg-white/90 shadow-lg shadow-white/20',
    inactive: 'border-white/30 text-white hover:bg-white/10',
    badge: 'bg-white/20 text-white',
  },
};

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
      <div className="relative min-h-screen overflow-hidden bg-black text-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-x-0 top-[-12%] h-[520px] bg-[radial-gradient(circle_at_center,rgba(209,34,38,0.28),transparent_60%)]" />
          <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(209,34,38,0.18),transparent_60%)] blur-3xl" />
        </div>
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-[#D12226] border-t-transparent"></div>
            <p className="text-sm text-zinc-300">Loading analyzed contracts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-[-12%] h-[520px] bg-[radial-gradient(circle_at_center,rgba(209,34,38,0.28),transparent_60%)]" />
        <div className="absolute left-1/2 top-[45%] h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(209,34,38,0.18),transparent_60%)] blur-3xl" />
      </div>
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-24 pt-12 sm:px-12 lg:px-16">
        <header className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <BrandLogo className="h-9" priority wrapperClassName="flex-shrink-0" />
              <span className="hidden text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400 sm:inline">
                Security Dashboard
              </span>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                View live risk intelligence across your Sui contracts.
              </h1>
              <p className="max-w-2xl text-base text-zinc-300">
                Track every analyzed package, filter by severity, and pause auto-refresh when you need to dig deep into
                a contract&apos;s red flags.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              <span className="rounded-full border border-white/15 px-3 py-1">Live Gemini Insights</span>
              <span className="rounded-full border border-white/15 px-3 py-1">Supabase Sync</span>
              <span className="rounded-full border border-white/15 px-3 py-1">Move Pattern Library</span>
            </div>
          </div>
          <div className="flex w-full max-w-sm flex-col items-stretch gap-3 rounded-3xl border border-white/10 bg-black/40 p-6 shadow-inner">
            <div className="flex flex-wrap gap-2">
              <Link href="/">
                <Button variant="outline" size="sm" className="border-white/20 text-white hover:border-white hover:bg-white/10">
                  🏠 Home
                </Button>
              </Link>
              <Link href="/analyze">
                <Button size="sm" className="bg-[#D12226] text-white hover:bg-[#a8181b]">
                  ➕ Analyze Contract
                </Button>
              </Link>
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
            </div>
            <div className="text-xs text-zinc-400">
              {formattedLastUpdated ? `Last updated ${formattedLastUpdated}` : 'Waiting for first update'}
              {autoRefresh
                ? ` • Refreshing in ${refreshCountdown}s`
                : pauseReason === 'details'
                  ? ' • Auto refresh paused while you review contract details'
                  : ' • Auto refresh paused'}
            </div>
          </div>
        </header>

        {error && (
          <Alert className="border-[#D12226]/60 bg-[#D12226]/15 text-white">
            <AlertDescription className="text-white">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {riskStats && (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                <Activity className="h-4 w-4 text-[#D12226]" />
                Total analyzed
              </div>
              <div className="mt-3 text-4xl font-semibold text-white">
                {riskStats.total}
              </div>
              <p className="mt-3 text-xs text-zinc-400">
                {data?.contracts.length ?? 0} recent runs stored
              </p>
            </div>
            {(['critical', 'high', 'moderate', 'low'] as const).map((level) => (
              <div
                key={level}
                className="rounded-2xl border border-white/10 bg-black/40 p-6 shadow-lg backdrop-blur transition hover:border-white/20"
              >
                <span
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]',
                    RISK_LEVEL_STYLES[level].chip,
                  )}
                >
                  {getRiskLevelIcon(level)} {getRiskLevelName(level)}
                </span>
                <div className={cn('mt-4 text-4xl font-semibold', RISK_LEVEL_STYLES[level].value)}>
                  {riskStats.counts[level]}
                </div>
                <p className="mt-2 text-xs text-zinc-400">Contracts flagged as {getRiskLevelName(level)}</p>
              </div>
            ))}
          </section>
        )}

        <section className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {RISK_FILTERS.map((level) => {
                const isActive = filter === level;
                const isAll = level === 'all';
                const style = !isAll ? RISK_LEVEL_STYLES[level] : null;
                const buttonClass = isAll
                  ? isActive
                    ? FILTER_META.all.active
                    : FILTER_META.all.inactive
                  : isActive
                    ? style!.buttonActive
                    : style!.buttonInactive;
                const icon = isAll ? FILTER_META.all.icon : getRiskLevelIcon(level);
                const label = isAll ? FILTER_META.all.label : getRiskLevelName(level);
                const badgeClass = isAll ? FILTER_META.all.badge : style!.badge;
                const count = isAll
                  ? riskStats?.total ?? 0
                  : riskStats?.counts[level] ?? 0;

                return (
                  <Button
                    key={level}
                    variant="outline"
                    onClick={() => setFilter(level)}
                    className={cn('flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold', buttonClass)}
                  >
                    <span className="flex items-center gap-2">
                      <span>{icon}</span>
                      <span>{label}</span>
                    </span>
                    {riskStats && (
                      <span className={cn('ml-2 rounded-full px-2 py-0.5 text-xs font-medium', badgeClass)}>
                        {count}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
            <div className="text-sm text-zinc-400">
              Showing {filteredContracts.length} of {data?.contracts.length ?? 0} stored analyses
            </div>
          </div>
        </section>

        {pauseReason === 'details' && !autoRefresh && (
          <Alert className="border-[#D12226]/60 bg-[#D12226]/15 text-white">
            <AlertDescription className="text-white">
              Auto refresh is paused so the results stay put while you explore a contract. Resume it from the toolbar when you&apos;re ready for new data.
            </AlertDescription>
          </Alert>
        )}

        <section className="space-y-5">
          {isEmptyState ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-black/40 p-12 text-center shadow-inner backdrop-blur">
              <div className="text-5xl">📊</div>
              <h3 className="mt-4 text-xl font-semibold text-white">
                {filter === 'all' ? 'No analyzed contracts yet' : `No ${getRiskLevelName(filter)} contracts yet`}
              </h3>
              <p className="mt-3 max-w-md text-sm text-zinc-400 mx-auto">
                Run an analysis to populate your dashboard, or switch filters to review previous findings.
              </p>
              <div className="mt-6 flex justify-center">
                <Link href="/analyze">
                  <Button className="bg-[#D12226] text-white hover:bg-[#a8181b]">
                    Analyze a Contract
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
    </div>
  );
}
