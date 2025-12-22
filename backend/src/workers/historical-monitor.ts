/**
 * Historical Monitor - Background Backfill Worker
 *
 * Purpose: Catch up old deployments for data completeness
 * Priority: LOW - runs in background without blocking live monitoring
 * Bootstrap: Starts from checkpoint 0 (or configured start checkpoint)
 * Polling: Slower interval (60s) to not interfere with live monitor
 *
 * Coordination with Live Monitor:
 * - Both write to same `sui_package_deployments` table
 * - Database UPSERT ensures no duplicates
 * - Historical monitor pauses when caught up to live monitor
 * - Automatically resumes if gap reopens (e.g., after downtime)
 */

import { getDeploymentsFromCheckpoints } from '../lib/sui-client';
import { upsertDeployments, getHistoricalCheckpoint, updateHistoricalCheckpoint, getMonitorCheckpoint } from '../lib/supabase';
import { SuiClient } from '@mysten/sui/client';
import { envFlag } from '../lib/env-utils';
import { getNetworkConfigs, type NetworkConfig, type SuiNetwork } from '../lib/network-config';

// ================================================================
// CONFIGURATION
// ================================================================

/**
 * Polling interval for historical backfill (slower than live monitor)
 */
const HISTORICAL_POLL_INTERVAL_MS = parseInt(
  process.env.HISTORICAL_POLL_INTERVAL_MS || '60000',
  10
); // 60 seconds default

/**
 * Safety gap: pause historical when this close to live monitor
 * Prevents historical from competing with live for same checkpoints
 */
const HISTORICAL_SAFETY_GAP = parseInt(
  process.env.HISTORICAL_SAFETY_GAP || '1000',
  10
); // 1000 checkpoints

/**
 * Bootstrap: historical monitor starts from beginning (or configured checkpoint)
 * Unlike live monitor which starts from recent checkpoints
 */
const HISTORICAL_BOOTSTRAP_OFFSET = 999999999; // Very large number = start from checkpoint 0

// ================================================================
// STATE
// ================================================================

// Map to track historical monitor instances per network
const historicalMonitors = new Map<SuiNetwork, {
  interval: NodeJS.Timeout | null;
  isRunning: boolean;
  isPaused: boolean;
}>();

// ================================================================
// PUBLIC API
// ================================================================

/**
 * Start historical monitoring for all configured networks
 * Each network runs independently with historical backfill
 */
export async function startHistoricalMonitoring(): Promise<void> {
  if (!envFlag('ENABLE_AUTO_ANALYSIS', true)) {
    console.log('⚠️  ENABLE_AUTO_ANALYSIS=false, skipping historical monitor startup');
    return;
  }

  if (!envFlag('ENABLE_SUI_RPC', true)) {
    console.log('⚠️  ENABLE_SUI_RPC=false, skipping historical monitor startup');
    return;
  }

  const historicalEnabled = envFlag('ENABLE_HISTORICAL_BACKFILL', true);
  if (!historicalEnabled) {
    console.log('⚠️  ENABLE_HISTORICAL_BACKFILL=false, skipping historical monitor');
    return;
  }

  const configs = getNetworkConfigs();

  console.log(`📚 Starting historical backfill monitoring for: ${configs.map(c => c.network).join(', ')}`);

  for (const config of configs) {
    await startNetworkHistoricalMonitor(config);
  }
}

/**
 * Start historical monitoring for a specific network
 */
async function startNetworkHistoricalMonitor(config: NetworkConfig): Promise<void> {
  const { network } = config;

  if (historicalMonitors.has(network) && historicalMonitors.get(network)?.isRunning) {
    console.warn(`⚠️  ${network} historical monitor is already running`);
    return;
  }

  // Check if backfill is enabled for this network
  const historicalCheckpoint = await getHistoricalCheckpoint(network);
  if (!historicalCheckpoint.success || !historicalCheckpoint.enabled) {
    console.log(`⚠️  Historical backfill disabled for ${network}, skipping`);
    return;
  }

  console.log(`📚 Starting ${network} historical monitor (polling every ${HISTORICAL_POLL_INTERVAL_MS}ms)`);

  // Initialize monitor state
  historicalMonitors.set(network, { interval: null, isRunning: true, isPaused: false });

  // Initial check
  await performHistoricalMonitoringCheck(config);

  // Set up interval for continuous monitoring
  const interval = setInterval(async () => {
    await performHistoricalMonitoringCheck(config);
  }, HISTORICAL_POLL_INTERVAL_MS);

  // Update monitor state with interval
  const currentState = historicalMonitors.get(network);
  if (currentState) {
    historicalMonitors.set(network, { ...currentState, interval });
  }

  console.log(`✅ ${network} historical monitor started`);
}

/**
 * Stop historical monitoring for all networks
 */
export function stopHistoricalMonitoring(): void {
  console.log('🛑 Stopping all historical monitors...');

  for (const [network, monitor] of historicalMonitors.entries()) {
    if (monitor.interval) {
      clearInterval(monitor.interval);
    }
    historicalMonitors.set(network, { interval: null, isRunning: false, isPaused: false });
    console.log(`🛑 ${network} historical monitor stopped`);
  }
}

/**
 * Pause historical monitoring for a specific network
 */
export function pauseHistoricalMonitoring(network: SuiNetwork): void {
  const monitor = historicalMonitors.get(network);
  if (monitor) {
    historicalMonitors.set(network, { ...monitor, isPaused: true });
    console.log(`⏸️  ${network} historical monitor paused`);
  }
}

/**
 * Resume historical monitoring for a specific network
 */
export function resumeHistoricalMonitoring(network: SuiNetwork): void {
  const monitor = historicalMonitors.get(network);
  if (monitor) {
    historicalMonitors.set(network, { ...monitor, isPaused: false });
    console.log(`▶️  ${network} historical monitor resumed`);
  }
}

/**
 * Check if historical monitor is running for any network
 */
export function isHistoricalMonitorRunning(): boolean {
  return Array.from(historicalMonitors.values()).some(m => m.isRunning && !m.isPaused);
}

/**
 * Get status of all historical monitors
 */
export function getHistoricalMonitoringStatus(): {
  networks: Array<{
    network: string;
    isRunning: boolean;
    isPaused: boolean;
    pollIntervalMs: number;
  }>;
} {
  const configs = getNetworkConfigs();

  return {
    networks: configs.map(config => {
      const monitor = historicalMonitors.get(config.network);
      return {
        network: config.network,
        isRunning: monitor?.isRunning || false,
        isPaused: monitor?.isPaused || false,
        pollIntervalMs: HISTORICAL_POLL_INTERVAL_MS
      };
    })
  };
}

// ================================================================
// PRIVATE IMPLEMENTATION
// ================================================================

/**
 * Perform a single historical monitoring check cycle for a specific network
 *
 * Strategy:
 * 1. Check if backfill is enabled and not paused
 * 2. Get last processed historical checkpoint
 * 3. Check gap to live monitor (pause if too close)
 * 4. Fetch next batch of checkpoints
 * 5. Save deployments to database (UPSERT handles duplicates)
 * 6. Update historical cursor
 */
async function performHistoricalMonitoringCheck(config: NetworkConfig): Promise<void> {
  const { network, rpcUrl } = config;

  if (!envFlag('ENABLE_SUI_RPC', true)) {
    return;
  }

  // Check if paused
  const monitor = historicalMonitors.get(network);
  if (monitor?.isPaused) {
    return; // Silently skip when paused
  }

  try {
    // Get historical checkpoint status
    const historicalCheckpointResult = await getHistoricalCheckpoint(network);

    if (!historicalCheckpointResult.success) {
      console.error(`[${network}] [HISTORICAL] Failed to get checkpoint:`, historicalCheckpointResult.error);
      return;
    }

    if (!historicalCheckpointResult.enabled) {
      console.log(`[${network}] [HISTORICAL] Backfill disabled, pausing monitor`);
      pauseHistoricalMonitoring(network);
      return;
    }

    const lastHistoricalCheckpoint = historicalCheckpointResult.checkpoint || historicalCheckpointResult.startCheckpoint;

    // Get live monitor checkpoint to check gap
    const liveCheckpointResult = await getMonitorCheckpoint(network);
    const liveCheckpoint = liveCheckpointResult.checkpoint;

    if (liveCheckpoint) {
      const gap = BigInt(liveCheckpoint) - BigInt(lastHistoricalCheckpoint);

      // If caught up to live monitor (within safety gap), pause
      if (gap <= BigInt(HISTORICAL_SAFETY_GAP)) {
        console.log(`[${network}] [HISTORICAL] Caught up to live monitor (gap: ${gap}), pausing backfill`);
        pauseHistoricalMonitoring(network);
        return;
      }
    }

    // Create network-specific Sui client
    const suiClient = new SuiClient({ url: rpcUrl });

    // Fetch deployments using checkpoint-based approach with historical bootstrap
    const result = await getDeploymentsFromCheckpoints({
      client: suiClient,
      fromCheckpoint: lastHistoricalCheckpoint,
      network,
      bootstrapOffset: HISTORICAL_BOOTSTRAP_OFFSET // Starts from beginning
    });

    if (!result.success) {
      console.error(`[${network}] [HISTORICAL] Failed to fetch deployments:`, result.message);
      return;
    }

    // Update checkpoint cursor even if no deployments found
    if (result.checkpointsProcessed > 0) {
      const updateResult = await updateHistoricalCheckpoint(network, result.lastProcessedCheckpoint);
      if (!updateResult.success) {
        console.error(`[${network}] [HISTORICAL] Failed to update checkpoint cursor:`, updateResult.error);
        // Continue anyway - we'll re-process these checkpoints next time
      }
    }

    const deployments = result.deployments;

    if (deployments.length === 0) {
      // No new deployments found - this is normal for historical
      return;
    }

    console.log(`[${network}] [HISTORICAL] 📚 Found ${deployments.length} deployment(s) in ${result.checkpointsProcessed} checkpoint(s) (${lastHistoricalCheckpoint} → ${result.lastProcessedCheckpoint})`);

    // Persist deployments to database WITH network tag
    // UPSERT ensures no duplicates if live monitor already found them
    const upsertResult = await upsertDeployments(deployments, network);

    if (upsertResult.success) {
      console.log(`[${network}] [HISTORICAL] ✅ Stored ${upsertResult.count} deployment(s) (backfill)`);
    } else {
      console.error(`[${network}] [HISTORICAL] ❌ Failed to store deployments:`, upsertResult.message);
    }

  } catch (error) {
    console.error(`[${network}] [HISTORICAL] 💥 Unexpected error in monitoring check:`, error);
  }
}
