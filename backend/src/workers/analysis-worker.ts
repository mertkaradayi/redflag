/**
 * Analysis Worker - Background processor for LLM analysis
 *
 * This worker runs independently from the checkpoint monitor.
 * It queries the database for unanalyzed deployments and processes
 * them with concurrency control.
 *
 * Architecture:
 * - Polls database every POLL_INTERVAL_MS for pending work
 * - Maintains MAX_CONCURRENT_ANALYSES concurrent analyses
 * - Processes oldest deployments first (FIFO)
 * - Gracefully handles errors without crashing
 */

import { getUnanalyzedDeployments, type DeploymentRow } from '../lib/supabase';
import { runFullAnalysisChain } from '../lib/llm-analyzer';
import { SuiClient } from '@mysten/sui/client';
import { envFlag } from '../lib/env-utils';

// ================================================================
// CONFIGURATION
// ================================================================

/**
 * How many analyses can run at the same time
 * Higher = faster processing, but more memory/API usage
 */
const MAX_CONCURRENT_ANALYSES = 5;

/**
 * How often to check for new pending deployments (milliseconds)
 */
const POLL_INTERVAL_MS = 5_000; // 5 seconds

/**
 * Minimum time between log messages about queue status
 */
const LOG_THROTTLE_MS = 60_000; // 1 minute

// ================================================================
// STATE
// ================================================================

let workerInterval: NodeJS.Timeout | null = null;
let isRunning = false;
let currentlyAnalyzing = 0;
let lastLogTime = 0;
let totalProcessed = 0;
let totalFailed = 0;

// Track which packages are currently being analyzed (prevent duplicates)
const analyzingPackages = new Set<string>();

// ================================================================
// PUBLIC API
// ================================================================

/**
 * Start the analysis worker
 * Safe to call multiple times (idempotent)
 */
export function startAnalysisWorker(): void {
  if (isRunning) {
    console.log('⚠️  Analysis worker already running');
    return;
  }

  if (!envFlag('ENABLE_AUTO_ANALYSIS', true)) {
    console.log('⚠️  ENABLE_AUTO_ANALYSIS=false, analysis worker disabled');
    return;
  }

  if (!process.env.OPEN_ROUTER_KEY) {
    console.log('⚠️  OPEN_ROUTER_KEY not set, analysis worker disabled');
    return;
  }

  console.log('🤖 Starting analysis worker...');
  console.log(`   - Concurrency: ${MAX_CONCURRENT_ANALYSES}`);
  console.log(`   - Poll interval: ${POLL_INTERVAL_MS}ms`);

  isRunning = true;
  totalProcessed = 0;
  totalFailed = 0;

  // Start polling loop
  workerInterval = setInterval(() => {
    processAnalysisQueue().catch(err => {
      console.error('❌ Analysis worker error:', err);
    });
  }, POLL_INTERVAL_MS);

  // Immediate first run
  processAnalysisQueue().catch(err => {
    console.error('❌ Analysis worker error:', err);
  });

  console.log('✅ Analysis worker started');
}

/**
 * Stop the analysis worker
 * Waits for in-flight analyses to complete
 */
export function stopAnalysisWorker(): void {
  if (!isRunning) {
    return;
  }

  console.log('🛑 Stopping analysis worker...');

  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }

  isRunning = false;

  if (currentlyAnalyzing > 0) {
    console.log(`   Waiting for ${currentlyAnalyzing} in-flight analyses to complete...`);
  }

  console.log(`📊 Analysis worker stats: ${totalProcessed} processed, ${totalFailed} failed`);
  console.log('✅ Analysis worker stopped');
}

/**
 * Get current worker status (for monitoring/debugging)
 */
export function getAnalysisWorkerStatus() {
  return {
    isRunning,
    currentlyAnalyzing,
    maxConcurrent: MAX_CONCURRENT_ANALYSES,
    totalProcessed,
    totalFailed,
    availableSlots: MAX_CONCURRENT_ANALYSES - currentlyAnalyzing
  };
}

// ================================================================
// PRIVATE IMPLEMENTATION
// ================================================================

/**
 * Main processing loop - checks for pending work and starts analyses
 */
async function processAnalysisQueue(): Promise<void> {
  if (!isRunning) {
    return;
  }

  // Check if we have capacity
  const availableSlots = MAX_CONCURRENT_ANALYSES - currentlyAnalyzing;

  if (availableSlots <= 0) {
    // All slots busy, throttled log
    throttledLog('Analysis worker at capacity, waiting for slots...');
    return;
  }

  // Query for pending deployments (only as many as we have capacity for)
  // Exclude packages already being analyzed to avoid "Already analyzing" spam
  // Note: analyzingPackages stores "network:packageId" format, but DB expects just packageId
  const excludeIds = Array.from(analyzingPackages).map(key => key.split(':').slice(1).join(':'));
  const result = await getUnanalyzedDeployments({
    limit: availableSlots,
    network: null, // Process all networks
    excludePackageIds: excludeIds
  });

  if (!result.success) {
    console.error('❌ Failed to query pending deployments:', result.error);
    return;
  }

  if (result.deployments.length === 0) {
    // No pending work - throttled log to avoid spam
    throttledLog('No pending analyses found');
    return;
  }

  console.log(`📋 Found ${result.deployments.length} pending deployment(s) for analysis`);

  // Start analyses (fire and forget with error handling)
  for (const deployment of result.deployments) {
    // Prevent duplicate processing
    const key = `${deployment.network}:${deployment.package_id}`;
    if (analyzingPackages.has(key)) {
      console.log(`⚠️  Already analyzing ${key}, skipping`);
      continue;
    }

    // Start async analysis (don't await - run in background)
    analyzeDeploymentAsync(deployment);
  }
}

/**
 * Analyze a single deployment asynchronously
 * Handles concurrency tracking and error recovery
 */
async function analyzeDeploymentAsync(deployment: DeploymentRow): Promise<void> {
  const key = `${deployment.network}:${deployment.package_id}`;
  const startTime = Date.now();

  // Track concurrency
  currentlyAnalyzing++;
  analyzingPackages.add(key);

  try {
    // Create network-specific Sui client
    const rpcUrl = deployment.network === 'testnet'
      ? (process.env.SUI_RPC_URL_TESTNET || 'https://fullnode.testnet.sui.io:443')
      : (process.env.SUI_RPC_URL_MAINNET || 'https://fullnode.mainnet.sui.io:443');

    const suiClient = new SuiClient({ url: rpcUrl });

    console.log(`[${deployment.network}] 🔍 Analyzing ${deployment.package_id}...`);

    // Run full analysis chain (saves to DB on success or failure)
    const safetyCard = await runFullAnalysisChain(
      deployment.package_id,
      deployment.network,
      suiClient,
      false // Don't force re-analysis
    );

    const duration = Date.now() - startTime;
    const durationSec = (duration / 1000).toFixed(1);

    // Log based on risk level
    if (safetyCard.risk_level === 'critical' || safetyCard.risk_level === 'high') {
      console.log(`[${deployment.network}] 🚨 HIGH RISK: ${deployment.package_id}`);
      console.log(`   Risk: ${safetyCard.risk_level.toUpperCase()} (${safetyCard.risk_score}/100)`);
      console.log(`   Why: ${safetyCard.why_risky_one_liner}`);
      console.log(`   Duration: ${durationSec}s`);
    } else {
      console.log(`[${deployment.network}] ✅ ${deployment.package_id} - ${safetyCard.risk_level} (${safetyCard.risk_score}) - ${durationSec}s`);
    }

    totalProcessed++;

  } catch (error) {
    const duration = Date.now() - startTime;
    const durationSec = (duration / 1000).toFixed(1);
    const errorMsg = error instanceof Error ? error.message : String(error);

    console.error(`[${deployment.network}] ❌ Analysis failed for ${deployment.package_id}: ${errorMsg} (${durationSec}s)`);
    totalFailed++;

  } finally {
    // Always release resources
    currentlyAnalyzing--;
    analyzingPackages.delete(key);
  }
}

/**
 * Log only if enough time has passed (prevent spam)
 */
function throttledLog(message: string): void {
  const now = Date.now();
  if (now - lastLogTime > LOG_THROTTLE_MS) {
    console.log(`🤖 ${message}`);
    lastLogTime = now;
  }
}
