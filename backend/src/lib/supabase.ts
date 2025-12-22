import { createClient } from '@supabase/supabase-js';
import { ContractDeployment } from './sui-client';
import type { RiskLevel } from './query-utils';

export interface DeploymentRow {
  package_id: string;
  deployer_address: string;
  tx_digest: string;
  checkpoint: number;
  timestamp: string;
  network: string;
  first_seen_at?: string | null;
}

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
 * Uses (package_id, network) as the conflict resolution key
 */
export async function upsertDeployments(
  deployments: ContractDeployment[],
  network: string
): Promise<{
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

    // Transform ContractDeployment to database format with network
    const dbDeployments = deployments.map(deployment => ({
      package_id: deployment.packageId,
      deployer_address: deployment.deployer,
      tx_digest: deployment.txDigest,
      checkpoint: deployment.checkpoint,
      timestamp: new Date(deployment.timestamp).toISOString(),
      network
    }));

    const { data, error } = await supabase
      .from('sui_package_deployments')
      .upsert(dbDeployments, {
        onConflict: 'package_id,network',
        ignoreDuplicates: false
      })
      .select('package_id');

    if (error) {
      console.error(`Failed to upsert ${network} deployments:`, error);
      return {
        success: false,
        message: `Database upsert failed: ${error.message}`,
        count: 0,
        error: error.message
      };
    }

    const actualCount = data?.length || 0;
    console.log(`Successfully upserted ${actualCount} ${network} deployments to database`);

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
 * Get the highest checkpoint number from existing deployments for a specific network
 * Used to resume monitoring from the last processed checkpoint
 */
export async function getLastProcessedCheckpoint(network: string): Promise<{
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
      .eq('network', network)
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

      console.error(`Failed to get last checkpoint for ${network}:`, error);
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
  network?: string | null;
} = {}): Promise<{
  success: boolean;
  deployments: DeploymentRow[];
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

    const { limit = 50, offset = 0, network = null } = options;

    // Build count query
    let countQuery = supabase
      .from('sui_package_deployments')
      .select('*', { count: 'exact', head: true });

    // Apply network filter if provided
    if (network && (network === 'mainnet' || network === 'testnet')) {
      countQuery = countQuery.eq('network', network);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Failed to get deployment count:', countError);
      return {
        success: false,
        deployments: [],
        totalCount: 0,
        error: countError.message
      };
    }

    // Build paginated deployments query
    let query = supabase
      .from('sui_package_deployments')
      .select('*');

    // Apply network filter if provided
    if (network && (network === 'mainnet' || network === 'testnet')) {
      query = query.eq('network', network);
    }

    const { data, error } = await query
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
      deployments: (data as DeploymentRow[]) || [],
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

/**
 * Get a single deployment by package_id
 * Optional network parameter to filter by network (required for composite primary key)
 */
export async function getDeploymentByPackageId(
  packageId: string,
  network?: string | null
): Promise<{
  success: boolean;
  deployment: DeploymentRow | null;
  error?: string;
}> {
  try {
    if (!supabase) {
      return {
        success: false,
        deployment: null,
        error: 'Supabase client not initialized'
      };
    }

    let query = supabase
      .from('sui_package_deployments')
      .select('*')
      .eq('package_id', packageId);

    // Apply network filter if provided
    if (network && (network === 'mainnet' || network === 'testnet')) {
      query = query.eq('network', network);
    }

    const { data, error } = await query.limit(1).single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return {
          success: true,
          deployment: null
        };
      }
      console.error('Failed to get deployment by package_id:', error);
      return {
        success: false,
        deployment: null,
        error: error.message
      };
    }

    return {
      success: true,
      deployment: (data as DeploymentRow | null) || null
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in getDeploymentByPackageId:', error);
    return {
      success: false,
      deployment: null,
      error: errorMessage
    };
  }
}

/**
 * Get deployment statistics from the database
 * Calculates total, last 24h, and latest checkpoint directly from DB
 */
export async function getDeploymentStats(options: {
  network?: string | null;
} = {}): Promise<{
  success: boolean;
  total: number;
  last24h: number;
  previous24h: number;
  latestCheckpoint: number | null;
  error?: string;
}> {
  try {
    if (!supabase) {
      return {
        success: false,
        total: 0,
        last24h: 0,
        previous24h: 0,
        latestCheckpoint: null,
        error: 'Supabase client not initialized'
      };
    }

    const { network = null } = options;

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const previous24h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Get total count with network filter
    let totalQuery = supabase
      .from('sui_package_deployments')
      .select('*', { count: 'exact', head: true });

    if (network && (network === 'mainnet' || network === 'testnet')) {
      totalQuery = totalQuery.eq('network', network);
    }

    const { count: totalCount, error: totalError } = await totalQuery;

    if (totalError) {
      console.error('Failed to get total count:', totalError);
      return {
        success: false,
        total: 0,
        last24h: 0,
        previous24h: 0,
        latestCheckpoint: null,
        error: totalError.message
      };
    }

    // Get last 24h count with network filter
    let last24hQuery = supabase
      .from('sui_package_deployments')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', last24h.toISOString());

    if (network && (network === 'mainnet' || network === 'testnet')) {
      last24hQuery = last24hQuery.eq('network', network);
    }

    const { count: last24hCount, error: last24hError } = await last24hQuery;

    if (last24hError) {
      console.error('Failed to get last 24h count:', last24hError);
      return {
        success: false,
        total: totalCount || 0,
        last24h: 0,
        previous24h: 0,
        latestCheckpoint: null,
        error: last24hError.message
      };
    }

    // Get previous 24h count (24-48 hours ago) with network filter
    let previous24hQuery = supabase
      .from('sui_package_deployments')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', previous24h.toISOString())
      .lt('timestamp', last24h.toISOString());

    if (network && (network === 'mainnet' || network === 'testnet')) {
      previous24hQuery = previous24hQuery.eq('network', network);
    }

    const { count: previous24hCount, error: previous24hError } = await previous24hQuery;

    if (previous24hError) {
      console.error('Failed to get previous 24h count:', previous24hError);
      return {
        success: false,
        total: totalCount || 0,
        last24h: last24hCount || 0,
        previous24h: 0,
        latestCheckpoint: null,
        error: previous24hError.message
      };
    }

    // Get latest checkpoint with network filter
    let checkpointQuery = supabase
      .from('sui_package_deployments')
      .select('checkpoint')
      .order('checkpoint', { ascending: false })
      .limit(1);

    if (network && (network === 'mainnet' || network === 'testnet')) {
      checkpointQuery = checkpointQuery.eq('network', network);
    }

    const { data: checkpointData, error: checkpointError } = await checkpointQuery.single();

    if (checkpointError && checkpointError.code !== 'PGRST116') {
      console.error('Failed to get latest checkpoint:', checkpointError);
      return {
        success: false,
        total: totalCount || 0,
        last24h: last24hCount || 0,
        previous24h: previous24hCount || 0,
        latestCheckpoint: null,
        error: checkpointError.message
      };
    }

    return {
      success: true,
      total: totalCount || 0,
      last24h: last24hCount || 0,
      previous24h: previous24hCount || 0,
      latestCheckpoint: checkpointData?.checkpoint ?? null
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in getDeploymentStats:', error);
    return {
      success: false,
      total: 0,
      last24h: 0,
      previous24h: 0,
      latestCheckpoint: null,
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

export type AnalysisStatus = 'completed' | 'failed' | 'pending';

/**
 * Save or update contract analysis result in database
 */
export async function saveAnalysisResult(
  packageId: string,
  network: string,
  safetyCard: SafetyCard,
  status: AnalysisStatus = 'completed',
  errorMessage?: string
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
        analysis_status: status,
        error_message: errorMessage || null,
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

    console.log(`Successfully saved analysis for ${packageId} on ${network} (status: ${status})`);
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
 * Optional maxAgeHours parameter to ignore stale results
 */
export async function getAnalysisResult(
  packageId: string,
  network: string,
  maxAgeHours?: number
): Promise<{
  success: boolean;
  analysis: SafetyCard | null;
  analyzedAt: string | null;
  error?: string;
  stale?: boolean;
}> {
  try {
    if (!supabase) {
      return {
        success: false,
        analysis: null,
        analyzedAt: null,
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
          analysis: null,
          analyzedAt: null
        };
      }

      console.error('Failed to get analysis result:', error);
      return {
        success: false,
        analysis: null,
        analyzedAt: null,
        error: error.message
      };
    }

    if (!data) {
      return {
        success: true,
        analysis: null,
        analyzedAt: null
      };
    }

    // Check if result is stale (if maxAgeHours specified)
    let isStale = false;
    if (maxAgeHours && data.analyzed_at) {
      const analyzedTime = new Date(data.analyzed_at).getTime();
      const now = Date.now();
      const ageHours = (now - analyzedTime) / (1000 * 60 * 60);

      if (ageHours > maxAgeHours) {
        isStale = true;
        console.log(`[DATABASE] Analysis is ${ageHours.toFixed(1)}h old (max: ${maxAgeHours}h) - considered stale`);
        return {
          success: true,
          analysis: null, // Return null for stale results
          analyzedAt: data.analyzed_at,
          stale: true
        };
      }
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
      analysis: safetyCard,
      analyzedAt: data.analyzed_at ?? null,
      stale: isStale
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in getAnalysisResult:', error);
    return {
      success: false,
      analysis: null,
      analyzedAt: null,
      error: errorMessage
    };
  }
}

/**
 * Get recent contract analyses with pagination
 * Excludes failed analyses by default
 */
export async function getRecentAnalyses(options: {
  limit?: number;
  offset?: number;
  packageId?: string | null;
  riskLevels?: RiskLevel[] | null;
  network?: string | null;
  includeFailed?: boolean;
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

    const {
      limit = 50,
      offset = 0,
      packageId = null,
      riskLevels = null,
      network = null,
      includeFailed = false
    } = options;

    // Build base query
    let query = supabase
      .from('contract_analyses')
      .select('*', { count: 'exact', head: false })
      .order('analyzed_at', { ascending: false });

    // Exclude failed analyses by default
    if (!includeFailed) {
      query = query.eq('analysis_status', 'completed');
    }

    // Apply packageId filter if provided (exact match, case-sensitive)
    if (packageId) {
      query = query.eq('package_id', packageId);
    }

    if (riskLevels && riskLevels.length > 0) {
      query = query.in('risk_level', riskLevels);
    }

    // Apply network filter if provided
    if (network && (network === 'mainnet' || network === 'testnet')) {
      query = query.eq('network', network);
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
 * Excludes failed analyses
 */
export async function getRiskLevelCounts(options: {
  packageId?: string | null;
  network?: string | null;
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

    const { packageId = null, network = null } = options;
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
          .eq('risk_level', level)
          .eq('analysis_status', 'completed'); // Exclude failed analyses

        if (packageId) {
          query = query.eq('package_id', packageId);
        }

        // Apply network filter if provided
        if (network && (network === 'mainnet' || network === 'testnet')) {
          query = query.eq('network', network);
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
  network?: string | null;
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

    const { limit = 50, network = null } = options;

    let query = supabase
      .from('contract_analyses')
      .select('*')
      .in('risk_level', ['high', 'critical'])
      .eq('analysis_status', 'completed'); // Exclude failed analyses for consistency

    // Apply network filter if provided
    if (network && (network === 'mainnet' || network === 'testnet')) {
      query = query.eq('network', network);
    }

    const { data, error } = await query
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

// ================================================================
// DEPENDENCY RISK OPERATIONS
// ================================================================

export interface DependencyRisk {
  package_id: string;
  network: string;
  dependency_type: 'framework' | 'library' | 'contract' | 'unknown';
  is_system_package: boolean;
  is_audited: boolean;
  is_upgradeable: boolean;
  risk_score: number | null;
  risk_level: 'low' | 'moderate' | 'high' | 'critical' | null;
  last_analyzed: string | null;
  analysis_source: 'auto' | 'manual' | 'inherited' | null;
}

export interface DependencySummary {
  total_dependencies: number;
  audited_count: number;
  unaudited_count: number;
  high_risk_count: number;
  system_packages: number;
  risk_dependencies: DependencyRisk[];
}

/**
 * Get dependency risk info for a package
 */
export async function getDependencyRisk(
  packageId: string,
  network: string
): Promise<{ success: boolean; dependency: DependencyRisk | null; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, dependency: null, error: 'Supabase client not initialized' };
    }

    const { data, error } = await supabase
      .from('dependency_risks')
      .select('*')
      .eq('package_id', packageId)
      .eq('network', network)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching dependency risk:', error);
      return { success: false, dependency: null, error: error.message };
    }

    return { success: true, dependency: data || null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in getDependencyRisk:', error);
    return { success: false, dependency: null, error: errorMessage };
  }
}

/**
 * Get dependency risks for multiple packages
 */
export async function getDependencyRisks(
  packageIds: string[],
  network: string
): Promise<{ success: boolean; dependencies: DependencyRisk[]; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, dependencies: [], error: 'Supabase client not initialized' };
    }

    if (packageIds.length === 0) {
      return { success: true, dependencies: [] };
    }

    const { data, error } = await supabase
      .from('dependency_risks')
      .select('*')
      .in('package_id', packageIds)
      .eq('network', network);

    if (error) {
      console.error('Error fetching dependency risks:', error);
      return { success: false, dependencies: [], error: error.message };
    }

    return { success: true, dependencies: data || [] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in getDependencyRisks:', error);
    return { success: false, dependencies: [], error: errorMessage };
  }
}

/**
 * Save or update dependency risk info
 */
export async function saveDependencyRisk(
  dependency: Partial<DependencyRisk> & { package_id: string; network: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized' };
    }

    const { error } = await supabase
      .from('dependency_risks')
      .upsert({
        package_id: dependency.package_id,
        network: dependency.network,
        dependency_type: dependency.dependency_type || 'unknown',
        is_system_package: dependency.is_system_package || false,
        is_audited: dependency.is_audited || false,
        is_upgradeable: dependency.is_upgradeable || false,
        risk_score: dependency.risk_score ?? null,
        risk_level: dependency.risk_level ?? null,
        last_analyzed: dependency.last_analyzed || new Date().toISOString(),
        analysis_source: dependency.analysis_source || 'auto',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'package_id,network'
      });

    if (error) {
      console.error('Error saving dependency risk:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in saveDependencyRisk:', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Update contract analysis with dependency summary
 */
export async function updateAnalysisDependencySummary(
  packageId: string,
  network: string,
  dependencySummary: DependencySummary
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized' };
    }

    const { error } = await supabase
      .from('contract_analyses')
      .update({
        dependency_summary: dependencySummary,
      })
      .eq('package_id', packageId)
      .eq('network', network);

    if (error) {
      console.error('Error updating dependency summary:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in updateAnalysisDependencySummary:', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Check if a package is a known system package
 */
export function isSystemPackage(packageId: string): boolean {
  const systemPackages = ['0x1', '0x2', '0x3', '0x6', '0xdee9'];
  return systemPackages.includes(packageId.toLowerCase());
}

// ================================================================
// AUDIT TRAIL OPERATIONS
// ================================================================

export interface AuditLogEntry {
  package_id: string;
  network: string;
  analyzed_at?: string;
  total_duration_ms?: number;
  total_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  llm_calls?: number;
  modules_analyzed?: number;
  modules_total?: number;
  functions_analyzed?: number;
  functions_total?: number;
  truncation_occurred?: boolean;
  static_findings_count?: number;
  llm_findings_count?: number;
  validated_findings_count?: number;
  cross_module_risks_count?: number;
  final_risk_score?: number;
  final_risk_level?: string;
  errors?: Array<{ stage: string; message: string; timestamp: string }>;
  warnings?: Array<{ stage: string; message: string; timestamp: string }>;
  model_used?: string;
  analysis_version?: string;
}

/**
 * Save an audit log entry for an analysis run
 */
export async function saveAuditLog(
  entry: AuditLogEntry
): Promise<{ success: boolean; id?: number; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized' };
    }

    const { data, error } = await supabase
      .from('analysis_audit_logs')
      .insert({
        package_id: entry.package_id,
        network: entry.network,
        analyzed_at: entry.analyzed_at || new Date().toISOString(),
        total_duration_ms: entry.total_duration_ms,
        total_tokens: entry.total_tokens || 0,
        prompt_tokens: entry.prompt_tokens || 0,
        completion_tokens: entry.completion_tokens || 0,
        llm_calls: entry.llm_calls || 0,
        modules_analyzed: entry.modules_analyzed || 0,
        modules_total: entry.modules_total || 0,
        functions_analyzed: entry.functions_analyzed || 0,
        functions_total: entry.functions_total || 0,
        truncation_occurred: entry.truncation_occurred || false,
        static_findings_count: entry.static_findings_count || 0,
        llm_findings_count: entry.llm_findings_count || 0,
        validated_findings_count: entry.validated_findings_count || 0,
        cross_module_risks_count: entry.cross_module_risks_count || 0,
        final_risk_score: entry.final_risk_score,
        final_risk_level: entry.final_risk_level,
        errors: entry.errors || [],
        warnings: entry.warnings || [],
        model_used: entry.model_used,
        analysis_version: entry.analysis_version || 'v1',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving audit log:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in saveAuditLog:', error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get audit logs for a package
 */
export async function getAuditLogs(
  packageId: string,
  network: string,
  limit: number = 10
): Promise<{ success: boolean; logs: AuditLogEntry[]; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, logs: [], error: 'Supabase client not initialized' };
    }

    const { data, error } = await supabase
      .from('analysis_audit_logs')
      .select('*')
      .eq('package_id', packageId)
      .eq('network', network)
      .order('analyzed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return { success: false, logs: [], error: error.message };
    }

    return { success: true, logs: data || [] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in getAuditLogs:', error);
    return { success: false, logs: [], error: errorMessage };
  }
}

/**
 * Get recent audit logs across all packages (for monitoring dashboard)
 */
export async function getRecentAuditLogs(
  limit: number = 50,
  network?: string
): Promise<{ success: boolean; logs: AuditLogEntry[]; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, logs: [], error: 'Supabase client not initialized' };
    }

    let query = supabase
      .from('analysis_audit_logs')
      .select('*')
      .order('analyzed_at', { ascending: false })
      .limit(limit);

    if (network) {
      query = query.eq('network', network);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching recent audit logs:', error);
      return { success: false, logs: [], error: error.message };
    }

    return { success: true, logs: data || [] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in getRecentAuditLogs:', error);
    return { success: false, logs: [], error: errorMessage };
  }
}

/**
 * Get audit log statistics (for monitoring)
 */
export async function getAuditLogStats(
  network?: string,
  hours: number = 24
): Promise<{
  success: boolean;
  stats?: {
    total_analyses: number;
    avg_duration_ms: number;
    total_tokens: number;
    error_count: number;
    avg_risk_score: number;
  };
  error?: string;
}> {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized' };
    }

    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from('analysis_audit_logs')
      .select('total_duration_ms, total_tokens, final_risk_score, errors')
      .gte('analyzed_at', since);

    if (network) {
      query = query.eq('network', network);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit log stats:', error);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        stats: {
          total_analyses: 0,
          avg_duration_ms: 0,
          total_tokens: 0,
          error_count: 0,
          avg_risk_score: 0,
        },
      };
    }

    const totalAnalyses = data.length;
    const avgDuration = data.reduce((sum, d) => sum + (d.total_duration_ms || 0), 0) / totalAnalyses;
    const totalTokens = data.reduce((sum, d) => sum + (d.total_tokens || 0), 0);
    const errorCount = data.filter((d) => d.errors && (d.errors as any[]).length > 0).length;
    const riskScores = data.filter((d) => d.final_risk_score !== null).map((d) => d.final_risk_score!);
    const avgRiskScore = riskScores.length > 0 ? riskScores.reduce((sum, s) => sum + s, 0) / riskScores.length : 0;

    return {
      success: true,
      stats: {
        total_analyses: totalAnalyses,
        avg_duration_ms: Math.round(avgDuration),
        total_tokens: totalTokens,
        error_count: errorCount,
        avg_risk_score: Math.round(avgRiskScore),
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in getAuditLogStats:', error);
    return { success: false, error: errorMessage };
  }
}

// ================================================================
// ANALYSIS QUEUE OPERATIONS
// ================================================================

/**
 * Get deployments that haven't been analyzed yet
 *
 * Strategy: Query deployments and filter out those with existing analyses
 * This creates a "pending queue" from the database
 *
 * @param options.limit - Max deployments to return (default: 5)
 * @param options.network - Filter by network (mainnet/testnet/null for all)
 * @returns Unanalyzed deployments in FIFO order (oldest first)
 */
export async function getUnanalyzedDeployments(options: {
  limit?: number;
  network?: string | null;
} = {}): Promise<{
  success: boolean;
  deployments: DeploymentRow[];
  error?: string;
}> {
  try {
    if (!supabase) {
      return {
        success: false,
        deployments: [],
        error: 'Supabase client not initialized'
      };
    }

    const { limit = 5, network = null } = options;

    // Step 1: Get oldest deployments (FIFO - First In First Out)
    let query = supabase
      .from('sui_package_deployments')
      .select('*')
      .order('checkpoint', { ascending: true }); // Oldest first

    // Apply network filter if specified
    if (network && (network === 'mainnet' || network === 'testnet')) {
      query = query.eq('network', network);
    }

    // Fetch more than needed to account for already-analyzed ones
    const { data: deployments, error: deploymentsError } = await query.limit(limit * 10);

    if (deploymentsError) {
      console.error('Failed to get deployments:', deploymentsError);
      return {
        success: false,
        deployments: [],
        error: deploymentsError.message
      };
    }

    if (!deployments || deployments.length === 0) {
      return {
        success: true,
        deployments: []
      };
    }

    // Step 2: Filter out those that already have analyses
    const unanalyzed: DeploymentRow[] = [];

    for (const deployment of deployments) {
      // Check if this deployment has been analyzed
      const analysisResult = await getAnalysisResult(
        deployment.package_id,
        deployment.network
      );

      // If no analysis exists, it's pending
      if (!analysisResult.analysis) {
        unanalyzed.push(deployment as DeploymentRow);

        // Stop when we have enough
        if (unanalyzed.length >= limit) {
          break;
        }
      }
    }

    return {
      success: true,
      deployments: unanalyzed
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in getUnanalyzedDeployments:', error);
    return {
      success: false,
      deployments: [],
      error: errorMessage
    };
  }
}

// ================================================================
// MONITOR CHECKPOINT OPERATIONS
// ================================================================

/**
 * Get the last processed checkpoint for a network from monitor_checkpoints table
 * Returns null if no checkpoint has been processed yet (first run)
 */
export async function getMonitorCheckpoint(network: string): Promise<{
  success: boolean;
  checkpoint: string | null;
  lastProcessedAt: string | null;
  error?: string;
}> {
  try {
    if (!supabase) {
      return {
        success: false,
        checkpoint: null,
        lastProcessedAt: null,
        error: 'Supabase client not initialized'
      };
    }

    const { data, error } = await supabase
      .from('monitor_checkpoints')
      .select('last_processed_checkpoint, last_processed_at')
      .eq('network', network)
      .single();

    if (error) {
      // PGRST116 = no rows found, which is expected on first run
      if (error.code === 'PGRST116') {
        return {
          success: true,
          checkpoint: null,
          lastProcessedAt: null
        };
      }

      console.error(`Failed to get monitor checkpoint for ${network}:`, error);
      return {
        success: false,
        checkpoint: null,
        lastProcessedAt: null,
        error: error.message
      };
    }

    return {
      success: true,
      checkpoint: data?.last_processed_checkpoint?.toString() ?? null,
      lastProcessedAt: data?.last_processed_at ?? null
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in getMonitorCheckpoint:', error);
    return {
      success: false,
      checkpoint: null,
      lastProcessedAt: null,
      error: errorMessage
    };
  }
}

/**
 * Update the last processed checkpoint for a network
 * Uses upsert to handle both insert (first run) and update cases
 */
export async function updateMonitorCheckpoint(
  network: string,
  checkpoint: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase client not initialized'
      };
    }

    const checkpointNum = BigInt(checkpoint);

    const { error } = await supabase
      .from('monitor_checkpoints')
      .upsert({
        network,
        last_processed_checkpoint: checkpointNum.toString(),
        last_processed_at: new Date().toISOString()
      }, {
        onConflict: 'network'
      });

    if (error) {
      console.error(`Failed to update monitor checkpoint for ${network}:`, error);
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in updateMonitorCheckpoint:', error);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Get monitor checkpoint status for all networks
 * Used by status endpoints to show monitoring progress
 */
export async function getAllMonitorCheckpoints(): Promise<{
  success: boolean;
  checkpoints: Array<{
    network: string;
    lastProcessedCheckpoint: string;
    lastProcessedAt: string;
  }>;
  error?: string;
}> {
  try {
    if (!supabase) {
      return {
        success: false,
        checkpoints: [],
        error: 'Supabase client not initialized'
      };
    }

    const { data, error } = await supabase
      .from('monitor_checkpoints')
      .select('network, last_processed_checkpoint, last_processed_at')
      .order('network');

    if (error) {
      console.error('Failed to get all monitor checkpoints:', error);
      return {
        success: false,
        checkpoints: [],
        error: error.message
      };
    }

    return {
      success: true,
      checkpoints: (data || []).map(row => ({
        network: row.network,
        lastProcessedCheckpoint: row.last_processed_checkpoint?.toString() ?? '0',
        lastProcessedAt: row.last_processed_at ?? ''
      }))
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in getAllMonitorCheckpoints:', error);
    return {
      success: false,
      checkpoints: [],
      error: errorMessage
    };
  }
}
