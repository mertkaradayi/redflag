import { getRecentPublishTransactions } from '../lib/sui-client';
import { upsertDeployments, getLastProcessedCheckpoint } from '../lib/supabase';

// Singleton pattern to prevent multiple monitors
let monitorInterval: NodeJS.Timeout | null = null;
let isMonitoring = false;

/**
 * Start the Sui deployment monitoring background worker
 * Polls for new deployments every POLL_INTERVAL_MS milliseconds
 */
export async function startMonitoring(): Promise<void> {
  if (isMonitoring) {
    console.warn('Sui deployment monitor is already running');
    return;
  }

  const pollIntervalMs = Number.parseInt(process.env.POLL_INTERVAL_MS ?? '', 10);
  const intervalMs = Number.isFinite(pollIntervalMs) && pollIntervalMs > 0 ? pollIntervalMs : 15000;

  console.log(`🚀 Starting Sui deployment monitor (polling every ${intervalMs}ms)`);
  
  isMonitoring = true;

  // Initial check
  await performMonitoringCheck();

  // Set up interval for continuous monitoring
  monitorInterval = setInterval(async () => {
    await performMonitoringCheck();
  }, intervalMs);

  console.log('✅ Sui deployment monitor started successfully');
}

/**
 * Stop the Sui deployment monitoring background worker
 */
export function stopMonitoring(): void {
  if (!isMonitoring) {
    console.warn('Sui deployment monitor is not running');
    return;
  }

  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }

  isMonitoring = false;
  console.log('🛑 Sui deployment monitor stopped');
}

/**
 * Check if the monitor is currently running
 */
export function isMonitorRunning(): boolean {
  return isMonitoring;
}

/**
 * Perform a single monitoring check cycle
 * 1. Get last processed checkpoint from database
 * 2. Fetch new deployments from Sui
 * 3. Persist new deployments to database
 */
async function performMonitoringCheck(): Promise<void> {
  try {
    // Get the last checkpoint we processed
    const checkpointResult = await getLastProcessedCheckpoint();
    
    if (!checkpointResult.success) {
      console.error('Failed to get last processed checkpoint:', checkpointResult.error);
      return;
    }

    const lastCheckpoint = checkpointResult.checkpoint;
    const afterCheckpoint = lastCheckpoint ? lastCheckpoint + 1 : undefined;

    // Fetch new deployments from Sui
    const suiResult = await getRecentPublishTransactions({
      limit: 100, // Get up to 100 new deployments per check
      afterCheckpoint
    });

    if (!suiResult.success) {
      console.error('Failed to fetch deployments from Sui:', suiResult.message);
      return;
    }

    const deployments = suiResult.deployments || [];
    
    if (deployments.length === 0) {
      // No new deployments found - this is normal
      return;
    }

    console.log(`📦 Found ${deployments.length} new deployment(s) since checkpoint ${lastCheckpoint || 'start'}`);

    // Persist deployments to database
    const upsertResult = await upsertDeployments(deployments);
    
    if (upsertResult.success) {
      console.log(`✅ Successfully stored ${upsertResult.count} deployment(s) to database`);
    } else {
      console.error('❌ Failed to store deployments:', upsertResult.message);
    }

  } catch (error) {
    console.error('💥 Unexpected error in monitoring check:', error);
  }
}

/**
 * Get monitoring status information
 */
export function getMonitoringStatus(): {
  isRunning: boolean;
  pollIntervalMs: number;
  lastCheck?: Date;
} {
  const pollIntervalMs = Number.parseInt(process.env.POLL_INTERVAL_MS ?? '', 10);
  const intervalMs = Number.isFinite(pollIntervalMs) && pollIntervalMs > 0 ? pollIntervalMs : 15000;

  return {
    isRunning: isMonitoring,
    pollIntervalMs: intervalMs
  };
}
