'use client';

import { cloneElement, isValidElement, useMemo, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { Check, Copy, ExternalLink, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  copyToClipboard,
  formatAddress,
  formatTimestamp,
  getDeploymentAgeColor,
  getSuiAddressExplorerUrl,
  getSuiExplorerUrl,
  getSuiPackageExplorerUrl,
  type Deployment,
} from '@/lib/deployments';

interface DeploymentCardProps {
  deployment: Deployment;
  network?: 'mainnet' | 'testnet';
}

const AGE_STYLES: Record<
  ReturnType<typeof getDeploymentAgeColor>,
  { border: string; dot: string; bg: string }
> = {
  lastHour: {
    border: 'border-zinc-200/50 dark:border-zinc-800/50',
    dot: 'bg-[#D12226] dark:bg-[#D12226]',
    bg: 'bg-white/80 backdrop-blur-xl supports-backdrop-filter:bg-white/80 dark:bg-zinc-950/80 dark:supports-backdrop-filter:bg-zinc-950/80',
  },
  last24h: {
    border: 'border-zinc-200/50 dark:border-zinc-800/50',
    dot: 'bg-zinc-500 dark:bg-white',
    bg: 'bg-white/80 backdrop-blur-xl supports-backdrop-filter:bg-white/80 dark:bg-zinc-950/80 dark:supports-backdrop-filter:bg-zinc-950/80',
  },
  lastWeek: {
    border: 'border-zinc-200/50 dark:border-zinc-800/50',
    dot: 'bg-amber-500 dark:bg-yellow-300',
    bg: 'bg-white/80 backdrop-blur-xl supports-backdrop-filter:bg-white/80 dark:bg-zinc-950/80 dark:supports-backdrop-filter:bg-zinc-950/80',
  },
  older: {
    border: 'border-zinc-200/50 dark:border-zinc-800/50',
    dot: 'bg-zinc-500 dark:bg-zinc-600',
    bg: 'bg-white/80 backdrop-blur-xl supports-backdrop-filter:bg-white/80 dark:bg-zinc-950/80 dark:supports-backdrop-filter:bg-zinc-950/80',
  },
};

export default function DeploymentCard({ deployment, network }: DeploymentCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [showFullPackageId, setShowFullPackageId] = useState(false);
  const [showFullTxDigest, setShowFullTxDigest] = useState(false);
  const { showToast } = useToast();

  const suiExplorerUrl = useMemo(() => getSuiExplorerUrl(deployment.tx_digest), [deployment.tx_digest]);
  const packageExplorerUrl = useMemo(() => getSuiPackageExplorerUrl(deployment.package_id), [deployment.package_id]);
  const deployerExplorerUrl = useMemo(() => getSuiAddressExplorerUrl(deployment.deployer_address), [deployment.deployer_address]);
  const ageBucket = useMemo(() => getDeploymentAgeColor(deployment.timestamp), [deployment.timestamp]);
  const ageStyle = AGE_STYLES[ageBucket];
  const { relative, absolute } = useMemo(() => formatTimestamp(deployment.timestamp), [deployment.timestamp]);
  const firstSeenAt = useMemo(() => {
    const timestamp = new Date(deployment.timestamp).getTime();
    const firstSeen = new Date(deployment.first_seen_at).getTime();
    // Only show if different by more than 1 minute (to account for minor timing differences)
    return Math.abs(timestamp - firstSeen) > 60000 ? deployment.first_seen_at : null;
  }, [deployment.timestamp, deployment.first_seen_at]);

  const handleCopy = async (value: string, field: string, label: string) => {
    const success = await copyToClipboard(value);
    if (!success) return;
    setCopiedField(field);
    showToast(`${label} copied to clipboard`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleAddressView = () => {
    setShowFullAddress((prev) => !prev);
  };

  const togglePackageIdView = () => {
    setShowFullPackageId((prev) => !prev);
  };

  const toggleTxDigestView = () => {
    setShowFullTxDigest((prev) => !prev);
  };

  return (
    <Card className={cn('text-card-foreground relative overflow-hidden rounded-3xl border bg-transparent p-0 shadow-sm dark:shadow-lg', ageStyle.border)}>
      <CardContent className={cn('relative space-y-3 p-4 sm:space-y-4 sm:p-6', ageStyle.bg)}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="space-y-1">
            <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-500">
              Checkpoint {deployment.checkpoint.toLocaleString()}
            </div>
            {network && (
              <div className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-500">
                {network}
              </div>
            )}
          </div>
          <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-zinc-50 dark:bg-black/40 px-2.5 py-1 sm:px-3 text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-300 whitespace-nowrap" title={absolute}>
            <span className={cn('h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full shrink-0', ageStyle.dot)} />
            <span>{relative}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FieldBlock
            label="Package ID"
            value={showFullPackageId ? deployment.package_id : formatAddress(deployment.package_id)}
            fullValue={deployment.package_id}
            onCopy={() => handleCopy(deployment.package_id, 'package', 'Package ID')}
            copied={copiedField === 'package'}
            onToggle={togglePackageIdView}
            toggleHint={showFullPackageId ? 'Click to truncate address' : 'Click to view full address'}
            trailingButton={
              <Button
                variant="ghost"
                size="icon"
                className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-accent h-7 w-7 rounded-md text-zinc-600 dark:text-white/70 hover:text-zinc-900 dark:hover:text-white shrink-0"
                onClick={() => window.open(packageExplorerUrl, '_blank', 'noopener,noreferrer')}
                aria-label="View package on Sui Explorer"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </Button>
            }
          />
          <FieldBlock
            label="Transaction"
            value={showFullTxDigest ? deployment.tx_digest : formatAddress(deployment.tx_digest)}
            fullValue={deployment.tx_digest}
            onCopy={() => handleCopy(deployment.tx_digest, 'tx', 'Transaction')}
            copied={copiedField === 'tx'}
            onToggle={toggleTxDigestView}
            toggleHint={showFullTxDigest ? 'Click to truncate address' : 'Click to view full address'}
            trailingButton={
              <Button
                variant="ghost"
                size="icon"
                className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-accent h-7 w-7 rounded-md text-zinc-600 dark:text-white/70 hover:text-zinc-900 dark:hover:text-white shrink-0"
                onClick={() => window.open(suiExplorerUrl, '_blank', 'noopener,noreferrer')}
                aria-label="View transaction on Sui Explorer"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </Button>
            }
          />
          <FieldBlock
            label="Deployer"
            value={showFullAddress ? deployment.deployer_address : formatAddress(deployment.deployer_address)}
            fullValue={deployment.deployer_address}
            onCopy={() => handleCopy(deployment.deployer_address, 'deployer', 'Deployer address')}
            copied={copiedField === 'deployer'}
            onToggle={toggleAddressView}
            toggleHint={showFullAddress ? 'Click to truncate address' : 'Click to view full address'}
            trailingButton={
              <Button
                variant="ghost"
                size="icon"
                className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-accent h-7 w-7 rounded-md text-zinc-600 dark:text-white/70 hover:text-zinc-900 dark:hover:text-white shrink-0"
                onClick={() => window.open(deployerExplorerUrl, '_blank', 'noopener,noreferrer')}
                aria-label="View deployer address on Sui Explorer"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </Button>
            }
          />
          {firstSeenAt ? (
            <StaticField
              label="Detected by RedFlag"
              value={new Date(firstSeenAt).toLocaleString()}
            />
          ) : (
            <StaticField
              label="Deployment time"
              value={absolute}
            />
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 rounded-2xl bg-zinc-50 dark:bg-black/40 px-3 py-2.5 sm:px-4 sm:py-3 text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-300">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-zinc-900 dark:text-white/80">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#D12226] shrink-0" />
            <span className="whitespace-nowrap">Launch a security review in RedFlag</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto inline-flex items-center justify-center whitespace-nowrap text-xs sm:text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border bg-background hover:text-accent-foreground h-8 sm:h-9 px-3 rounded-full border-[#D12226]/40 text-[#D12226] hover:bg-[#D12226]/10"
            onClick={() => {
              const analysisSection = document.querySelector('[data-llm-analysis]');
              if (analysisSection) {
                analysisSection.scrollIntoView({ behavior: 'smooth' });
              }
              const packageInput = document.querySelector('input[placeholder="0x..."]') as HTMLInputElement | null;
              if (packageInput) {
                packageInput.value = deployment.package_id;
                packageInput.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }}
          >
            Analyze this package
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface FieldBlockProps {
  label: string;
  value: string;
  fullValue?: string;
  copied: boolean;
  onCopy: () => void;
  trailingButton?: ReactNode;
  onToggle?: () => void;
  toggleHint?: string;
}

function FieldBlock({
  label,
  value,
  fullValue,
  copied,
  onCopy,
  trailingButton,
  onToggle,
  toggleHint,
}: FieldBlockProps) {
  const handleContainerClick = () => {
    if (onToggle) {
      onToggle();
    }
  };

  const handleCopyClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onCopy();
  };

  const renderedTrailingButton = isValidElement(trailingButton)
    ? cloneElement(trailingButton as React.ReactElement<{ className?: string; onClick?: (event: MouseEvent<HTMLElement>) => void }>, {
        className: cn('shrink-0', (trailingButton as React.ReactElement<{ className?: string }>).props.className),
        onClick: (event: MouseEvent<HTMLElement>) => {
          event.stopPropagation();
          (trailingButton as React.ReactElement<{ onClick?: (event: MouseEvent<HTMLElement>) => void }>).props.onClick?.(event);
        },
      })
    : trailingButton;

  return (
    <div className="min-w-0 space-y-1.5 sm:space-y-2">
      <label className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-500">
        {label}
      </label>
      <div
        className={cn(
          'flex min-w-0 items-center gap-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-black/40 h-11 sm:h-10 px-3 transition',
          onToggle && 'cursor-pointer hover:border-zinc-300 dark:hover:border-white/20 hover:bg-zinc-100 dark:hover:bg-black/30'
        )}
        onClick={onToggle ? handleContainerClick : undefined}
        title={toggleHint || fullValue || value}
      >
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-zinc-900 dark:text-white/90">
          {value}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-zinc-100 dark:hover:bg-accent h-7 w-7 rounded-md text-zinc-600 dark:text-white/70 hover:text-zinc-900 dark:hover:text-white shrink-0"
            onClick={handleCopyClick}
            aria-label={`Copy ${label.toLowerCase()}`}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          {renderedTrailingButton ? <div className="shrink-0">{renderedTrailingButton}</div> : null}
        </div>
      </div>
    </div>
  );
}

interface StaticFieldProps {
  label: string;
  value: string;
}

function StaticField({ label, value }: StaticFieldProps) {
  return (
    <div className="min-w-0 space-y-1.5 sm:space-y-2">
      <label className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-500">
        {label}
      </label>
      <div className="flex min-w-0 items-center gap-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-white/60 dark:bg-black/40 h-11 sm:h-10 px-3">
        <span className="min-w-0 flex-1 truncate text-sm text-zinc-900 dark:text-white/80" title={value}>
          {value}
        </span>
      </div>
    </div>
  );
}
