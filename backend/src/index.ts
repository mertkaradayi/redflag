import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { testSupabaseConnection, getDeployments, getDeploymentStats, getAnalysisResult, getRecentAnalyses, getHighRiskAnalyses, getRiskLevelCounts, getDeploymentByPackageId } from './lib/supabase';
import { getRecentPublishTransactions, testSuiConnection } from './lib/sui-client';
import { startMonitoring, stopMonitoring, getMonitoringStatus } from './workers/sui-monitor';
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

// Sui contract deployments endpoint
app.get('/api/sui/recent-deployments', async (req, res) => {
  try {
    const limitParam = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const cursorParam = Array.isArray(req.query.cursor) ? req.query.cursor[0] : req.query.cursor;
    const checkpointParam = Array.isArray(req.query.afterCheckpoint)
      ? req.query.afterCheckpoint[0]
      : req.query.afterCheckpoint;

    const parsedLimit = typeof limitParam === 'string' ? Number.parseInt(limitParam, 10) : Number.NaN;
    const parsedCheckpoint = typeof checkpointParam === 'string' ? Number.parseInt(checkpointParam, 10) : Number.NaN;
    const parsedCursor = typeof cursorParam === 'string' ? cursorParam : undefined;

    const limit = Number.isNaN(parsedLimit) ? undefined : parsedLimit;
    const afterCheckpoint = Number.isNaN(parsedCheckpoint) ? undefined : parsedCheckpoint;

    const result = await getRecentPublishTransactions({
      limit,
      cursor: parsedCursor ?? null,
      afterCheckpoint
    });

    if (result.disabled) {
      return res.status(503).json({
        success: false,
        message: result.message,
        disabled: true,
        timestamp: new Date().toISOString(),
        connectionInfo: result.connectionInfo,
        pollIntervalMs: result.pollIntervalMs,
        queryStrategy: result.queryStrategy ?? null
      });
    }

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString(),
        connectionInfo: result.connectionInfo,
        deployments: result.deployments || [],
        totalDeployments: result.deployments?.length || 0,
        latestCheckpoint: result.latestCheckpoint ?? null,
        nextCursor: result.nextCursor ?? null,
        pollIntervalMs: result.pollIntervalMs,
        queryStrategy: result.queryStrategy ?? null
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
        timestamp: new Date().toISOString(),
        connectionInfo: result.connectionInfo,
        latestCheckpoint: result.latestCheckpoint ?? null,
        nextCursor: result.nextCursor ?? null,
        pollIntervalMs: result.pollIntervalMs,
        queryStrategy: result.queryStrategy ?? null
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

app.get('/api/sui/latest-deployment', async (req, res) => {
  try {
    const result = await getRecentPublishTransactions({ limit: 1 });

    if (result.disabled) {
      return res.status(503).json({
        success: false,
        message: result.message,
        disabled: true,
        timestamp: new Date().toISOString(),
        connectionInfo: result.connectionInfo,
        latestCheckpoint: result.latestCheckpoint ?? null,
        nextCursor: result.nextCursor ?? null,
        pollIntervalMs: result.pollIntervalMs,
        queryStrategy: result.queryStrategy ?? null
      });
    }

    if (result.success) {
      const latestDeployment = result.deployments && result.deployments.length > 0
        ? result.deployments[0]
        : null;

      res.json({
        success: true,
        message: latestDeployment
          ? 'Latest deployment retrieved successfully'
          : 'No deployments found',
        timestamp: new Date().toISOString(),
        connectionInfo: result.connectionInfo,
        deployment: latestDeployment,
        latestCheckpoint: result.latestCheckpoint ?? null,
        nextCursor: result.nextCursor ?? null,
        pollIntervalMs: result.pollIntervalMs,
        queryStrategy: result.queryStrategy ?? null
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error,
        timestamp: new Date().toISOString(),
        connectionInfo: result.connectionInfo,
        latestCheckpoint: result.latestCheckpoint ?? null,
        nextCursor: result.nextCursor ?? null,
        pollIntervalMs: result.pollIntervalMs,
        queryStrategy: result.queryStrategy ?? null
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
    const result = await getDeploymentStats();

    if (result.success) {
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
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

    const parsedLimit = typeof limitParam === 'string' ? Number.parseInt(limitParam, 10) : Number.NaN;
    const parsedOffset = typeof offsetParam === 'string' ? Number.parseInt(offsetParam, 10) : Number.NaN;

    const limit = Number.isNaN(parsedLimit) ? undefined : Math.min(Math.max(parsedLimit, 1), 100); // Cap at 100
    const offset = Number.isNaN(parsedOffset) ? undefined : Math.max(parsedOffset, 0);

    const result = await getDeployments({ limit, offset });

    if (result.success) {
      const network = getNetwork();
      res.json({
        success: true,
        message: `Retrieved ${result.deployments.length} deployments`,
        timestamp: new Date().toISOString(),
        deployments: result.deployments,
        totalCount: result.totalCount,
        limit: limit || 50,
        offset: offset || 0,
        network
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
app.get('/api/sui/monitor-status', (req, res) => {
  const status = getMonitoringStatus();
  res.json({
    success: true,
    message: 'Monitor status retrieved',
    timestamp: new Date().toISOString(),
    monitor: {
      ...status,
      enabled: envFlag('ENABLE_AUTO_ANALYSIS', true)
    }
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
    
    // Check database first
    const dbResult = await getAnalysisResult(package_id, validatedNetwork);
    if (dbResult.success && dbResult.analysis) {
      console.log(`[LLM] Database hit! Returning stored result for ${package_id}`);
      return res.status(200).json({
        success: true,
        message: `Analysis successful (from database - ${validatedNetwork})`,
        timestamp: new Date().toISOString(),
        package_id,
        network: validatedNetwork,
        safetyCard: dbResult.analysis
      });
    }
    
    // Run full analysis chain (will save to database)
    console.log(`[LLM] Running full analysis chain for ${package_id}...`);
    const finalSafetyCard = await runFullAnalysisChain(package_id, validatedNetwork, suiClient);
    
    return res.status(200).json({
      success: true,
      message: `Analysis successful (${validatedNetwork})`,
      timestamp: new Date().toISOString(),
      package_id,
      network: validatedNetwork,
      safetyCard: finalSafetyCard
    });
    
  } catch (error) {
    console.error('[LLM] Analysis error:', error);
    return res.status(500).json({
      success: false,
      message: 'Contract analysis failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
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

    const parsedLimit = typeof limitParam === 'string' ? Number.parseInt(limitParam, 10) : Number.NaN;
    const parsedOffset = typeof offsetParam === 'string' ? Number.parseInt(offsetParam, 10) : Number.NaN;

    const limit = Number.isNaN(parsedLimit) ? undefined : Math.min(Math.max(parsedLimit, 1), 100);
    const offset = Number.isNaN(parsedOffset) ? undefined : Math.max(parsedOffset, 0);

    const result = await getRecentAnalyses({ limit, offset });

    if (result.success) {
      res.json({
        success: true,
        message: `Retrieved ${result.analyses.length} analyses`,
        timestamp: new Date().toISOString(),
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
    const parsedLimit = typeof limitParam === 'string' ? Number.parseInt(limitParam, 10) : Number.NaN;
    const limit = Number.isNaN(parsedLimit) ? undefined : Math.min(Math.max(parsedLimit, 1), 100);

    const result = await getHighRiskAnalyses({ limit });

    if (result.success) {
      res.json({
        success: true,
        message: `Retrieved ${result.analyses.length} high-risk analyses`,
        timestamp: new Date().toISOString(),
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
      req.query.packageId
    );

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error,
        timestamp: new Date().toISOString()
      });
    }

    const { limit, offset, packageId } = validation.params;

    const result = await getRecentAnalyses({ limit, offset, packageId });

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
        analyzed_at: analysis.analyzed_at
      }));

      const riskCountsResult = await getRiskLevelCounts({ packageId });
      const riskCounts = riskCountsResult.success ? riskCountsResult.counts : undefined;
      
      // Always fetch the most recent analysis timestamp regardless of pagination offset
      const mostRecentResult = await getRecentAnalyses({ limit: 1, offset: 0, packageId });
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

    // Fetch deployment info
    const deploymentResult = await getDeploymentByPackageId(packageId);
    
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

  // Start the Sui deployment monitor
  const autoAnalysisEnabled = envFlag('ENABLE_AUTO_ANALYSIS', true);
  const suiRpcEnabled = envFlag('ENABLE_SUI_RPC', true);

  if (autoAnalysisEnabled && suiRpcEnabled) {
    try {
      await startMonitoring();
    } catch (error) {
      console.error('❌ Failed to start Sui deployment monitor:', error);
    }
  } else {
    const reasons: string[] = [];
    if (!autoAnalysisEnabled) {
      reasons.push('ENABLE_AUTO_ANALYSIS=false');
    }
    if (!suiRpcEnabled) {
      reasons.push('ENABLE_SUI_RPC=false');
    }
    console.log(`⚠️ Sui deployment monitor not started (${reasons.join(', ') || 'no reason provided'})`);
  }
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  stopMonitoring();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  stopMonitoring();
  process.exit(0);
});

export default app;
