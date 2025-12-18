/**
 * Network Configuration Module
 *
 * Manages RPC URLs and polling intervals for multi-network monitoring.
 * Supports simultaneous monitoring of mainnet and testnet.
 */

export type SuiNetwork = 'mainnet' | 'testnet';

export interface NetworkConfig {
  network: SuiNetwork;
  rpcUrl: string;
  pollIntervalMs: number;
}

/**
 * Get network configurations for monitoring
 * Reads from environment variables
 *
 * Environment variables:
 * - SUI_RPC_URL_TESTNET: Testnet RPC endpoint (default: https://fullnode.testnet.sui.io:443)
 * - SUI_RPC_URL_MAINNET: Mainnet RPC endpoint (default: https://fullnode.mainnet.sui.io:443)
 * - POLL_INTERVAL_MS_TESTNET: Testnet polling interval in ms (default: 15000)
 * - POLL_INTERVAL_MS_MAINNET: Mainnet polling interval in ms (default: 30000)
 */
export function getNetworkConfigs(): NetworkConfig[] {
  const configs: NetworkConfig[] = [];

  // Testnet configuration
  const testnetUrl = process.env.SUI_RPC_URL_TESTNET || 'https://fullnode.testnet.sui.io:443';
  const testnetInterval = Number.parseInt(process.env.POLL_INTERVAL_MS_TESTNET || '15000', 10);

  configs.push({
    network: 'testnet',
    rpcUrl: testnetUrl,
    pollIntervalMs: Number.isFinite(testnetInterval) && testnetInterval > 0 ? testnetInterval : 15000
  });

  // Mainnet configuration
  const mainnetUrl = process.env.SUI_RPC_URL_MAINNET || 'https://fullnode.mainnet.sui.io:443';
  const mainnetInterval = Number.parseInt(process.env.POLL_INTERVAL_MS_MAINNET || '30000', 10);

  configs.push({
    network: 'mainnet',
    rpcUrl: mainnetUrl,
    pollIntervalMs: Number.isFinite(mainnetInterval) && mainnetInterval > 0 ? mainnetInterval : 30000
  });

  return configs;
}

/**
 * Get configuration for a specific network
 * Returns null if network not found
 */
export function getNetworkConfig(network: SuiNetwork): NetworkConfig | null {
  const configs = getNetworkConfigs();
  return configs.find(c => c.network === network) || null;
}

/**
 * Get RPC URL for a specific network
 * Falls back to default Sui Foundation RPC if not configured
 */
export function getRpcUrl(network: SuiNetwork): string {
  const config = getNetworkConfig(network);
  return config?.rpcUrl || (network === 'mainnet'
    ? 'https://fullnode.mainnet.sui.io:443'
    : 'https://fullnode.testnet.sui.io:443'
  );
}

/**
 * Get polling interval for a specific network
 * Returns default if not configured or invalid
 */
export function getPollInterval(network: SuiNetwork): number {
  const config = getNetworkConfig(network);
  return config?.pollIntervalMs || (network === 'mainnet' ? 30000 : 15000);
}
