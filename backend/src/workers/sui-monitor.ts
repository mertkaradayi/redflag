import { getRecentPublishTransactions } from '../lib/sui-client';
import { upsertDeployments, getLastProcessedCheckpoint, getAnalysisResult } from '../lib/supabase';
import { runFullAnalysisChain } from '../lib/llm-analyzer';
import { SuiClient } from '@mysten/sui/client';
import { envFlag } from '../lib/env-utils';

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

  if (!envFlag('ENABLE_AUTO_ANALYSIS', true)) {
    console.log('⚠️ ENABLE_AUTO_ANALYSIS=false, skipping deployment monitor startup');
    return;
  }

  if (!envFlag('ENABLE_SUI_RPC', true)) {
    console.log('⚠️ ENABLE_SUI_RPC=false, skipping deployment monitor startup');
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
  if (!envFlag('ENABLE_SUI_RPC', true)) {
    console.log('⚠️ ENABLE_SUI_RPC=false, skipping monitoring check');
    return;
  }

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
      
      // Trigger LLM analysis for new deployments
      await analyzeNewDeployments(deployments);
    } else {
      console.error('❌ Failed to store deployments:', upsertResult.message);
    }

  } catch (error) {
    console.error('💥 Unexpected error in monitoring check:', error);
  }
}

/**
 * Analyze new deployments with LLM
 */
async function analyzeNewDeployments(deployments: any[]): Promise<void> {
  if (!envFlag('ENABLE_AUTO_ANALYSIS', true)) {
    console.log('⚠️ ENABLE_AUTO_ANALYSIS=false, skipping LLM analysis step');
    return;
  }

  if (!process.env.OPEN_ROUTER_KEY) {
    console.log('⚠️  OPEN_ROUTER_KEY not configured, skipping LLM analysis');
    return;
  }

  console.log(`🤖 Starting LLM analysis for ${deployments.length} new deployment(s)...`);
  
  // Determine network based on RPC URL
  const rpcUrl = process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443';
  const network = rpcUrl.includes('testnet') ? 'testnet' : 'mainnet';
  
  // Create Sui client
  const suiClient = new SuiClient({ url: rpcUrl });
  
  // Analyze each deployment
  for (const deployment of deployments) {
    try {
      const packageId = deployment.packageId;
      if (!packageId) {
        console.log(`⚠️  Skipping deployment without packageId: ${deployment.digest}`);
        continue;
      }
      
      // Check if already analyzed in database
      const dbResult = await getAnalysisResult(packageId, network);
      if (dbResult.success && dbResult.analysis) {
        console.log(`📋 Package ${packageId} already analyzed, skipping...`);
        continue;
      }
      
      console.log(`🔍 Analyzing package ${packageId}...`);

      try {
        // Run LLM analysis (will save to database or save as failed)
        const analysisResult = await runFullAnalysisChain(packageId, network, suiClient);

        // Log risk level (only if successful)
        const riskLevel = analysisResult.risk_level;
        const riskScore = analysisResult.risk_score;

        if (riskLevel === 'critical' || riskLevel === 'high') {
          console.log(`🚨 HIGH RISK DETECTED: Package ${packageId} - Risk Level: ${riskLevel} (Score: ${riskScore})`);
          console.log(`   Summary: ${analysisResult.summary}`);
          console.log(`   Risk: ${analysisResult.why_risky_one_liner}`);
        } else {
          console.log(`✅ Package ${packageId} analyzed - Risk Level: ${riskLevel} (Score: ${riskScore})`);
        }

      } catch (analysisError) {
        // Analysis failed but was saved as 'failed' status - just log and continue
        const errorMsg = analysisError instanceof Error ? analysisError.message : String(analysisError);
        console.error(`⚠️  Package ${packageId} analysis failed (saved as failed): ${errorMsg}`);
      }

    } catch (error) {
      // Unexpected error
      console.error(`❌ Unexpected error analyzing package ${deployment.packageId}:`, error);
    }
  }
  
  console.log(`🤖 LLM analysis complete for ${deployments.length} deployment(s)`);
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
