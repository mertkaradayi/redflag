'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  copyToClipboard,
  formatAddress,
  formatTimestamp,
  getDeploymentAgeColor,
  getSuiExplorerUrl,
  type Deployment,
} from '@/lib/deployments';

interface DeploymentCardProps {
  deployment: Deployment;
}

const AGE_STYLES: Record<
  ReturnType<typeof getDeploymentAgeColor>,
  { border: string; dot: string; label: string; bg: string }
> = {
  lastHour: {
    border: 'border-[#D12226]/60',
    dot: 'bg-[#D12226]',
    label: 'Last hour',
    bg: 'bg-gradient-to-br from-[#D12226]/15 via-black/40 to-black/60',
  },
  last24h: {
    border: 'border-white/40',
    dot: 'bg-white',
    label: 'Last 24 hours',
    bg: 'bg-gradient-to-br from-white/10 via-black/40 to-black/60',
  },
  lastWeek: {
    border: 'border-yellow-300/60',
    dot: 'bg-yellow-300',
    label: 'This week',
    bg: 'bg-gradient-to-br from-yellow-200/10 via-black/40 to-black/60',
  },
  older: {
    border: 'border-zinc-700/60',
    dot: 'bg-zinc-600',
    label: 'Older',
    bg: 'bg-black/40',
  },
};

export default function DeploymentCard({ deployment }: DeploymentCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showFullAddress, setShowFullAddress] = useState(false);

  const suiExplorerUrl = useMemo(() => getSuiExplorerUrl(deployment.tx_digest), [deployment.tx_digest]);
  const ageBucket = useMemo(() => getDeploymentAgeColor(deployment.timestamp), [deployment.timestamp]);
  const ageStyle = AGE_STYLES[ageBucket];
  const { relative, absolute } = useMemo(() => formatTimestamp(deployment.timestamp), [deployment.timestamp]);

  const handleCopy = async (value: string, field: string) => {
    const success = await copyToClipboard(value);
    if (!success) return;
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleAddressView = () => {
    setShowFullAddress((prev) => !prev);
  };

  return (
    <Card className={cn('relative overflow-hidden rounded-3xl border bg-black/30 p-0 shadow-lg backdrop-blur', ageStyle.border)}>
      <div className="absolute inset-0 opacity-80" />
      <CardContent className={cn('relative space-y-4 p-6', ageStyle.bg)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Checkpoint {deployment.checkpoint.toLocaleString()}
            </div>
            <div className="text-sm text-zinc-400" title={absolute}>
              {relative}
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-zinc-300">
            <span className={cn('h-2.5 w-2.5 rounded-full', ageStyle.dot)} />
            {ageStyle.label}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FieldBlock
            label="Package ID"
            value={deployment.package_id}
            onCopy={() => handleCopy(deployment.package_id, 'package')}
            copied={copiedField === 'package'}
          />
          <FieldBlock
            label="Transaction"
            value={formatAddress(deployment.tx_digest)}
            fullValue={deployment.tx_digest}
            onCopy={() => handleCopy(deployment.tx_digest, 'tx')}
            copied={copiedField === 'tx'}
            trailingButton={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full border border-white/10 text-white/70 hover:border-white hover:text-white"
                onClick={() => window.open(suiExplorerUrl, '_blank', 'noopener,noreferrer')}
                aria-label="View on Sui Explorer"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            }
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FieldBlock
            label="Deployer"
            value={showFullAddress ? deployment.deployer_address : formatAddress(deployment.deployer_address)}
            fullValue={deployment.deployer_address}
            onCopy={() => handleCopy(deployment.deployer_address, 'deployer')}
            copied={copiedField === 'deployer'}
            onToggle={toggleAddressView}
            toggleHint={showFullAddress ? 'Click to truncate address' : 'Click to view full address'}
          />
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-zinc-400 sm:flex-row sm:items-center">
            <span>First detected</span>
            <span className="text-white/80">{new Date(deployment.first_seen_at).toLocaleString()}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-zinc-300">
          <div className="flex items-center gap-2 text-sm text-white/80">
            <Sparkles className="h-4 w-4 text-[#D12226]" />
            Launch a security review in RedFlag
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-[#D12226]/40 text-[#D12226] hover:bg-[#D12226]/10"
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
            Analyze contract
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
  trailingButton?: React.ReactNode;
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
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <code
          className={cn(
            'min-w-0 flex-1 truncate rounded-2xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm text-white/90',
            onToggle && 'cursor-pointer transition hover:border-white/20 hover:bg-black/30',
          )}
          onClick={onToggle}
          title={toggleHint || fullValue}
        >
          {value}
        </code>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full border border-white/10 text-white/70 hover:border-white hover:text-white"
          onClick={onCopy}
          aria-label={`Copy ${label.toLowerCase()}`}
        >
          {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
        </Button>
        {trailingButton}
      </div>
    </div>
  );
}
