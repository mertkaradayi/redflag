'use client';

import Link from 'next/link';
import { Package, Clock, Users, AlertCircle, AlertTriangle, ExternalLink } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSuiPackageExplorerUrl, formatAddress, formatTimestamp } from '@/lib/deployments';
import type { Deployment } from '@/lib/deployments';
import { cn } from '@/lib/utils';

interface UnanalyzedPackageCardProps {
  packageId: string;
  deployment: Deployment | null;
  status: 'not_analyzed' | 'not_found' | 'analysis_failed';
  network: 'mainnet' | 'testnet';
}

export function UnanalyzedPackageCard({ packageId, deployment, status, network }: UnanalyzedPackageCardProps) {
  const explorerUrl = getSuiPackageExplorerUrl(packageId, network);
  const { relative, absolute } = deployment?.timestamp
    ? formatTimestamp(deployment.timestamp)
    : { relative: 'Unknown', absolute: 'Unknown' };

  const statusConfig = {
    not_analyzed: {
      title: 'Not Analyzed',
      description: 'This package has been deployed but has not been analyzed yet.',
      icon: AlertCircle,
      badge: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
      buttonText: 'Analyze Now',
      buttonVariant: 'default' as const,
    },
    analysis_failed: {
      title: 'Analysis Failed',
      description: 'Our last attempt to analyze this package did not complete successfully. Try again to rerun the safety review.',
      icon: AlertTriangle,
      badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
      buttonText: 'Retry Analysis',
      buttonVariant: 'default' as const,
    },
    not_found: {
      title: 'Package Not Found',
      description: 'This package ID was not found in our deployment records.',
      icon: AlertCircle,
      badge: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20',
      buttonText: 'Try Analyzing',
      buttonVariant: 'outline' as const,
    },
  };

  const config = statusConfig[status];

  return (
    <Card className="rounded-xl border border-border/60 dark:border-white/10 bg-card/50 dark:bg-white/5 shadow-sm shadow-black/5 dark:shadow-white/5 transition-colors duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-foreground dark:text-white mb-2">
              Package Status
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {config.description}
            </CardDescription>
          </div>
          <div className={cn('rounded-full border px-3 py-1 text-xs font-semibold flex items-center gap-1.5', config.badge)}>
            <config.icon className="h-3 w-3" />
            {config.title}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Package ID */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-500">
            Package ID
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-black/40 h-10 px-3">
            <Package className="h-4 w-4 text-zinc-600 dark:text-white/70 shrink-0" />
            <span className="min-w-0 flex-1 truncate font-mono text-sm text-zinc-900 dark:text-white/90">
              {formatAddress(packageId)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => window.open(explorerUrl, '_blank', 'noopener,noreferrer')}
              aria-label="View package on Sui Explorer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Deployment Info */}
        {deployment && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-500">
                Deployer
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-black/40 h-10 px-3">
                <Users className="h-4 w-4 text-zinc-600 dark:text-white/70 shrink-0" />
                <span className="min-w-0 flex-1 truncate font-mono text-sm text-zinc-900 dark:text-white/90">
                  {formatAddress(deployment.deployer_address)}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-500">
                Deployed
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-black/40 h-10 px-3">
                <Clock className="h-4 w-4 text-zinc-600 dark:text-white/70 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-900 dark:text-white/90" title={absolute}>
                  {relative}
                </span>
              </div>
            </div>
          </div>
        )}

        {status === 'analysis_failed' && (
          <p className="text-xs text-red-600 dark:text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
            The last automated review failed. Retry the analysis to generate a fresh report.
          </p>
        )}

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <Link href={`/analyze?packageId=${packageId}&network=${network}`}>
            <Button variant={config.buttonVariant} className="gap-2">
              {config.buttonText}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
