import { getDeploymentsFromCheckpoints, LIVE_BOOTSTRAP_OFFSET } from '../lib/sui-client';
import { upsertDeployments, getMonitorCheckpoint, updateMonitorCheckpoint, resetMonitorCheckpoint } from '../lib/supabase';
import { SuiClient } from '@mysten/sui/client';
import { envFlag } from '../lib/env-utils';
import { getNetworkConfigs, type NetworkConfig, type SuiNetwork } from '../lib/network-config';

/**
 * Auto-reset threshold: if monitor is more than this many checkpoints behind,
 * automatically reset to bootstrap near current. Default: 50,000 (~3.5 hours behind)
 */
const AUTO_RESET_GAP_THRESHOLD = parseInt(
  process.env.AUTO_RESET_GAP_THRESHOLD || '50000',
  10
);

// Map to track monitor instances per network
const monitors = new Map<SuiNetwork, { interval: NodeJS.Timeout | null; isRunning: boolean }>();

/**
 * Start monitoring for all configured networks
 * Each network runs independently with its own polling interval
 */
export async function startMonitoring(): Promise<void> {
  if (!envFlag('ENABLE_AUTO_ANALYSIS', true)) {
    console.log('⚠️ ENABLE_AUTO_ANALYSIS=false, skipping deployment monitor startup');
    return;
  }

  if (!envFlag('ENABLE_SUI_RPC', true)) {
    console.log('⚠️ ENABLE_SUI_RPC=false, skipping deployment monitor startup');
    return;
  }

  const configs = getNetworkConfigs();

  console.log(`🚀 Starting multi-network monitoring for: ${configs.map(c => c.network).join(', ')}`);

  for (const config of configs) {
    await startNetworkMonitor(config);
  }
}

/**
 * Start monitoring for a specific network
 */
async function startNetworkMonitor(config: NetworkConfig): Promise<void> {
  const { network } = config;

  if (monitors.has(network) && monitors.get(network)?.isRunning) {
    console.warn(`⚠️ ${network} monitor is already running`);
    return;
  }

  console.log(`🚀 Starting ${network} monitor (polling every ${config.pollIntervalMs}ms)`);

  // Initialize monitor state
  monitors.set(network, { interval: null, isRunning: true });

  // Initial check
  await performMonitoringCheck(config);

  // Set up interval for continuous monitoring
  const interval = setInterval(async () => {
    await performMonitoringCheck(config);
  }, config.pollIntervalMs);

  // Update monitor state with interval
  monitors.set(network, { interval, isRunning: true });

  console.log(`✅ ${network} monitor started successfully`);
}

/**
 * Stop monitoring for all networks
 */
export function stopMonitoring(): void {
  console.log('🛑 Stopping all network monitors...');

  for (const [network, monitor] of monitors.entries()) {
    if (monitor.interval) {
      clearInterval(monitor.interval);
    }
    monitors.set(network, { interval: null, isRunning: false });
    console.log(`🛑 ${network} monitor stopped`);
  }
}

/**
 * Check if any monitor is running
 */
export function isMonitorRunning(): boolean {
  return Array.from(monitors.values()).some(m => m.isRunning);
}

/**
 * Perform a single monitoring check cycle for a specific network
 * Uses checkpoint-based sequential monitoring for reliable coverage
 *
 * 1. Get last processed checkpoint from monitor_checkpoints table
 * 2. Fetch checkpoints sequentially and extract deployments
 * 3. Persist new deployments to database with network tag
 * 4. Update checkpoint cursor
 * 5. Trigger LLM analysis for new deployments
 */
async function performMonitoringCheck(config: NetworkConfig): Promise<void> {
  const { network, rpcUrl } = config;

  if (!envFlag('ENABLE_SUI_RPC', true)) {
    return;
  }

  try {
    // Get the last checkpoint we processed for THIS network from dedicated tracking table
    const checkpointResult = await getMonitorCheckpoint(network);

    if (!checkpointResult.success) {
      console.error(`[${network}] Failed to get monitor checkpoint:`, checkpointResult.error);
      return;
    }

    const lastCheckpoint = checkpointResult.checkpoint;

    // Create network-specific Sui client
    const suiClient = new SuiClient({ url: rpcUrl });

    // Auto-reset check: if we're too far behind, reset and bootstrap fresh
    if (lastCheckpoint) {
      const latestCheckpoint = await suiClient.getLatestCheckpointSequenceNumber();
      const gap = Number(latestCheckpoint) - Number(lastCheckpoint);

      if (gap > AUTO_RESET_GAP_THRESHOLD) {
        console.warn(`[${network}] ⚠️ Monitor is ${gap.toLocaleString()} checkpoints behind (threshold: ${AUTO_RESET_GAP_THRESHOLD.toLocaleString()})`);
        console.warn(`[${network}] 🔄 Auto-resetting checkpoint to bootstrap near current (latest - ${LIVE_BOOTSTRAP_OFFSET})`);

        const resetResult = await resetMonitorCheckpoint(network);
        if (resetResult.success) {
          console.log(`[${network}] ✅ Checkpoint reset successful - next poll will bootstrap fresh`);
        } else {
          console.error(`[${network}] ❌ Failed to reset checkpoint:`, resetResult.error);
        }
        return; // Exit this poll cycle - next poll will bootstrap fresh
      }
    }

    // Fetch new deployments using checkpoint-based approach
    // Note: maxCheckpoints is determined adaptively inside the function based on gap size
    const result = await getDeploymentsFromCheckpoints({
      client: suiClient,
      fromCheckpoint: lastCheckpoint,
      network // Pass network for logging
    });

    if (!result.success) {
      console.error(`[${network}] Failed to fetch deployments from checkpoints:`, result.message);
      return;
    }

    // Update checkpoint cursor even if no deployments found
    // This ensures we don't re-process the same checkpoints
    if (result.checkpointsProcessed > 0) {
      const updateResult = await updateMonitorCheckpoint(network, result.lastProcessedCheckpoint);
      if (!updateResult.success) {
        console.error(`[${network}] Failed to update checkpoint cursor:`, updateResult.error);
        // Continue anyway - we'll re-process these checkpoints next time
      }
    }

    const deployments = result.deployments;

    if (deployments.length === 0) {
      // No new deployments found - this is normal
      return;
    }

    console.log(`[${network}] 📦 Found ${deployments.length} new deployment(s) in ${result.checkpointsProcessed} checkpoint(s) (${lastCheckpoint || 'bootstrap'} → ${result.lastProcessedCheckpoint})`);

    // Persist deployments to database WITH network tag
    const upsertResult = await upsertDeployments(deployments, network);

    if (upsertResult.success) {
      console.log(`[${network}] ✅ Stored ${upsertResult.count} deployment(s) - analysis worker will process them`);
      // No longer calling analyzeNewDeployments - analysis worker handles this asynchronously
    } else {
      console.error(`[${network}] ❌ Failed to store deployments:`, upsertResult.message);
    }

  } catch (error) {
    console.error(`[${network}] 💥 Unexpected error in monitoring check:`, error);
  }
}

// analyzeNewDeployments function removed - analysis now handled by separate worker
// See: backend/src/workers/analysis-worker.ts

/**
 * Get monitoring status information for all networks
 */
export function getMonitoringStatus(): {
  networks: Array<{
    network: string;
    isRunning: boolean;
    pollIntervalMs: number;
  }>;
} {
  const configs = getNetworkConfigs();

  return {
    networks: configs.map(config => ({
      network: config.network,
      isRunning: monitors.get(config.network)?.isRunning || false,
      pollIntervalMs: config.pollIntervalMs
    }))
  };
}
