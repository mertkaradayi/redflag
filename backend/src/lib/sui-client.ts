import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64, fromHex } from '@mysten/sui/utils';
import { envFlag } from './env-utils';

// TypeScript types for Sui contract deployments
export interface ContractDeployment {
  packageId: string;
  deployer: string;
  txDigest: string;
  timestamp: number;
  checkpoint: number;
}

/**
 * Result type for Sui RPC connection tests
 */
export interface SuiClientResult {
  success: boolean;
  message: string;
  error?: string;
  disabled?: boolean;
  connectionInfo?: {
    url: string;
    hasRpcUrl: boolean;
  };
}

/**
 * Initialize Sui client for testnet
 * No private key needed for read-only operations (querying transactions, blocks, etc.)
 */
export function createSuiClient(): SuiClient {
  const rpcUrl = process.env.SUI_RPC_URL?.trim() || 'https://fullnode.testnet.sui.io:443';
  return new SuiClient({ url: rpcUrl });
}

/**
 * Get Sui keypair from environment (optional - only needed for sending transactions)
 */
export function getSuiKeypair(): Ed25519Keypair | null {
  const privateKey = process.env.SUI_PRIVATE_KEY;
  if (!privateKey) {
    return null;
  }
  
  try {
    const trimmed = privateKey.trim();
    const keyBytes = trimmed.startsWith('0x')
      ? fromHex(trimmed)
      : (() => {
          try {
            return fromB64(trimmed);
          } catch {
            return fromHex(`0x${trimmed}`);
          }
        })();

    return Ed25519Keypair.fromSecretKey(keyBytes);
  } catch (error) {
    console.warn('Invalid SUI_PRIVATE_KEY format:', error);
    return null;
  }
}

// ================================================================
// CHECKPOINT-BASED DEPLOYMENT MONITORING
// ================================================================

export interface CheckpointDeploymentResult {
  success: boolean;
  message: string;
  deployments: ContractDeployment[];
  lastProcessedCheckpoint: string;
  checkpointsProcessed: number;
  latestCheckpoint: string;
  error?: string;
}

/**
 * Checkpoint processing configuration
 *
 * Sui RPC limit: max 100 checkpoints per getCheckpoints call
 * Sui produces ~4 checkpoints/second, so with 15s polling:
 * - 60 checkpoints created between polls
 * - Processing 100 per poll keeps us ahead
 *
 * When behind, we can't fetch more per call, but we CAN poll more frequently
 * by returning faster (no sleep) when in catchup mode
 */
const MAX_CHECKPOINTS_PER_POLL = 100; // Sui RPC hard limit
const CATCHUP_THRESHOLD = 200; // Log catchup warning if gap > this

/**
 * Bootstrap: on first run, start from near-current (not historical)
 * This avoids hours of catch-up on fresh deployments
 */
const BOOTSTRAP_CHECKPOINT_OFFSET = 50;

/**
 * Log throttling: avoid spamming logs when persistently behind
 */
const gapWarningState = new Map<string, { lastWarned: number; lastGap: number }>();
const GAP_WARNING_INTERVAL_MS = 60_000; // Only warn once per minute per network

/**
 * Get package deployments by iterating through checkpoints sequentially
 * This approach works on all public Sui RPC nodes without filter support
 *
 * Features adaptive batching: processes more checkpoints when behind to catch up
 *
 * @param client - SuiClient instance
 * @param fromCheckpoint - Checkpoint sequence number to start from (exclusive)
 * @param maxCheckpoints - Maximum checkpoints to process per call (default: 100)
 * @param network - Network name for logging (optional)
 */
export async function getDeploymentsFromCheckpoints(options: {
  client: SuiClient;
  fromCheckpoint?: string | null;
  maxCheckpoints?: number;
  network?: string;
}): Promise<CheckpointDeploymentResult> {
  const { client, fromCheckpoint, network = 'unknown' } = options;
  const logPrefix = `[${network}]`;

  if (!envFlag('ENABLE_SUI_RPC', true)) {
    return {
      success: false,
      message: 'Sui RPC access disabled by configuration (ENABLE_SUI_RPC=false)',
      deployments: [],
      lastProcessedCheckpoint: fromCheckpoint || '0',
      checkpointsProcessed: 0,
      latestCheckpoint: '0',
      error: 'RPC_DISABLED'
    };
  }

  try {
    // Get the latest checkpoint sequence number
    const latestCheckpointSeq = await client.getLatestCheckpointSequenceNumber();
    const latestCheckpoint = latestCheckpointSeq.toString();

    // Determine starting checkpoint
    let startCheckpoint: bigint;
    if (fromCheckpoint) {
      // Start from the checkpoint after the last processed one
      startCheckpoint = BigInt(fromCheckpoint) + 1n;
    } else {
      // First run: bootstrap from near-current (avoid long catch-up)
      const bootstrapStart = BigInt(latestCheckpointSeq) - BigInt(BOOTSTRAP_CHECKPOINT_OFFSET);
      startCheckpoint = bootstrapStart > 0n ? bootstrapStart : 1n;
      console.info(`${logPrefix} First run: bootstrapping from checkpoint ${startCheckpoint} (${BOOTSTRAP_CHECKPOINT_OFFSET} behind current)`);
    }

    // If we're already at the latest, nothing to do
    if (startCheckpoint > BigInt(latestCheckpointSeq)) {
      return {
        success: true,
        message: 'Already at latest checkpoint',
        deployments: [],
        lastProcessedCheckpoint: fromCheckpoint || latestCheckpoint,
        checkpointsProcessed: 0,
        latestCheckpoint
      };
    }

    // Calculate gap (always process max allowed by RPC: 100)
    const gap = Number(BigInt(latestCheckpointSeq) - startCheckpoint) + 1;

    // Calculate end checkpoint (don't exceed latest or RPC limit of 100)
    const maxEndCheckpoint = startCheckpoint + BigInt(MAX_CHECKPOINTS_PER_POLL) - 1n;
    const endCheckpoint = maxEndCheckpoint > BigInt(latestCheckpointSeq)
      ? BigInt(latestCheckpointSeq)
      : maxEndCheckpoint;

    const checkpointsToProcess = Number(endCheckpoint - startCheckpoint) + 1;

    // Throttled gap warning: only log once per minute per network when significantly behind
    if (gap > CATCHUP_THRESHOLD) {
      const now = Date.now();
      const state = gapWarningState.get(network) || { lastWarned: 0, lastGap: 0 };
      const timeSinceLastWarn = now - state.lastWarned;

      // Log if: first time, been a minute, or gap changed significantly
      if (timeSinceLastWarn > GAP_WARNING_INTERVAL_MS || Math.abs(gap - state.lastGap) > 500) {
        const eta = Math.ceil(gap / MAX_CHECKPOINTS_PER_POLL); // polls needed to catch up
        console.warn(`${logPrefix} ${gap} checkpoints behind (processing ${checkpointsToProcess}, ~${eta} polls to catch up)`);
        gapWarningState.set(network, { lastWarned: now, lastGap: gap });
      }
    }

    // Fetch checkpoints in range
    const checkpoints = await client.getCheckpoints({
      cursor: (startCheckpoint - 1n).toString(), // cursor is exclusive
      limit: checkpointsToProcess,
      descendingOrder: false
    });

    if (!checkpoints.data || checkpoints.data.length === 0) {
      return {
        success: true,
        message: 'No checkpoints to process',
        deployments: [],
        lastProcessedCheckpoint: fromCheckpoint || latestCheckpoint,
        checkpointsProcessed: 0,
        latestCheckpoint
      };
    }

    // Collect all transaction digests from all checkpoints
    const allTxDigests: string[] = [];
    for (const checkpoint of checkpoints.data) {
      if (checkpoint.transactions && checkpoint.transactions.length > 0) {
        allTxDigests.push(...checkpoint.transactions);
      }
    }

    const deployments: ContractDeployment[] = [];
    const seenPackageIds = new Set<string>();

    if (allTxDigests.length > 0) {
      // Batch fetch transactions (max 50 per call per Sui API limits)
      const BATCH_SIZE = 50;
      for (let i = 0; i < allTxDigests.length; i += BATCH_SIZE) {
        const batch = allTxDigests.slice(i, i + BATCH_SIZE);

        let txBlocks;
        try {
          txBlocks = await client.multiGetTransactionBlocks({
            digests: batch,
            options: {
              showEffects: true,
              showObjectChanges: true,
              showInput: true,
              showBalanceChanges: false,
              showEvents: false,
              showRawInput: false,
              showRawEffects: false
            }
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          // Handle pruned transaction data gracefully
          if (errorMsg.includes('Could not find the referenced transaction') ||
              errorMsg.includes('effect is empty')) {
            console.warn(`${logPrefix} Some transactions in batch are pruned, skipping batch`);
            continue;
          }
          throw error;
        }

        // Filter for successful transactions with published packages
        for (const tx of txBlocks) {
          if (!tx || tx.effects?.status.status !== 'success') {
            continue;
          }

          if (!tx.objectChanges) {
            continue;
          }

          for (const change of tx.objectChanges) {
            if (change.type !== 'published' || !change.packageId) {
              continue;
            }

            // Deduplicate by packageId
            if (seenPackageIds.has(change.packageId)) {
              continue;
            }
            seenPackageIds.add(change.packageId);

            const timestamp = tx.timestampMs ? Number(tx.timestampMs) : 0;
            const checkpointNum = tx.checkpoint ? Number(tx.checkpoint) : 0;

            deployments.push({
              packageId: change.packageId,
              deployer: tx.transaction?.data.sender || 'unknown',
              txDigest: tx.digest,
              timestamp,
              checkpoint: checkpointNum
            });
          }
        }
      }
    }

    // Get the actual last processed checkpoint from the data
    const lastProcessedCheckpoint = checkpoints.data.length > 0
      ? checkpoints.data[checkpoints.data.length - 1].sequenceNumber
      : fromCheckpoint || latestCheckpoint;

    // Sort deployments by timestamp descending
    deployments.sort((a, b) => b.timestamp - a.timestamp || b.checkpoint - a.checkpoint);

    return {
      success: true,
      message: deployments.length > 0
        ? `Found ${deployments.length} deployment(s) in ${checkpoints.data.length} checkpoint(s)`
        : `Processed ${checkpoints.data.length} checkpoint(s), no new deployments`,
      deployments,
      lastProcessedCheckpoint,
      checkpointsProcessed: checkpoints.data.length,
      latestCheckpoint
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${logPrefix} Error fetching deployments:`, error);
    return {
      success: false,
      message: `Failed to fetch deployments from checkpoints: ${errorMessage}`,
      deployments: [],
      lastProcessedCheckpoint: fromCheckpoint || '0',
      checkpointsProcessed: 0,
      latestCheckpoint: '0',
      error: errorMessage
    };
  }
}

/**
 * Test Sui RPC connection
 */
export async function testSuiConnection(): Promise<SuiClientResult> {
  const rpcUrl = process.env.SUI_RPC_URL?.trim();
  const hasRpcUrl = Boolean(rpcUrl);

  if (!envFlag('ENABLE_SUI_RPC', true)) {
    return {
      success: false,
      message: 'Sui RPC access disabled by configuration (ENABLE_SUI_RPC=false)',
      disabled: true,
      connectionInfo: {
        url: rpcUrl ?? 'not set',
        hasRpcUrl
      }
    };
  }

  if (!rpcUrl) {
    return {
      success: false,
      message: 'SUI_RPC_URL not found in environment variables',
      connectionInfo: {
        url: 'not set',
        hasRpcUrl
      }
    };
  }

  try {
    const client = createSuiClient();
    
    // Test connection by getting latest checkpoint
    const checkpoint = await client.getLatestCheckpointSequenceNumber();
    
    return {
      success: true,
      message: `Sui RPC connection successful. Latest checkpoint: ${checkpoint}`,
      connectionInfo: {
        url: rpcUrl,
        hasRpcUrl: true
      }
    };

  } catch (error) {
    return {
      success: false,
      message: `Failed to connect to Sui RPC: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
      connectionInfo: {
        url: rpcUrl,
        hasRpcUrl: true
      }
    };
  }
}
