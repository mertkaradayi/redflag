import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { testSupabaseConnection, getDeployments } from './lib/supabase';
import { getRecentPublishTransactions, testSuiConnection } from './lib/sui-client';
import { startMonitoring, stopMonitoring, getMonitoringStatus } from './workers/sui-monitor';

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
  
  // Test Sui RPC connection
  let suiStatus = 'not configured';
  if (hasSuiRpcUrl) {
    try {
      const suiResult = await testSuiConnection();
      suiStatus = suiResult.success ? 'connected' : 'connection failed';
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
        connectionInfo: result.connectionInfo
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
      res.json({
        success: true,
        message: `Retrieved ${result.deployments.length} deployments`,
        timestamp: new Date().toISOString(),
        deployments: result.deployments,
        totalCount: result.totalCount,
        limit: limit || 50,
        offset: offset || 0
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
    monitor: status
  });
});

// Debug endpoint to see what transactions we're getting
app.get('/api/sui/debug', async (req, res) => {
  try {
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

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 RedFlag Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API status: http://localhost:${PORT}/api/status`);
  console.log(`🗄️ Supabase health: http://localhost:${PORT}/api/supabase/health`);
  console.log(`🔗 Sui health: http://localhost:${PORT}/api/sui/health`);
  console.log(`📦 Sui deployments: http://localhost:${PORT}/api/sui/recent-deployments`);
  console.log(`🆕 Latest deployment: http://localhost:${PORT}/api/sui/latest-deployment`);
  console.log(`📚 Historical deployments: http://localhost:${PORT}/api/sui/deployments`);
  console.log(`📊 Monitor status: http://localhost:${PORT}/api/sui/monitor-status`);

  // Start the Sui deployment monitor
  try {
    await startMonitoring();
  } catch (error) {
    console.error('❌ Failed to start Sui deployment monitor:', error);
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
