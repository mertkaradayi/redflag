import { createClient } from '@supabase/supabase-js';
import { ContractDeployment } from './sui-client';

// Initialize Supabase client with service role key for backend operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Create a conditional client that only initializes if env vars are present
export const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Test database connection
export async function testSupabaseConnection() {
  try {
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase client not initialized. Please check SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.',
        timestamp: new Date().toISOString()
      };
    }

    // For now, just test that the client was created successfully
    // We'll implement actual database queries later when we have tables
    return {
      success: true,
      message: 'Supabase client initialized successfully. Ready for database operations.',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      message: `Supabase connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    };
  }
}

// Database operations for Sui package deployments

/**
 * Upsert (insert or update) Sui package deployments to the database
 * Uses package_id as the conflict resolution key
 */
export async function upsertDeployments(deployments: ContractDeployment[]): Promise<{
  success: boolean;
  message: string;
  count: number;
  error?: string;
}> {
  try {
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase client not initialized',
        count: 0,
        error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY'
      };
    }

    if (!deployments.length) {
      return {
        success: true,
        message: 'No deployments to upsert',
        count: 0
      };
    }

    // Transform ContractDeployment to database format
    const dbDeployments = deployments.map(deployment => ({
      package_id: deployment.packageId,
      deployer_address: deployment.deployer,
      tx_digest: deployment.txDigest,
      checkpoint: deployment.checkpoint,
      timestamp: new Date(deployment.timestamp).toISOString()
    }));

    const { data, error } = await supabase
      .from('sui_package_deployments')
      .upsert(dbDeployments, {
        onConflict: 'package_id',
        ignoreDuplicates: false
      })
      .select('package_id');

    if (error) {
      console.error('Failed to upsert deployments:', error);
      return {
        success: false,
        message: `Database upsert failed: ${error.message}`,
        count: 0,
        error: error.message
      };
    }

    const actualCount = data?.length || 0;
    console.log(`Successfully upserted ${actualCount} deployments to database`);
    
    return {
      success: true,
      message: `Successfully upserted ${actualCount} deployments`,
      count: actualCount
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in upsertDeployments:', error);
    return {
      success: false,
      message: `Unexpected error: ${errorMessage}`,
      count: 0,
      error: errorMessage
    };
  }
}

/**
 * Get the highest checkpoint number from existing deployments
 * Used to resume monitoring from the last processed checkpoint
 */
export async function getLastProcessedCheckpoint(): Promise<{
  success: boolean;
  checkpoint: number | null;
  error?: string;
}> {
  try {
    if (!supabase) {
      return {
        success: false,
        checkpoint: null,
        error: 'Supabase client not initialized'
      };
    }

    const { data, error } = await supabase
      .from('sui_package_deployments')
      .select('checkpoint')
      .order('checkpoint', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If no rows found, that's okay - we'll start from checkpoint 0
      if (error.code === 'PGRST116') {
        return {
          success: true,
          checkpoint: null
        };
      }
      
      console.error('Failed to get last checkpoint:', error);
      return {
        success: false,
        checkpoint: null,
        error: error.message
      };
    }

    return {
      success: true,
      checkpoint: data?.checkpoint || null
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in getLastProcessedCheckpoint:', error);
    return {
      success: false,
      checkpoint: null,
      error: errorMessage
    };
  }
}

/**
 * Get historical deployments with pagination
 */
export async function getDeployments(options: {
  limit?: number;
  offset?: number;
} = {}): Promise<{
  success: boolean;
  deployments: any[];
  totalCount: number;
  error?: string;
}> {
  try {
    if (!supabase) {
      return {
        success: false,
        deployments: [],
        totalCount: 0,
        error: 'Supabase client not initialized'
      };
    }

    const { limit = 50, offset = 0 } = options;

    // Get total count
    const { count, error: countError } = await supabase
      .from('sui_package_deployments')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Failed to get deployment count:', countError);
      return {
        success: false,
        deployments: [],
        totalCount: 0,
        error: countError.message
      };
    }

    // Get paginated deployments
    const { data, error } = await supabase
      .from('sui_package_deployments')
      .select('*')
      .order('checkpoint', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to get deployments:', error);
      return {
        success: false,
        deployments: [],
        totalCount: 0,
        error: error.message
      };
    }

    return {
      success: true,
      deployments: data || [],
      totalCount: count || 0
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in getDeployments:', error);
    return {
      success: false,
      deployments: [],
      totalCount: 0,
      error: errorMessage
    };
  }
}
