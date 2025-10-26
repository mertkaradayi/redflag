import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64, fromHex } from '@mysten/sui/utils';

// TypeScript types for Sui contract deployments
export interface ContractDeployment {
  packageId: string;
  deployer: string;
  txDigest: string;
  timestamp: number;
  checkpoint: number;
}

export interface SuiClientResult {
  success: boolean;
  message: string;
  deployments?: ContractDeployment[];
  error?: string;
  connectionInfo?: {
    url: string;
    hasRpcUrl: boolean;
  };
  latestCheckpoint?: number;
  nextCursor?: string | null;
  pollIntervalMs?: number;
}

export interface RecentPublishOptions {
  limit?: number;
  cursor?: string | null;
  afterCheckpoint?: number;
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

/**
 * Get recent package publish transactions from Sui
 * These represent new smart contract deployments
 */
export async function getRecentPublishTransactions({
  limit = 3,
  cursor: initialCursor = null,
  afterCheckpoint
}: RecentPublishOptions = {}): Promise<SuiClientResult> {
  try {
    const client = createSuiClient();
    const effectiveRpcUrl = process.env.SUI_RPC_URL?.trim() || 'https://fullnode.testnet.sui.io:443';
    const hasCustomRpcUrl = Boolean(process.env.SUI_RPC_URL);
    const parsedPollInterval = Number.parseInt(process.env.POLL_INTERVAL_MS ?? '', 10);
    const pollIntervalMs = Number.isFinite(parsedPollInterval) ? parsedPollInterval : 3000;
    const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 3;

    const deployments: ContractDeployment[] = [];
    const seenPackageIds = new Set<string>();
    const seenTransactionDigests = new Set<string>();
    let latestCheckpoint = 0;

    const pageSize = Math.min(Math.max(normalizedLimit * 2, 10), 50);
    let pageCount = 0;
    const MAX_PAGES = 200;

    const queryModes: Array<{ name: 'filtered' | 'unfiltered'; filter?: Parameters<typeof client.queryTransactionBlocks>[0]['filter'] }> = [
      {
        name: 'filtered',
        filter: {
          MoveFunction: {
            package: '0x2',
            module: 'package',
            function: 'publish'
          }
        }
      },
      { name: 'unfiltered' }
    ];

    let nextCursorValue: string | null = null;

    for (const mode of queryModes) {
      let cursor: string | null | undefined = initialCursor;
      let hasNextPage = true;

      while (deployments.length < normalizedLimit && hasNextPage && pageCount < MAX_PAGES) {
        const page = await client.queryTransactionBlocks({
          filter: mode.filter,
          options: {
            showEffects: true,
            showObjectChanges: true,
            showInput: true,
            showBalanceChanges: false,
            showEvents: false,
            showRawInput: false,
            showRawEffects: false
          },
          cursor: cursor ?? undefined,
          order: 'descending',
          limit: pageSize
        });

        pageCount += 1;

        if (!page.data.length) {
          hasNextPage = false;
          break;
        }

        for (const tx of page.data) {
          const checkpointValue = tx.checkpoint ? Number(tx.checkpoint) : 0;
          if (!Number.isNaN(checkpointValue)) {
            latestCheckpoint = Math.max(latestCheckpoint, checkpointValue);
          }

          if (typeof afterCheckpoint === 'number' && checkpointValue <= afterCheckpoint) {
            continue;
          }

          if (tx.effects?.status.status !== 'success') {
            continue;
          }

          if (!tx.objectChanges?.length) {
            continue;
          }

          for (const change of tx.objectChanges) {
            if (change.type !== 'published' || !change.packageId) {
              continue;
            }

            if (seenPackageIds.has(change.packageId) || seenTransactionDigests.has(tx.digest)) {
              continue;
            }

            seenPackageIds.add(change.packageId);
            seenTransactionDigests.add(tx.digest);

            const timestamp = tx.timestampMs ? Number(tx.timestampMs) : 0;

            deployments.push({
              packageId: change.packageId,
              deployer: tx.transaction?.data.sender || 'unknown',
              txDigest: tx.digest,
              timestamp,
              checkpoint: checkpointValue
            });

            if (deployments.length >= normalizedLimit) {
              nextCursorValue = cursor ?? null;
              break;
            }
          }

          if (deployments.length >= normalizedLimit) {
            nextCursorValue = cursor ?? null;
            break;
          }
        }

        if (!page.hasNextPage || !page.nextCursor) {
          hasNextPage = false;
          cursor = null;
        } else {
          cursor = page.nextCursor;
        }
      }

      if (deployments.length >= normalizedLimit) {
        break;
      }
    }

    deployments.sort((a, b) => b.timestamp - a.timestamp || b.checkpoint - a.checkpoint);
    const limitedDeployments = deployments.slice(0, normalizedLimit);

    return {
      success: true,
      message: limitedDeployments.length
        ? `Found ${limitedDeployments.length} recent contract deployments after inspecting ${pageCount} page(s)`
        : `No recent contract deployments found after inspecting ${pageCount} page(s)` ,
      deployments: limitedDeployments,
      connectionInfo: {
        url: effectiveRpcUrl,
        hasRpcUrl: hasCustomRpcUrl
      },
      latestCheckpoint,
      nextCursor: deployments.length >= normalizedLimit ? nextCursorValue : null,
      pollIntervalMs
    };

  } catch (error) {
    const effectiveRpcUrl = process.env.SUI_RPC_URL?.trim() || 'https://fullnode.testnet.sui.io:443';
    const hasCustomRpcUrl = Boolean(process.env.SUI_RPC_URL);
    const parsedPollInterval = Number.parseInt(process.env.POLL_INTERVAL_MS ?? '', 10);
    const pollIntervalMs = Number.isFinite(parsedPollInterval) ? parsedPollInterval : 3000;

    return {
      success: false,
      message: `Failed to query Sui RPC: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error',
      connectionInfo: {
        url: effectiveRpcUrl,
        hasRpcUrl: hasCustomRpcUrl
      },
      latestCheckpoint: undefined,
      nextCursor: null,
      pollIntervalMs
    };
  }
}

/**
 * Test Sui RPC connection
 */
export async function testSuiConnection(): Promise<SuiClientResult> {
  const rpcUrl = process.env.SUI_RPC_URL;
  
  if (!rpcUrl) {
    return {
      success: false,
      message: 'SUI_RPC_URL not found in environment variables',
      connectionInfo: {
        url: 'not set',
        hasRpcUrl: false
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
