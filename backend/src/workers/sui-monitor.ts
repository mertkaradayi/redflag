import { getRecentPublishTransactions } from '../lib/sui-client';
import { upsertDeployments, getLastProcessedCheckpoint, getAnalysisResult } from '../lib/supabase';
import { runFullAnalysisChain } from '../lib/llm-analyzer';
import { SuiClient } from '@mysten/sui/client';
import { envFlag } from '../lib/env-utils';
import { getNetworkConfigs, type NetworkConfig, type SuiNetwork } from '../lib/network-config';

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
 * 1. Get last processed checkpoint from database for this network
 * 2. Fetch new deployments from Sui RPC for this network
 * 3. Persist new deployments to database with network tag
 * 4. Trigger LLM analysis for new deployments
 */
async function performMonitoringCheck(config: NetworkConfig): Promise<void> {
  const { network, rpcUrl } = config;

  if (!envFlag('ENABLE_SUI_RPC', true)) {
    return;
  }

  try {
    // Get the last checkpoint we processed for THIS network
    const checkpointResult = await getLastProcessedCheckpoint(network);

    if (!checkpointResult.success) {
      console.error(`[${network}] Failed to get last processed checkpoint:`, checkpointResult.error);
      return;
    }

    const lastCheckpoint = checkpointResult.checkpoint;
    const afterCheckpoint = lastCheckpoint ? lastCheckpoint + 1 : undefined;

    // Create network-specific Sui client
    const suiClient = new SuiClient({ url: rpcUrl });

    // Fetch new deployments from Sui RPC using network-specific client
    const suiResult = await getRecentPublishTransactions({
      limit: 100,
      afterCheckpoint,
      client: suiClient
    });

    if (!suiResult.success) {
      console.error(`[${network}] Failed to fetch deployments from Sui:`, suiResult.message);
      return;
    }

    const deployments = suiResult.deployments || [];

    if (deployments.length === 0) {
      // No new deployments found - this is normal
      return;
    }

    console.log(`[${network}] 📦 Found ${deployments.length} new deployment(s) since checkpoint ${lastCheckpoint || 'start'}`);

    // Persist deployments to database WITH network tag
    const upsertResult = await upsertDeployments(deployments, network);

    if (upsertResult.success) {
      console.log(`[${network}] ✅ Successfully stored ${upsertResult.count} deployment(s) to database`);

      // Trigger LLM analysis for new deployments
      await analyzeNewDeployments(deployments, network, suiClient);
    } else {
      console.error(`[${network}] ❌ Failed to store deployments:`, upsertResult.message);
    }

  } catch (error) {
    console.error(`[${network}] 💥 Unexpected error in monitoring check:`, error);
  }
}

/**
 * Analyze new deployments with LLM
 */
async function analyzeNewDeployments(
  deployments: any[],
  network: string,
  suiClient: SuiClient
): Promise<void> {
  if (!envFlag('ENABLE_AUTO_ANALYSIS', true)) {
    return;
  }

  if (!process.env.OPEN_ROUTER_KEY) {
    console.log(`[${network}] ⚠️ OPEN_ROUTER_KEY not configured, skipping LLM analysis`);
    return;
  }

  console.log(`[${network}] 🤖 Starting LLM analysis for ${deployments.length} new deployment(s)...`);

  // Analyze each deployment
  for (const deployment of deployments) {
    try {
      const packageId = deployment.packageId;
      if (!packageId) {
        console.log(`[${network}] ⚠️ Skipping deployment without packageId: ${deployment.digest}`);
        continue;
      }

      // Check if already analyzed in database
      const dbResult = await getAnalysisResult(packageId, network);
      if (dbResult.success && dbResult.analysis) {
        console.log(`[${network}] 📋 Package ${packageId} already analyzed, skipping...`);
        continue;
      }

      console.log(`[${network}] 🔍 Analyzing package ${packageId}...`);

      try {
        // Run LLM analysis (will save to database or save as failed)
        const analysisResult = await runFullAnalysisChain(packageId, network, suiClient);

        const riskLevel = analysisResult.risk_level;
        const riskScore = analysisResult.risk_score;

        if (riskLevel === 'critical' || riskLevel === 'high') {
          console.log(`[${network}] 🚨 HIGH RISK DETECTED: Package ${packageId} - Risk Level: ${riskLevel} (Score: ${riskScore})`);
          console.log(`[${network}]    Summary: ${analysisResult.summary}`);
          console.log(`[${network}]    Risk: ${analysisResult.why_risky_one_liner}`);
        } else {
          console.log(`[${network}] ✅ Package ${packageId} analyzed - Risk Level: ${riskLevel} (Score: ${riskScore})`);
        }

      } catch (analysisError) {
        const errorMsg = analysisError instanceof Error ? analysisError.message : String(analysisError);
        console.error(`[${network}] ⚠️ Package ${packageId} analysis failed (saved as failed): ${errorMsg}`);
      }

    } catch (error) {
      console.error(`[${network}] ❌ Unexpected error analyzing package ${deployment.packageId}:`, error);
    }
  }

  console.log(`[${network}] 🤖 LLM analysis complete for ${deployments.length} deployment(s)`);
}

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
