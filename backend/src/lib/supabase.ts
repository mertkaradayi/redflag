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

// ================================================================
// CONTRACT ANALYSIS OPERATIONS
// ================================================================

export interface SafetyCard {
  summary: string;
  risky_functions: Array<{
    function_name: string;
    reason: string;
  }>;
  rug_pull_indicators: Array<{
    pattern_name: string;
    evidence: string;
  }>;
  impact_on_user: string;
  why_risky_one_liner: string;
  risk_score: number;
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  technical_findings?: any;
}

/**
 * Save or update contract analysis result in database
 */
export async function saveAnalysisResult(
  packageId: string,
  network: string,
  safetyCard: SafetyCard
): Promise<{
  success: boolean;
  message: string;
  error?: string;
}> {
  try {
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase client not initialized',
        error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY'
      };
    }

    const { data, error } = await supabase
      .from('contract_analyses')
      .upsert({
        package_id: packageId,
        network,
        risk_score: safetyCard.risk_score,
        risk_level: safetyCard.risk_level,
        summary: safetyCard.summary,
        why_risky_one_liner: safetyCard.why_risky_one_liner,
        risky_functions: safetyCard.risky_functions,
        rug_pull_indicators: safetyCard.rug_pull_indicators,
        impact_on_user: safetyCard.impact_on_user,
        technical_findings: safetyCard.technical_findings || null,
        analyzed_at: new Date().toISOString()
      }, {
        onConflict: 'package_id,network'
      })
      .select('id');

    if (error) {
      console.error('Failed to save analysis result:', error);
      return {
        success: false,
        message: `Database save failed: ${error.message}`,
        error: error.message
      };
    }

    console.log(`Successfully saved analysis for ${packageId} on ${network}`);
    return {
      success: true,
      message: 'Analysis result saved successfully'
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in saveAnalysisResult:', error);
    return {
      success: false,
      message: `Unexpected error: ${errorMessage}`,
      error: errorMessage
    };
  }
}

/**
 * Get contract analysis result from database
 */
export async function getAnalysisResult(
  packageId: string,
  network: string
): Promise<{
  success: boolean;
  analysis: SafetyCard | null;
  error?: string;
}> {
  try {
    if (!supabase) {
      return {
        success: false,
        analysis: null,
        error: 'Supabase client not initialized'
      };
    }

    const { data, error } = await supabase
      .from('contract_analyses')
      .select('*')
      .eq('package_id', packageId)
      .eq('network', network)
      .single();

    if (error) {
      // PGRST116 = no rows found, which is not an error
      if (error.code === 'PGRST116') {
        return {
          success: true,
          analysis: null
        };
      }
      
      console.error('Failed to get analysis result:', error);
      return {
        success: false,
        analysis: null,
        error: error.message
      };
    }

    if (!data) {
      return {
        success: true,
        analysis: null
      };
    }

    // Transform database row to SafetyCard format
    const safetyCard: SafetyCard = {
      summary: data.summary,
      risky_functions: data.risky_functions,
      rug_pull_indicators: data.rug_pull_indicators,
      impact_on_user: data.impact_on_user,
      why_risky_one_liner: data.why_risky_one_liner,
      risk_score: data.risk_score,
      risk_level: data.risk_level,
      technical_findings: data.technical_findings
    };

    return {
      success: true,
      analysis: safetyCard
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in getAnalysisResult:', error);
    return {
      success: false,
      analysis: null,
      error: errorMessage
    };
  }
}

/**
 * Get recent contract analyses with pagination
 */
export async function getRecentAnalyses(options: {
  limit?: number;
  offset?: number;
  packageId?: string | null;
} = {}): Promise<{
  success: boolean;
  analyses: any[];
  totalCount: number;
  error?: string;
}> {
  try {
    if (!supabase) {
      return {
        success: false,
        analyses: [],
        totalCount: 0,
        error: 'Supabase client not initialized'
      };
    }

    const { limit = 50, offset = 0, packageId = null } = options;

    // Build base query
    let query = supabase
      .from('contract_analyses')
      .select('*', { count: 'exact', head: false })
      .order('analyzed_at', { ascending: false });

    // Apply packageId filter if provided (exact match, case-sensitive)
    if (packageId) {
      query = query.eq('package_id', packageId);
    }

    // Get paginated analyses with accurate total count in one query
    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to get analyses:', error);
      return {
        success: false,
        analyses: [],
        totalCount: 0,
        error: error.message
      };
    }

    return {
      success: true,
      analyses: data || [],
      totalCount: count || 0
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in getRecentAnalyses:', error);
    return {
      success: false,
      analyses: [],
      totalCount: 0,
      error: errorMessage
    };
  }
}

/**
 * Get aggregated risk-level counts matching the provided filter
 */
export async function getRiskLevelCounts(options: {
  packageId?: string | null;
} = {}): Promise<{
  success: boolean;
  counts: Record<'critical' | 'high' | 'moderate' | 'low', number>;
  error?: string;
}> {
  try {
    if (!supabase) {
      return {
        success: false,
        counts: {
          critical: 0,
          high: 0,
          moderate: 0,
          low: 0,
        },
        error: 'Supabase client not initialized'
      };
    }

    const { packageId = null } = options;
    const levels: Array<'critical' | 'high' | 'moderate' | 'low'> = ['critical', 'high', 'moderate', 'low'];
    const counts: Record<'critical' | 'high' | 'moderate' | 'low', number> = {
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
    };

    await Promise.all(
      levels.map(async (level) => {
        let query = supabase
          .from('contract_analyses')
          .select('id', { count: 'exact', head: true })
          .eq('risk_level', level);

        if (packageId) {
          query = query.eq('package_id', packageId);
        }

        const { count, error } = await query;
        if (!error && typeof count === 'number') {
          counts[level] = count;
        } else if (error) {
          console.error(`Failed to get ${level} risk count:`, error);
        }
      }),
    );

    return {
      success: true,
      counts,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in getRiskLevelCounts:', error);
    return {
      success: false,
      counts: {
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
      },
      error: errorMessage,
    };
  }
}

/**
 * Get high-risk contract analyses
 */
export async function getHighRiskAnalyses(options: {
  limit?: number;
} = {}): Promise<{
  success: boolean;
  analyses: any[];
  error?: string;
}> {
  try {
    if (!supabase) {
      return {
        success: false,
        analyses: [],
        error: 'Supabase client not initialized'
      };
    }

    const { limit = 50 } = options;

    const { data, error } = await supabase
      .from('contract_analyses')
      .select('*')
      .in('risk_level', ['high', 'critical'])
      .order('risk_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get high-risk analyses:', error);
      return {
        success: false,
        analyses: [],
        error: error.message
      };
    }

    return {
      success: true,
      analyses: data || []
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in getHighRiskAnalyses:', error);
    return {
      success: false,
      analyses: [],
      error: errorMessage
    };
  }
}
