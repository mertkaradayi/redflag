/**
 * Dependency Analyzer - Track and assess risks from contract dependencies
 *
 * Analyzes a contract's dependencies and flags:
 * - Unaudited dependencies (no analysis record)
 * - High-risk dependencies (risk_score >= 70)
 * - Upgradeable dependencies (can change behavior)
 */

import {
  getDependencyRisks,
  saveDependencyRisk,
  getAnalysisResult,
  isSystemPackage,
  type DependencyRisk,
  type DependencySummary,
} from './supabase';

// ================================================================
// TYPES
// ================================================================

export interface DependencyAnalysisResult {
  summary: DependencySummary;
  warnings: DependencyWarning[];
  analysis_time_ms: number;
}

export interface DependencyWarning {
  type: 'unaudited' | 'high_risk' | 'upgradeable' | 'unknown';
  severity: 'info' | 'warning' | 'critical';
  package_id: string;
  message: string;
}

// ================================================================
// CONSTANTS
// ================================================================

// Known safe framework packages
const FRAMEWORK_PACKAGES = new Set([
  '0x1',   // Move stdlib
  '0x2',   // Sui framework
  '0x3',   // Sui system
  '0x6',   // Sui clock
  '0xdee9', // DeepBook
]);

// Risk thresholds
const HIGH_RISK_THRESHOLD = 70;
const CRITICAL_RISK_THRESHOLD = 90;

// ================================================================
// MAIN ANALYSIS FUNCTION
// ================================================================

/**
 * Analyze dependencies for a contract
 */
export async function analyzeDependencies(
  dependencies: string[],
  network: string,
  packageId: string
): Promise<DependencyAnalysisResult> {
  const startTime = Date.now();
  const warnings: DependencyWarning[] = [];

  // Filter out the package itself from dependencies
  const externalDeps = dependencies.filter(dep => dep !== packageId);

  if (externalDeps.length === 0) {
    return {
      summary: {
        total_dependencies: 0,
        audited_count: 0,
        unaudited_count: 0,
        high_risk_count: 0,
        system_packages: 0,
        risk_dependencies: [],
      },
      warnings: [],
      analysis_time_ms: Date.now() - startTime,
    };
  }

  console.log(`[Dependencies] Analyzing ${externalDeps.length} dependencies...`);

  // Separate system packages from other dependencies
  const systemDeps = externalDeps.filter(dep => isSystemPackage(dep) || FRAMEWORK_PACKAGES.has(dep));
  const nonSystemDeps = externalDeps.filter(dep => !isSystemPackage(dep) && !FRAMEWORK_PACKAGES.has(dep));

  // Get existing dependency risk records
  const { success, dependencies: existingRisks } = await getDependencyRisks(nonSystemDeps, network);

  if (!success) {
    console.warn('[Dependencies] Failed to fetch existing dependency risks');
  }

  // Create a map for quick lookup
  const riskMap = new Map<string, DependencyRisk>();
  for (const risk of existingRisks) {
    riskMap.set(risk.package_id, risk);
  }

  // Analyze each non-system dependency
  const riskDependencies: DependencyRisk[] = [];
  let auditedCount = systemDeps.length; // System packages are always audited
  let unauditedCount = 0;
  let highRiskCount = 0;

  for (const depId of nonSystemDeps) {
    let depRisk = riskMap.get(depId);

    if (!depRisk) {
      // No existing record - check if we have an analysis
      const analysisResult = await getAnalysisResult(depId, network);

      if (analysisResult.success && analysisResult.analysis) {
        // We have an analysis - create risk record from it
        const riskScore = analysisResult.analysis.risk_score || 0;
        const riskLevel = analysisResult.analysis.risk_level || 'low';

        depRisk = {
          package_id: depId,
          network,
          dependency_type: 'contract',
          is_system_package: false,
          is_audited: true,
          is_upgradeable: false, // TODO: Check package metadata
          risk_score: riskScore,
          risk_level: riskLevel,
          last_analyzed: new Date().toISOString(),
          analysis_source: 'inherited',
        };

        // Save the risk record
        await saveDependencyRisk(depRisk);
        auditedCount++;

        if (riskScore >= HIGH_RISK_THRESHOLD) {
          highRiskCount++;
          warnings.push({
            type: 'high_risk',
            severity: riskScore >= CRITICAL_RISK_THRESHOLD ? 'critical' : 'warning',
            package_id: depId,
            message: `Dependency ${depId} has a high risk score (${riskScore})`,
          });
        }
      } else {
        // No analysis exists - mark as unaudited
        depRisk = {
          package_id: depId,
          network,
          dependency_type: 'unknown',
          is_system_package: false,
          is_audited: false,
          is_upgradeable: false,
          risk_score: null,
          risk_level: null,
          last_analyzed: null,
          analysis_source: null,
        };

        // Save as unaudited
        await saveDependencyRisk(depRisk);
        unauditedCount++;

        warnings.push({
          type: 'unaudited',
          severity: 'warning',
          package_id: depId,
          message: `Dependency ${depId} has not been audited`,
        });
      }
    } else {
      // Existing record
      if (depRisk.is_audited) {
        auditedCount++;
        if (depRisk.risk_score && depRisk.risk_score >= HIGH_RISK_THRESHOLD) {
          highRiskCount++;
          warnings.push({
            type: 'high_risk',
            severity: depRisk.risk_score >= CRITICAL_RISK_THRESHOLD ? 'critical' : 'warning',
            package_id: depId,
            message: `Dependency ${depId} has a high risk score (${depRisk.risk_score})`,
          });
        }
      } else {
        unauditedCount++;
        warnings.push({
          type: 'unaudited',
          severity: 'warning',
          package_id: depId,
          message: `Dependency ${depId} has not been audited`,
        });
      }

      if (depRisk.is_upgradeable) {
        warnings.push({
          type: 'upgradeable',
          severity: 'info',
          package_id: depId,
          message: `Dependency ${depId} is upgradeable and may change behavior`,
        });
      }
    }

    // Add non-system deps to risk list
    if (depRisk) {
      riskDependencies.push(depRisk);
    }
  }

  // Build summary
  const summary: DependencySummary = {
    total_dependencies: externalDeps.length,
    audited_count: auditedCount,
    unaudited_count: unauditedCount,
    high_risk_count: highRiskCount,
    system_packages: systemDeps.length,
    risk_dependencies: riskDependencies.filter(d =>
      !d.is_audited || (d.risk_score && d.risk_score >= HIGH_RISK_THRESHOLD)
    ),
  };

  const analysisTime = Date.now() - startTime;
  console.log(`[Dependencies] Analysis complete: ${summary.total_dependencies} deps, ${summary.audited_count} audited, ${summary.unaudited_count} unaudited, ${warnings.length} warnings in ${analysisTime}ms`);

  return {
    summary,
    warnings,
    analysis_time_ms: analysisTime,
  };
}

/**
 * Format dependency analysis for prompt context
 */
export function formatDependencyWarningsForPrompt(result: DependencyAnalysisResult): string {
  if (result.warnings.length === 0) {
    return 'All dependencies are audited with acceptable risk levels.';
  }

  const lines: string[] = [
    `Dependency Analysis: ${result.warnings.length} warning(s)`,
    '',
  ];

  // Group by severity
  const critical = result.warnings.filter(w => w.severity === 'critical');
  const warnings = result.warnings.filter(w => w.severity === 'warning');
  const info = result.warnings.filter(w => w.severity === 'info');

  if (critical.length > 0) {
    lines.push('CRITICAL:');
    for (const w of critical) {
      lines.push(`  - ${w.message}`);
    }
  }

  if (warnings.length > 0) {
    lines.push('WARNINGS:');
    for (const w of warnings) {
      lines.push(`  - ${w.message}`);
    }
  }

  if (info.length > 0) {
    lines.push('INFO:');
    for (const w of info) {
      lines.push(`  - ${w.message}`);
    }
  }

  return lines.join('\n');
}

/**
 * Calculate risk modifier based on dependencies
 * Returns a score modifier to add to the base risk score
 */
export function calculateDependencyRiskModifier(summary: DependencySummary): number {
  let modifier = 0;

  // Unaudited dependencies add risk
  if (summary.unaudited_count > 0) {
    modifier += Math.min(10, summary.unaudited_count * 3); // Up to +10 for unaudited
  }

  // High-risk dependencies add more risk
  if (summary.high_risk_count > 0) {
    modifier += Math.min(15, summary.high_risk_count * 5); // Up to +15 for high-risk deps
  }

  return modifier;
}
