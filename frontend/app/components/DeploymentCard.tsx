'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  formatAddress, 
  formatTimestamp, 
  getSuiExplorerUrl, 
  copyToClipboard,
  getDeploymentAgeColor,
  type Deployment 
} from '@/lib/deployments';

interface DeploymentCardProps {
  deployment: Deployment;
}

export default function DeploymentCard({ deployment }: DeploymentCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showFullAddress, setShowFullAddress] = useState(false);

  const { relative, absolute } = formatTimestamp(deployment.timestamp);
  const ageColor = getDeploymentAgeColor(deployment.timestamp);
  const suiExplorerUrl = getSuiExplorerUrl(deployment.tx_digest);

  const handleCopy = async (text: string, field: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const toggleAddressView = () => {
    setShowFullAddress(!showFullAddress);
  };

  return (
    <Card className={`border-l-4 ${ageColor} hover:shadow-md transition-shadow duration-200`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with timestamp and checkpoint */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-zinc-500" title={absolute}>
                {relative}
              </span>
              <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                Checkpoint {deployment.checkpoint.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Package ID */}
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Package ID
            </label>
            <div className="flex items-center space-x-2 mt-1">
              <code className="text-sm font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded flex-1 truncate">
                {deployment.package_id}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(deployment.package_id, 'package')}
                className="h-8 w-8 p-0"
              >
                {copiedField === 'package' ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-zinc-400">📋</span>
                )}
              </Button>
            </div>
          </div>

          {/* Deployer Address */}
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Deployer
            </label>
            <div className="flex items-center space-x-2 mt-1">
              <code 
                className="text-sm font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded flex-1 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                onClick={toggleAddressView}
                title={showFullAddress ? 'Click to truncate' : 'Click to expand'}
              >
                {showFullAddress ? deployment.deployer_address : formatAddress(deployment.deployer_address)}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(deployment.deployer_address, 'deployer')}
                className="h-8 w-8 p-0"
              >
                {copiedField === 'deployer' ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-zinc-400">📋</span>
                )}
              </Button>
            </div>
          </div>

          {/* Transaction Digest */}
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Transaction
            </label>
            <div className="flex items-center space-x-2 mt-1">
              <code className="text-sm font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded flex-1 truncate">
                {formatAddress(deployment.tx_digest)}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(deployment.tx_digest, 'tx')}
                className="h-8 w-8 p-0"
              >
                {copiedField === 'tx' ? (
                  <span className="text-green-600">✓</span>
                ) : (
                  <span className="text-zinc-400">📋</span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(suiExplorerUrl, '_blank')}
                className="h-8 w-8 p-0"
                title="View on Sui Explorer"
              >
                <span className="text-blue-600">🔗</span>
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
            <span className="text-xs text-zinc-400">
              First detected: {new Date(deployment.first_seen_at).toLocaleString()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Scroll to LLM analysis section and populate package ID
                const analysisSection = document.querySelector('[data-llm-analysis]');
                if (analysisSection) {
                  analysisSection.scrollIntoView({ behavior: 'smooth' });
                  // Trigger package ID input update
                  const packageInput = document.querySelector('input[placeholder="0x..."]') as HTMLInputElement;
                  if (packageInput) {
                    packageInput.value = deployment.package_id;
                    packageInput.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                }
              }}
              className="text-xs"
            >
              🔍 Analyze Security
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
