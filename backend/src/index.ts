import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { testSupabaseConnection, getDeployments, getDeploymentStats, getAnalysisResult, getRecentAnalyses, getHighRiskAnalyses, getRiskLevelCounts, getDeploymentByPackageId, getAllMonitorCheckpoints, resetMonitorCheckpoint } from './lib/supabase';
import { testSuiConnection } from './lib/sui-client';
import { startMonitoring, stopMonitoring, getMonitoringStatus } from './workers/sui-monitor';
import { startHistoricalMonitoring, stopHistoricalMonitoring, getHistoricalMonitoringStatus } from './workers/historical-monitor';
import { startAnalysisWorker, stopAnalysisWorker, getAnalysisWorkerStatus } from './workers/analysis-worker';
import { runFullAnalysisChain, getAnalysis } from './lib/llm-analyzer';
import { SuiClient } from '@mysten/sui/client';
import { envFlag } from './lib/env-utils';
import { validatePaginationParams } from './lib/query-utils';

/**
 * Determine network from environment variables
 */
function getNetwork(): 'mainnet' | 'testnet' {
  const networkEnv = process.env.SUI_NETWORK?.toLowerCase();
  if (networkEnv === 'mainnet' || networkEnv === 'testnet') {
    return networkEnv;
  }
  
  // Fallback to checking RPC URL
  const rpcUrl = process.env.SUI_RPC_URL?.toLowerCase() || '';
  return rpcUrl.includes('testnet') ? 'testnet' : 'mainnet';
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'https://redflag-liart.vercel.app'
];

// Add custom frontend URL from environment if provided
if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_KEY;
  const hasSuiRpcUrl = !!process.env.SUI_RPC_URL;
  const suiEnabled = envFlag('ENABLE_SUI_RPC', true);
  
  // Test Sui RPC connection
  let suiStatus = hasSuiRpcUrl ? 'configured' : 'missing url';
  if (!suiEnabled) {
    suiStatus = 'disabled';
  } else if (hasSuiRpcUrl) {
    try {
      const suiResult = await testSuiConnection();
      if (suiResult.disabled) {
        suiStatus = 'disabled';
      } else {
        suiStatus = suiResult.success ? 'connected' : 'connection failed';
      }
    } catch (error) {
      suiStatus = 'connection error';
    }
  }
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'redflag-backend',
    integrations: {
      supabase: {
        configured: hasSupabaseKey,
        status: hasSupabaseKey ? 'ready' : 'missing key'
      },
      sui: {
        configured: hasSuiRpcUrl,
        enabled: suiEnabled,
        status: suiStatus
      }
    }
  });
});

// Basic API endpoint
app.get('/api/status', (req, res) => {
  res.json({
    message: 'RedFlag Backend API is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Supabase health check endpoint
app.get('/api/supabase/health', async (req, res) => {
  try {
    const result = await testSupabaseConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Supabase health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Sui contract deployments endpoint (database-backed)
// Data is kept in sync by the checkpoint-based background monitor
app.get('/api/sui/recent-deployments', async (req, res) => {
  try {
    const limitParam = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const offsetParam = Array.isArray(req.query.offset) ? req.query.offset[0] : req.query.offset;
    const networkParam = Array.isArray(req.query.network) ? req.query.network[0] : req.query.network;

    const parsedLimit = typeof limitParam === 'string' ? Number.parseInt(limitParam, 10) : Number.NaN;
    const parsedOffset = typeof offsetParam === 'string' ? Number.parseInt(offsetParam, 10) : Number.NaN;

    const limit = Number.isNaN(parsedLimit) ? 50 : Math.min(parsedLimit, 100);
    const offset = Number.isNaN(parsedOffset) ? 0 : parsedOffset;
    const network = (networkParam === 'mainnet' || networkParam === 'testnet') ? networkParam : null;

    // Query from database instead of RPC
    const result = await getDeployments({ limit, offset, network });

    if (result.success) {
      // Transform database rows to match expected API format
      const deployments = result.deployments.map(d => ({
        packageId: d.package_id,
        deployer: d.deployer_address,
        txDigest: d.tx_digest,
        timestamp: new Date(d.timestamp).getTime(),
        checkpoint: d.checkpoint,
        network: d.network
      }));

      res.json({
        success: true,
        message: `Found ${deployments.length} deployment(s) from database`,
        timestamp: new Date().toISOString(),
        deployments,
        totalDeployments: result.totalCount,
        network: network || 'all',
        pagination: {
          limit,
          offset,
          hasMore: offset + deployments.length < result.totalCount
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to fetch deployments from database',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Sui deployments query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Latest deployment endpoint (database-backed)
app.get('/api/sui/latest-deployment', async (req, res) => {
  try {
    const networkParam = Array.isArray(req.query.network) ? req.query.network[0] : req.query.network;
    const network = (networkParam === 'mainnet' || networkParam === 'testnet') ? networkParam : null;

    // Query latest deployment from database
    const result = await getDeployments({ limit: 1, offset: 0, network });

    if (result.success) {
      const latestDeployment = result.deployments.length > 0
        ? {
            packageId: result.deployments[0].package_id,
            deployer: result.deployments[0].deployer_address,
            txDigest: result.deployments[0].tx_digest,
            timestamp: new Date(result.deployments[0].timestamp).getTime(),
            checkpoint: result.deployments[0].checkpoint,
            network: result.deployments[0].network
          }
        : null;

      res.json({
        success: true,
        message: latestDeployment
          ? 'Latest deployment retrieved successfully'
          : 'No deployments found',
        timestamp: new Date().toISOString(),
        deployment: latestDeployment,
        network: network || 'all'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to fetch latest deployment from database',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Latest deployment query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Sui RPC health check endpoint
app.get('/api/sui/health', async (req, res) => {
  try {
    const result = await testSuiConnection();
    
    if (result.disabled) {
      return res.status(503).json({
        success: false,
        message: result.message,
        disabled: true,
        timestamp: new Date().toISOString(),
        connectionInfo: result.connectionInfo
      });
    }

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
        connectionInfo: result.connectionInfo
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
        timestamp: new Date().toISOString(),
        connectionInfo: result.connectionInfo,
        disabled: result.disabled ?? false
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Sui health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Deployment statistics endpoint - calculates stats from all database records
app.get('/api/sui/deployment-stats', async (req, res) => {
  try {
    const networkParam = Array.isArray(req.query.network) ? req.query.network[0] : req.query.network;
    const network = networkParam === 'mainnet' ? 'mainnet'
      : networkParam === 'testnet' ? 'testnet'
      : null; // null means "all networks"

    const result = await getDeploymentStats({ network });

    if (result.success) {
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        network: network || 'all',
        total: result.total,
        last24h: result.last24h,
        previous24h: result.previous24h,
        last24hDelta: result.last24h - result.previous24h,
        latestCheckpoint: result.latestCheckpoint
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to retrieve deployment stats',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Stats query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Historical deployments endpoint - reads from database
app.get('/api/sui/deployments', async (req, res) => {
  try {
    const limitParam = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const offsetParam = Array.isArray(req.query.offset) ? req.query.offset[0] : req.query.offset;
    const networkParam = Array.isArray(req.query.network) ? req.query.network[0] : req.query.network;

    const parsedLimit = typeof limitParam === 'string' ? Number.parseInt(limitParam, 10) : Number.NaN;
    const parsedOffset = typeof offsetParam === 'string' ? Number.parseInt(offsetParam, 10) : Number.NaN;

    const limit = Number.isNaN(parsedLimit) ? undefined : Math.min(Math.max(parsedLimit, 1), 100); // Cap at 100
    const offset = Number.isNaN(parsedOffset) ? undefined : Math.max(parsedOffset, 0);
    const network = networkParam === 'mainnet' ? 'mainnet'
      : networkParam === 'testnet' ? 'testnet'
      : null; // null means "all networks"

    const result = await getDeployments({ limit, offset, network });

    if (result.success) {
      res.json({
        success: true,
        message: `Retrieved ${result.deployments.length} deployments`,
        timestamp: new Date().toISOString(),
        deployments: result.deployments,
        totalCount: result.totalCount,
        limit: limit || 50,
        offset: offset || 0,
        network: network || 'all'
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to retrieve deployments',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Deployments query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Monitor status endpoint
app.get('/api/sui/monitor-status', async (req, res) => {
  const status = getMonitoringStatus();
  const checkpointsResult = await getAllMonitorCheckpoints();

  res.json({
    success: true,
    message: 'Monitor status retrieved',
    timestamp: new Date().toISOString(),
    monitor: {
      ...status,
      enabled: envFlag('ENABLE_AUTO_ANALYSIS', true),
      checkpoints: checkpointsResult.success ? checkpointsResult.checkpoints : []
    }
  });
});

// Analysis worker status endpoint
app.get('/api/analysis/worker-status', (req, res) => {
  const status = getAnalysisWorkerStatus();
  res.json({
    success: true,
    message: 'Analysis worker status retrieved',
    timestamp: new Date().toISOString(),
    worker: status
  });
});

// Historical monitor status endpoint
app.get('/api/historical/monitor-status', (req, res) => {
  const status = getHistoricalMonitoringStatus();
  res.json({
    success: true,
    message: 'Historical monitor status retrieved',
    timestamp: new Date().toISOString(),
    historical: status
  });
});

// Debug endpoint to see what transactions we're getting
app.get('/api/sui/debug', async (req, res) => {
  try {
    if (!envFlag('ENABLE_SUI_RPC', true)) {
      return res.status(503).json({
        success: false,
        message: 'Sui RPC access disabled by configuration (ENABLE_SUI_RPC=false)',
        disabled: true,
        timestamp: new Date().toISOString()
      });
    }

    const { SuiClient } = await import('@mysten/sui/client');
    const client = new SuiClient({ url: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443' });
    
    const txs = await client.queryTransactionBlocks({
      options: {
        showEffects: true,
        showObjectChanges: true,
        showInput: true
      },
      limit: 10
    });
    
    const debugInfo = {
      totalTransactions: txs.data.length,
      transactions: txs.data.map(tx => ({
        digest: tx.digest,
        timestamp: tx.timestampMs,
        objectChanges: tx.objectChanges?.map(change => ({
          type: change.type,
          packageId: change.type === 'published' ? change.packageId : undefined
        })) || []
      }))
    };
    
    res.json({
      success: true,
      message: 'Debug info retrieved',
      timestamp: new Date().toISOString(),
      debug: debugInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    });
  }
});

// ----------------------------------------------------------------
// LLM CONTRACT ANALYSIS ENDPOINTS
// ----------------------------------------------------------------

// Analyze a specific contract package
app.post('/api/llm/analyze', async (req, res) => {
  try {
    const { package_id, network } = req.body;
    
    // Validate required parameters
    if (!package_id) {
      return res.status(400).json({
        success: false,
        message: 'package_id is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate network parameter
    const validatedNetwork = (network === 'testnet') ? 'testnet' : 'mainnet';

    if (!envFlag('ENABLE_SUI_RPC', true)) {
      return res.status(503).json({
        success: false,
        message: 'Sui RPC access disabled by configuration (ENABLE_SUI_RPC=false)',
        timestamp: new Date().toISOString(),
        package_id,
        network: validatedNetwork,
        disabled: true
      });
    }
    
    console.log(`[LLM] Analyzing package_id: ${package_id} on ${validatedNetwork}`);
    
    // Define RPC URL based on network
    const rpcUrl = validatedNetwork === 'testnet' 
      ? 'https://fullnode.testnet.sui.io:443' 
      : 'https://fullnode.mainnet.sui.io:443';
    console.log(`[LLM] Using RPC URL: ${rpcUrl}`);
    
    // Create Sui client for this request
    const suiClient = new SuiClient({ url: rpcUrl });

    // Check for force parameter to bypass cache
    const force = req.body.force === true || req.body.force === 'true';

    if (!force) {
      // Check database first with 24-hour TTL (only if not forcing fresh analysis)
      const dbResult = await getAnalysisResult(package_id, validatedNetwork, 24);
      if (dbResult.success && dbResult.analysis) {
        console.log(`[LLM] Database hit! Returning stored result for ${package_id}`);
        return res.status(200).json({
          success: true,
          message: `Analysis successful (from cache - ${validatedNetwork})`,
          timestamp: new Date().toISOString(),
          package_id,
          network: validatedNetwork,
          safetyCard: dbResult.analysis,
          cached: true,
          analyzedAt: dbResult.analyzedAt
        });
      } else if (dbResult.stale) {
        console.log(`[LLM] Cached result is stale (>24h old) - running fresh analysis`);
      }
    } else {
      console.log(`[LLM] Force parameter set - bypassing cache for ${package_id}`);
    }

    // Run full analysis chain (will save to database or save as failed)
    console.log(`[LLM] Running full analysis chain for ${package_id}...`);

    try {
      const finalSafetyCard = await runFullAnalysisChain(package_id, validatedNetwork, suiClient, force);

      return res.status(200).json({
        success: true,
        message: `Analysis successful (${validatedNetwork})`,
        timestamp: new Date().toISOString(),
        package_id,
        network: validatedNetwork,
        safetyCard: finalSafetyCard,
        cached: false
      });

    } catch (analysisError) {
      // Analysis failed and was saved as 'failed' status in DB
      const errorMsg = analysisError instanceof Error ? analysisError.message : 'Unknown error';

      console.error('[LLM] Analysis failed and saved as failed status');

      return res.status(400).json({
        success: false,
        message: `Analysis failed: ${errorMsg}`,
        timestamp: new Date().toISOString(),
        package_id,
        network: validatedNetwork,
        error: errorMsg,
        failureType: 'analysis_error',
        statusSaved: 'failed' // Indicates we saved it as failed in DB
      });
    }

  } catch (error) {
    // System error (not analysis error)
    console.error('[LLM] System error:', error);
    return res.status(500).json({
      success: false,
      message: 'System error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      failureType: 'system_error'
    });
  }
});

// Get analysis result from database
app.get('/api/llm/analyze/:packageId', async (req, res) => {
  try {
    const { packageId } = req.params;
    const { network = 'mainnet' } = req.query;
    
    const validatedNetwork = (network === 'testnet') ? 'testnet' : 'mainnet';
    const dbResult = await getAnalysisResult(packageId, validatedNetwork);
    
    if (dbResult.success && dbResult.analysis) {
      return res.status(200).json({
        success: true,
        message: 'Analysis found in database',
        timestamp: new Date().toISOString(),
        package_id: packageId,
        network: validatedNetwork,
        safetyCard: dbResult.analysis
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'No analysis found for this package',
        timestamp: new Date().toISOString(),
        package_id: packageId,
        network: validatedNetwork
      });
    }
  } catch (error) {
    console.error('[LLM] Database lookup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database lookup failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Get recent analyses from database
app.get('/api/llm/recent-analyses', async (req, res) => {
  try {
    const limitParam = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const offsetParam = Array.isArray(req.query.offset) ? req.query.offset[0] : req.query.offset;
    const networkParam = Array.isArray(req.query.network) ? req.query.network[0] : req.query.network;

    const parsedLimit = typeof limitParam === 'string' ? Number.parseInt(limitParam, 10) : Number.NaN;
    const parsedOffset = typeof offsetParam === 'string' ? Number.parseInt(offsetParam, 10) : Number.NaN;

    const limit = Number.isNaN(parsedLimit) ? undefined : Math.min(Math.max(parsedLimit, 1), 100);
    const offset = Number.isNaN(parsedOffset) ? undefined : Math.max(parsedOffset, 0);
    const network = networkParam === 'mainnet' ? 'mainnet'
      : networkParam === 'testnet' ? 'testnet'
      : null; // null means "all networks"

    const result = await getRecentAnalyses({ limit, offset, network });

    if (result.success) {
      res.json({
        success: true,
        message: `Retrieved ${result.analyses.length} analyses`,
        timestamp: new Date().toISOString(),
        network: network || 'all',
        analyses: result.analyses,
        totalCount: result.totalCount,
        limit: limit || 50,
        offset: offset || 0
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to retrieve analyses',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get recent analyses',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Get high-risk analyses from database
app.get('/api/llm/high-risk', async (req, res) => {
  try {
    const limitParam = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const networkParam = Array.isArray(req.query.network) ? req.query.network[0] : req.query.network;

    const parsedLimit = typeof limitParam === 'string' ? Number.parseInt(limitParam, 10) : Number.NaN;
    const limit = Number.isNaN(parsedLimit) ? undefined : Math.min(Math.max(parsedLimit, 1), 100);
    const network = networkParam === 'mainnet' ? 'mainnet'
      : networkParam === 'testnet' ? 'testnet'
      : null; // null means "all networks"

    const result = await getHighRiskAnalyses({ limit, network });

    if (result.success) {
      res.json({
        success: true,
        message: `Retrieved ${result.analyses.length} high-risk analyses`,
        timestamp: new Date().toISOString(),
        network: network || 'all',
        analyses: result.analyses
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to retrieve high-risk analyses',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get high-risk analyses',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// LLM health check
app.get('/api/llm/health', async (req, res) => {
  const hasGoogleApiKey = !!process.env.GOOGLE_API_KEY;
  
  // Get database stats
  const dbStats = await getRecentAnalyses({ limit: 1 });
  
  res.json({
    success: true,
    message: 'LLM service status',
    timestamp: new Date().toISOString(),
    llm: {
      configured: hasGoogleApiKey,
      status: hasGoogleApiKey ? 'ready' : 'missing GOOGLE_API_KEY',
      database_analyses: dbStats.totalCount || 0
    }
  });
});

// Get All Analyzed Contracts (alias for recent-analyses)
app.get('/api/llm/analyzed-contracts', async (req, res) => {
  try {
    // Validate and parse query parameters
    const validation = validatePaginationParams(
      req.query.limit,
      req.query.offset,
      req.query.packageId,
      req.query.riskLevels
    );

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error,
        timestamp: new Date().toISOString()
      });
    }

    const { limit, offset, packageId, riskLevels } = validation.params;

    // Parse network parameter
    const networkParam = Array.isArray(req.query.network)
      ? req.query.network[0]
      : req.query.network;
    const network = networkParam === 'mainnet' ? 'mainnet'
      : networkParam === 'testnet' ? 'testnet'
      : null; // null means "all networks"

    // Parse deployedAfter parameter (ISO 8601 timestamp filter)
    const deployedAfterParam = Array.isArray(req.query.deployedAfter)
      ? req.query.deployedAfter[0]
      : req.query.deployedAfter;
    const deployedAfter = typeof deployedAfterParam === 'string' && deployedAfterParam.trim()
      ? deployedAfterParam.trim()
      : null;

    const result = await getRecentAnalyses({ limit, offset, packageId, riskLevels, network, deployedAfter });

    if (result.success) {
      const contracts = result.analyses.map(analysis => ({
        package_id: analysis.package_id,
        network: analysis.network,
        analysis: {
          summary: analysis.summary,
          risky_functions: analysis.risky_functions,
          rug_pull_indicators: analysis.rug_pull_indicators,
          impact_on_user: analysis.impact_on_user,
          why_risky_one_liner: analysis.why_risky_one_liner,
          risk_score: analysis.risk_score,
          risk_level: analysis.risk_level
        },
        analyzed_at: analysis.analyzed_at,
        // Include deployment metadata from JOIN
        deployment: analysis.sui_package_deployments ? {
          timestamp: analysis.sui_package_deployments.timestamp,
          deployer_address: analysis.sui_package_deployments.deployer_address,
          tx_digest: analysis.sui_package_deployments.tx_digest,
          checkpoint: analysis.sui_package_deployments.checkpoint
        } : null
      }));

      const riskCountsResult = await getRiskLevelCounts({ packageId, network });
      const riskCounts = riskCountsResult.success ? riskCountsResult.counts : undefined;

      // Always fetch the most recent analysis timestamp regardless of pagination offset
      const mostRecentResult = await getRecentAnalyses({ limit: 1, offset: 0, packageId, riskLevels, network, deployedAfter });
      const lastAnalyzed = mostRecentResult.success && mostRecentResult.analyses.length > 0
        ? mostRecentResult.analyses[0].analyzed_at
        : null;

      res.json({
        success: true,
        message: 'Analyzed contracts retrieved successfully',
        timestamp: new Date().toISOString(),
        total: result.totalCount,
        limit,
        offset,
        network: network || 'all',
        contracts,
        risk_counts: riskCounts,
        last_updated: lastAnalyzed
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to retrieve analyzed contracts',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Failed to get analyzed contracts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analyzed contracts',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Get package status (deployment + analysis)
app.get('/api/llm/package-status/:packageId', async (req, res) => {
  try {
    const { packageId } = req.params;
    const networkParam = Array.isArray(req.query.network) ? req.query.network[0] : req.query.network;
    const normalizedNetwork = typeof networkParam === 'string' ? networkParam.toLowerCase() : undefined;
    const network = normalizedNetwork === 'testnet' ? 'testnet' : normalizedNetwork === 'mainnet' ? 'mainnet' : getNetwork();

    if (!packageId) {
      return res.status(400).json({
        success: false,
        message: 'packageId is required',
        timestamp: new Date().toISOString()
      });
    }

    // Fetch deployment info (with network filter to handle composite primary key)
    const deploymentResult = await getDeploymentByPackageId(packageId, network);
    
    // Fetch analysis info
    const analysisResult = await getAnalysisResult(packageId, network);

    if (!deploymentResult.success) {
      return res.status(500).json({
        success: false,
        message: deploymentResult.error || 'Failed to fetch deployment',
        timestamp: new Date().toISOString()
      });
    }

    if (!analysisResult.success) {
      return res.status(500).json({
        success: false,
        message: analysisResult.error || 'Failed to fetch analysis',
        timestamp: new Date().toISOString()
      });
    }

    // Determine status
    let status: 'analyzed' | 'not_analyzed' | 'not_found';
    if (!deploymentResult.deployment) {
      status = 'not_found';
    } else if (analysisResult.analysis) {
      status = 'analyzed';
    } else {
      status = 'not_analyzed';
    }

    res.json({
      success: true,
      package_id: packageId,
      deployment: deploymentResult.deployment,
      analysis: analysisResult.analysis ? {
        summary: analysisResult.analysis.summary,
        risky_functions: analysisResult.analysis.risky_functions,
        rug_pull_indicators: analysisResult.analysis.rug_pull_indicators,
        impact_on_user: analysisResult.analysis.impact_on_user,
        why_risky_one_liner: analysisResult.analysis.why_risky_one_liner,
        risk_score: analysisResult.analysis.risk_score,
        risk_level: analysisResult.analysis.risk_level
      } : null,
      analyzed_at: analysisResult.analyzedAt,
      status,
      network,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to get package status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get package status',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Admin endpoint to manually reset monitor checkpoint
// Useful for recovering from stuck monitors or forcing fresh start
app.post('/api/admin/reset-checkpoint', async (req, res) => {
  try {
    const { network } = req.body;

    if (!network || !['mainnet', 'testnet'].includes(network)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid network. Must be "mainnet" or "testnet"',
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[Admin] Manual checkpoint reset requested for ${network}`);

    const result = await resetMonitorCheckpoint(network);

    if (result.success) {
      res.json({
        success: true,
        message: `Checkpoint reset for ${network}. Monitor will bootstrap fresh on next poll.`,
        network,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || 'Failed to reset checkpoint',
        network,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Failed to reset checkpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset checkpoint',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 RedFlag Backend running on port ${PORT} - Dashboard Ready!`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API status: http://localhost:${PORT}/api/status`);
  console.log(`🗄️ Supabase health: http://localhost:${PORT}/api/supabase/health`);
  console.log(`🔗 Sui health: http://localhost:${PORT}/api/sui/health`);
  console.log(`📦 Sui deployments: http://localhost:${PORT}/api/sui/recent-deployments`);
  console.log(`🆕 Latest deployment: http://localhost:${PORT}/api/sui/latest-deployment`);
  console.log(`📚 Historical deployments: http://localhost:${PORT}/api/sui/deployments`);
  console.log(`📊 Monitor status: http://localhost:${PORT}/api/sui/monitor-status`);

  // Start the Sui monitoring system (live + historical + analysis)
  const autoAnalysisEnabled = envFlag('ENABLE_AUTO_ANALYSIS', true);
  const suiRpcEnabled = envFlag('ENABLE_SUI_RPC', true);

  if (autoAnalysisEnabled && suiRpcEnabled) {
    try {
      // Start live checkpoint monitor (real-time tracking)
      console.log('🚀 Starting LIVE monitor (real-time deployments)...');
      await startMonitoring();

      // Start historical backfill monitor (background catch-up)
      console.log('📚 Starting HISTORICAL monitor (backfill old deployments)...');
      await startHistoricalMonitoring();

      // Start analysis worker (processes both live and historical deployments)
      startAnalysisWorker();

    } catch (error) {
      console.error('❌ Failed to start monitoring services:', error);
    }
  } else {
    const reasons: string[] = [];
    if (!autoAnalysisEnabled) {
      reasons.push('ENABLE_AUTO_ANALYSIS=false');
    }
    if (!suiRpcEnabled) {
      reasons.push('ENABLE_SUI_RPC=false');
    }
    console.log(`⚠️ Monitoring services not started (${reasons.join(', ') || 'no reason provided'})`);
  }
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  stopMonitoring();
  stopHistoricalMonitoring();
  stopAnalysisWorker();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  stopMonitoring();
  stopHistoricalMonitoring();
  stopAnalysisWorker();
  process.exit(0);
});

export default app;
