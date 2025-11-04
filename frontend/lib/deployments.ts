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
  network?: 'mainnet' | 'testnet';
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
 * Fetch deployment statistics from the backend API
 * Gets accurate counts from the database, not just paginated results
 */
export async function fetchDeploymentStats(): Promise<{
  success: boolean;
  total: number;
  last24h: number;
  previous24h: number;
  last24hDelta: number;
  latestCheckpoint: number | null;
  timestamp?: string;
  message?: string;
}> {
  const response = await fetch(`${backendUrl}/api/sui/deployment-stats`);

  if (!response.ok) {
    throw new Error(`Failed to fetch deployment stats: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Format a long address to show first 6 and last 4 characters
 */
export function formatAddress(address: string): string {
  if (!address || address.length <= 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Check if a string looks like a Sui address/hash (starts with 0x and is hex)
 */
export function isSuiHash(value: string): boolean {
  return /^0x[a-fA-F0-9]{32,}$/.test(value.trim());
}

/**
 * Parse search query to extract token type and value
 * Supports: "deployer:0x...", "package:0x...", "tx:0x...", or plain hash
 */
export function parseSearchQuery(query: string): {
  type: 'deployer' | 'package' | 'tx' | 'all';
  value: string;
} {
  const trimmed = query.trim();
  
  // Check for token syntax: "type:value"
  const tokenMatch = trimmed.match(/^(deployer|package|tx):(.+)$/i);
  if (tokenMatch) {
    const [, type, value] = tokenMatch;
    return {
      type: type.toLowerCase() as 'deployer' | 'package' | 'tx',
      value: value.trim(),
    };
  }
  
  // If it's a hash, try to auto-detect type from context
  // For now, search all fields
  return {
    type: 'all',
    value: trimmed,
  };
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
  } else if (diffDays < 30) {
    relative = `${diffDays}d ago`;
  } else {
    // For very old items (30+ days), show date but keep it concise
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      relative = `${diffMonths}mo ago`;
    } else {
      relative = date.toLocaleDateString();
    }
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
 * Generate Sui explorer URL for package ID
 */
export function getSuiPackageExplorerUrl(packageId: string, network: 'mainnet' | 'testnet' = 'testnet'): string {
  return `https://suiexplorer.com/object/${packageId}?network=${network}`;
}

/**
 * Generate Sui explorer URL for address
 */
export function getSuiAddressExplorerUrl(address: string, network: 'mainnet' | 'testnet' = 'testnet'): string {
  return `https://suiexplorer.com/address/${address}?network=${network}`;
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
  previous24h: number;
  last24hDelta: number;
  mostActiveDeployer: string | null;
  mostActiveDeployerCount: number;
  latestCheckpoint: number | null;
  previousCheckpoint: number | null;
  checkpointDelta: number | null;
} {
  if (deployments.length === 0) {
    return {
      total: 0,
      last24h: 0,
      previous24h: 0,
      last24hDelta: 0,
      mostActiveDeployer: null,
      mostActiveDeployerCount: 0,
      latestCheckpoint: null,
      previousCheckpoint: null,
      checkpointDelta: null,
    };
  }

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const previous24h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const last24hDeployments = deployments.filter(
    (d) => new Date(d.timestamp) > last24h
  );

  const previous24hDeployments = deployments.filter(
    (d) => {
      const ts = new Date(d.timestamp);
      return ts > previous24h && ts <= last24h;
    }
  );

  const last24hDelta = last24hDeployments.length - previous24hDeployments.length;

  // Count deployments by deployer within last 24h
  const deployerCounts = last24hDeployments.reduce((acc, d) => {
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

  const mostActiveDeployerCount = mostActiveDeployer ? (deployerCounts[mostActiveDeployer] || 0) : 0;

  const checkpoints = deployments.map((d) => d.checkpoint).sort((a, b) => b - a);
  const latestCheckpoint = checkpoints[0] ?? null;
  const previousCheckpoint = checkpoints.length > 1 ? checkpoints[1] : null;
  const checkpointDelta = latestCheckpoint !== null && previousCheckpoint !== null 
    ? latestCheckpoint - previousCheckpoint 
    : null;

  return {
    total: deployments.length,
    last24h: last24hDeployments.length,
    previous24h: previous24hDeployments.length,
    last24hDelta,
    mostActiveDeployer,
    mostActiveDeployerCount,
    latestCheckpoint,
    previousCheckpoint,
    checkpointDelta,
  };
}
