// Utility functions for deployments dashboard

export interface Deployment {
  package_id: string;
  deployer_address: string;
  tx_digest: string;
  checkpoint: number;
  timestamp: string;
  first_seen_at: string;
}

export interface DeploymentsResponse {
  success: boolean;
  message: string;
  timestamp: string;
  deployments: Deployment[];
  totalCount: number;
  limit: number;
  offset: number;
}

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

/**
 * Fetch deployments from the backend API
 */
export async function fetchDeployments(
  limit: number = 50,
  offset: number = 0
): Promise<DeploymentsResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });

  const response = await fetch(`${backendUrl}/api/sui/deployments?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch deployments: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Format a long address to show first 6 and last 4 characters
 */
export function formatAddress(address: string): string {
  if (!address || address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format timestamp to human-readable relative time
 */
export function formatTimestamp(timestamp: string): {
  relative: string;
  absolute: string;
} {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relative: string;
  if (diffSeconds < 60) {
    relative = `${diffSeconds}s ago`;
  } else if (diffMinutes < 60) {
    relative = `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    relative = `${diffHours}h ago`;
  } else if (diffDays < 7) {
    relative = `${diffDays}d ago`;
  } else {
    relative = date.toLocaleDateString();
  }

  const absolute = date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  return { relative, absolute };
}

/**
 * Generate Sui explorer URL for transaction digest
 */
export function getSuiExplorerUrl(txDigest: string): string {
  // Sui testnet explorer URL
  return `https://suiexplorer.com/txblock/${txDigest}?network=testnet`;
}

/**
 * Copy text to clipboard with user feedback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Get age-based color class for deployment cards
 */
export type DeploymentAgeBucket = 'lastHour' | 'last24h' | 'lastWeek' | 'older';

export function getDeploymentAgeColor(timestamp: string): DeploymentAgeBucket {
  const date = new Date(timestamp);
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffHours < 1) {
    return 'lastHour';
  } else if (diffHours < 24) {
    return 'last24h';
  } else if (diffHours < 168) { // 7 days
    return 'lastWeek';
  } else {
    return 'older';
  }
}

/**
 * Calculate statistics from deployments array
 */
export function calculateStats(deployments: Deployment[]): {
  total: number;
  last24h: number;
  mostActiveDeployer: string | null;
  latestCheckpoint: number | null;
} {
  if (deployments.length === 0) {
    return {
      total: 0,
      last24h: 0,
      mostActiveDeployer: null,
      latestCheckpoint: null,
    };
  }

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const last24hDeployments = deployments.filter(
    (d) => new Date(d.timestamp) > last24h
  );

  // Count deployments by deployer
  const deployerCounts = deployments.reduce((acc, d) => {
    acc[d.deployer_address] = (acc[d.deployer_address] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const deployerEntries = Object.entries(deployerCounts);
  const mostActiveDeployer = deployerEntries.length > 0 
    ? deployerEntries.reduce((max, [deployer, count]) => 
        (count > (deployerCounts[max] || 0) ? deployer : max),
        deployerEntries[0][0]
      )
    : null;

  const latestCheckpoint = Math.max(...deployments.map((d) => d.checkpoint));

  return {
    total: deployments.length,
    last24h: last24hDeployments.length,
    mostActiveDeployer,
    latestCheckpoint,
  };
}
