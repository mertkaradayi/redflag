/**
 * Historical Monitor - Background Backfill Worker (BACKWARD DIRECTION)
 *
 * Purpose: Catch up old deployments by going BACKWARD from program start
 * Priority: LOW - runs in background without blocking live monitoring
 * Direction: BACKWARD (current → older checkpoints)
 * Polling: Slower interval (60s) to not interfere with live monitor
 *
 * Flow:
 * 1. On first startup: Save current checkpoint as "origin"
 * 2. Calculate stop point (origin - 30 days)
 * 3. Process checkpoints in descending order (newer → older)
 * 4. Stop when reaching the stop point
 *
 * Coordination with Live Monitor:
 * - Live monitor: handles NEW blocks (forward)
 * - Historical monitor: handles OLD blocks (backward from origin)
 * - No overlap since they go in opposite directions
 * - Database UPSERT ensures no duplicates
 */

import { getDeploymentsFromCheckpointsBackward } from '../lib/sui-client';
import { upsertDeployments, getHistoricalCheckpoint, updateHistoricalCheckpoint, initializeHistoricalBackfill } from '../lib/supabase';
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
 * How far back to go from the origin checkpoint
 * Default: ~30 days at ~1 checkpoint/second
 */
const HISTORICAL_BACKFILL_DEPTH = parseInt(
  process.env.HISTORICAL_BACKFILL_DEPTH || '2592000', // ~30 days
  10
);

// ================================================================
// STATE
// ================================================================

// Map to track historical monitor instances per network
const historicalMonitors = new Map<SuiNetwork, {
  interval: NodeJS.Timeout | null;
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
}>();

// ================================================================
// PUBLIC API
// ================================================================

/**
 * Start historical monitoring for all configured networks
 * Each network runs independently with backward backfill
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
  const { network, rpcUrl } = config;

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

  // Check if this is a fresh start (no origin checkpoint set)
  if (!historicalCheckpoint.originCheckpoint) {
    console.log(`[${network}] [HISTORICAL] First run - initializing backfill origin...`);

    // Get current checkpoint from Sui RPC
    const suiClient = new SuiClient({ url: rpcUrl });
    const latestCheckpoint = await suiClient.getLatestCheckpointSequenceNumber();
    const originCheckpoint = latestCheckpoint.toString();

    // Calculate stop point (origin - depth)
    const stopCheckpoint = Math.max(0, Number(latestCheckpoint) - HISTORICAL_BACKFILL_DEPTH).toString();

    // Initialize in database
    const initResult = await initializeHistoricalBackfill(network, originCheckpoint, stopCheckpoint);
    if (!initResult.success) {
      console.error(`[${network}] [HISTORICAL] Failed to initialize:`, initResult.error);
      return;
    }

    console.log(`[${network}] [HISTORICAL] Initialized: origin=${originCheckpoint}, stop=${stopCheckpoint} (~${HISTORICAL_BACKFILL_DEPTH} checkpoints to process)`);
  }

  console.log(`📚 Starting ${network} historical monitor (polling every ${HISTORICAL_POLL_INTERVAL_MS}ms, going BACKWARD)`);

  // Initialize monitor state
  historicalMonitors.set(network, { interval: null, isRunning: true, isPaused: false, isComplete: false });

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

  console.log(`✅ ${network} historical monitor started (backward direction)`);
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
    historicalMonitors.set(network, { interval: null, isRunning: false, isPaused: false, isComplete: false });
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
  return Array.from(historicalMonitors.values()).some(m => m.isRunning && !m.isPaused && !m.isComplete);
}

/**
 * Get status of all historical monitors
 */
export function getHistoricalMonitoringStatus(): {
  networks: Array<{
    network: string;
    isRunning: boolean;
    isPaused: boolean;
    isComplete: boolean;
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
        isComplete: monitor?.isComplete || false,
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
 * Goes BACKWARD through checkpoints (newer → older)
 *
 * Strategy:
 * 1. Check if backfill is enabled and not paused/complete
 * 2. Get current position (last_processed_checkpoint)
 * 3. Get stop point (backfill_start_checkpoint)
 * 4. If position <= stop, mark complete and pause
 * 5. Fetch checkpoints going backward
 * 6. Save deployments to database
 * 7. Update checkpoint cursor (decrement)
 */
async function performHistoricalMonitoringCheck(config: NetworkConfig): Promise<void> {
  const { network, rpcUrl } = config;

  if (!envFlag('ENABLE_SUI_RPC', true)) {
    return;
  }

  // Check if paused or complete
  const monitor = historicalMonitors.get(network);
  if (monitor?.isPaused || monitor?.isComplete) {
    return; // Silently skip
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

    const currentPosition = historicalCheckpointResult.checkpoint;
    const stopCheckpoint = historicalCheckpointResult.stopCheckpoint;

    if (!currentPosition) {
      console.error(`[${network}] [HISTORICAL] No checkpoint position found`);
      return;
    }

    // Check if we've reached the stop point
    if (BigInt(currentPosition) <= BigInt(stopCheckpoint)) {
      console.log(`[${network}] [HISTORICAL] ✅ Backfill complete! Reached stop checkpoint ${stopCheckpoint}`);
      if (monitor) {
        historicalMonitors.set(network, { ...monitor, isComplete: true, isPaused: true });
      }
      return;
    }

    // Create network-specific Sui client
    const suiClient = new SuiClient({ url: rpcUrl });

    // Fetch deployments going BACKWARD
    const result = await getDeploymentsFromCheckpointsBackward({
      client: suiClient,
      fromCheckpoint: currentPosition,
      stopAtCheckpoint: stopCheckpoint,
      network
    });

    if (!result.success) {
      console.error(`[${network}] [HISTORICAL] Failed to fetch deployments:`, result.message);
      return;
    }

    // Update checkpoint cursor (now points to oldest processed checkpoint)
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

    console.log(`[${network}] [HISTORICAL] 📚 Found ${deployments.length} deployment(s) in ${result.checkpointsProcessed} checkpoint(s) (${currentPosition} → ${result.lastProcessedCheckpoint} backward)`);

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
