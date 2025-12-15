/**
 * Confidence Calculator - Analysis Quality & Uncertainty Quantification
 *
 * Calculates confidence intervals and quality metrics so users know
 * when to trust automated analysis vs seek manual review.
 */

import type { ValidationResult } from './evidence-validator';
import type { StaticAnalysisResult } from './static-analyzer';
import type { CrossModuleAnalysisResult } from './cross-module-analyzer';

// ================================================================
// TYPES
// ================================================================

export interface ConfidenceInterval {
  lower: number;  // Lower bound of risk score confidence (0-100)
  upper: number;  // Upper bound of risk score confidence (0-100)
  width: number;  // Interval width (lower = more confident)
}

export interface AnalysisQuality {
  modules_analyzed: number;
  modules_total: number;
  functions_analyzed: number;
  functions_total: number;
  truncation_occurred: boolean;
  truncated_modules: string[];
  validation_rate: number;           // 0-100%
  static_analysis_coverage: number;  // 0-100%
  cross_module_coverage: number;     // 0-100%
  llm_agreement_rate: number;        // How much LLM agrees with static analysis
}

export interface AnalysisLimitation {
  type: 'truncation' | 'validation' | 'coverage' | 'complexity' | 'timeout';
  severity: 'minor' | 'moderate' | 'significant';
  description: string;
  affected_area?: string;
}

export interface ConfidenceMetrics {
  confidence_interval: ConfidenceInterval;
  confidence_level: 'high' | 'medium' | 'low';
  analysis_quality: AnalysisQuality;
  limitations: AnalysisLimitation[];
  recommendations: string[];
}

export interface MetricsCollector {
  // Timing
  start_time: number;
  end_time?: number;

  // Module info
  total_modules: number;
  analyzed_modules: number;
  truncated_modules: string[];

  // Function info
  total_functions: number;
  analyzed_functions: number;

  // Bytecode info
  total_bytecode_size: number;
  analyzed_bytecode_size: number;

  // Static analysis
  static_findings_count: number;
  static_analysis_ran: boolean;

  // Cross-module
  cross_module_ran: boolean;
  capabilities_found: number;
  flows_found: number;
  cross_module_risks: number;

  // LLM analysis
  llm_findings_count: number;
  llm_errors: string[];

  // Validation
  validated_count: number;
  unvalidated_count: number;
  invalid_count: number;
  avg_validation_score: number;
}

// ================================================================
// METRICS COLLECTOR
// ================================================================

/**
 * Create a new metrics collector for an analysis run
 */
export function createMetricsCollector(): MetricsCollector {
  return {
    start_time: Date.now(),
    total_modules: 0,
    analyzed_modules: 0,
    truncated_modules: [],
    total_functions: 0,
    analyzed_functions: 0,
    total_bytecode_size: 0,
    analyzed_bytecode_size: 0,
    static_findings_count: 0,
    static_analysis_ran: false,
    cross_module_ran: false,
    capabilities_found: 0,
    flows_found: 0,
    cross_module_risks: 0,
    llm_findings_count: 0,
    llm_errors: [],
    validated_count: 0,
    unvalidated_count: 0,
    invalid_count: 0,
    avg_validation_score: 0,
  };
}

/**
 * Update metrics from disassembled code analysis
 */
export function updateFromBytecode(
  collector: MetricsCollector,
  disassembledCode: Record<string, string>,
  publicFunctions: any[]
): void {
  collector.total_modules = Object.keys(disassembledCode).length;
  collector.analyzed_modules = Object.keys(disassembledCode).length;
  collector.total_functions = publicFunctions.length;
  collector.analyzed_functions = publicFunctions.length;

  // Calculate bytecode size
  let totalSize = 0;
  for (const code of Object.values(disassembledCode)) {
    totalSize += code.length;
  }
  collector.total_bytecode_size = totalSize;
  collector.analyzed_bytecode_size = totalSize;
}

/**
 * Update metrics from static analysis
 */
export function updateFromStaticAnalysis(
  collector: MetricsCollector,
  staticResult: StaticAnalysisResult
): void {
  collector.static_analysis_ran = true;
  collector.static_findings_count = staticResult.findings.length;
}

/**
 * Update metrics from cross-module analysis
 */
export function updateFromCrossModule(
  collector: MetricsCollector,
  crossModule: CrossModuleAnalysisResult
): void {
  collector.cross_module_ran = true;
  collector.capabilities_found = crossModule.capabilities.length;
  collector.flows_found = crossModule.flows.length;
  collector.cross_module_risks = crossModule.risks.length;
}

/**
 * Update metrics from validation results
 */
export function updateFromValidation(
  collector: MetricsCollector,
  validation: ValidationResult
): void {
  collector.validated_count = validation.validation_summary.validated;
  collector.unvalidated_count = validation.validation_summary.unvalidated;
  collector.invalid_count = validation.validation_summary.invalid;
  collector.avg_validation_score = validation.validation_summary.avg_validation_score;
}

/**
 * Update metrics from LLM analysis
 */
export function updateFromLLM(
  collector: MetricsCollector,
  findingsCount: number,
  errors: string[] = []
): void {
  collector.llm_findings_count = findingsCount;
  collector.llm_errors = errors;
}

/**
 * Mark truncation occurred for a module
 */
export function markTruncation(
  collector: MetricsCollector,
  moduleName: string
): void {
  if (!collector.truncated_modules.includes(moduleName)) {
    collector.truncated_modules.push(moduleName);
  }
}

/**
 * Finalize metrics collection
 */
export function finalizeMetrics(collector: MetricsCollector): void {
  collector.end_time = Date.now();
}

// ================================================================
// CONFIDENCE CALCULATION
// ================================================================

/**
 * Calculate confidence metrics from collected data
 */
export function calculateConfidence(
  collector: MetricsCollector,
  riskScore: number
): ConfidenceMetrics {
  const quality = calculateQuality(collector);
  const limitations = identifyLimitations(collector, quality);
  const interval = calculateInterval(riskScore, quality, limitations);
  const level = determineConfidenceLevel(interval, quality);
  const recommendations = generateRecommendations(level, limitations);

  return {
    confidence_interval: interval,
    confidence_level: level,
    analysis_quality: quality,
    limitations,
    recommendations,
  };
}

/**
 * Calculate analysis quality metrics
 */
function calculateQuality(collector: MetricsCollector): AnalysisQuality {
  // Validation rate
  const totalValidated = collector.validated_count + collector.unvalidated_count + collector.invalid_count;
  const validationRate = totalValidated > 0
    ? (collector.validated_count / totalValidated) * 100
    : 0;

  // Static analysis coverage (based on findings vs functions)
  const staticCoverage = collector.total_functions > 0
    ? Math.min(100, (collector.static_findings_count / collector.total_functions) * 100)
    : 0;

  // Cross-module coverage
  const crossModuleCoverage = collector.cross_module_ran
    ? (collector.capabilities_found > 0 ? 100 : 50)
    : 0;

  // LLM agreement rate (how much LLM findings align with static)
  const llmAgreement = collector.static_findings_count > 0 && collector.llm_findings_count > 0
    ? Math.min(100, (Math.min(collector.static_findings_count, collector.llm_findings_count) /
                     Math.max(collector.static_findings_count, collector.llm_findings_count)) * 100)
    : 50;

  return {
    modules_analyzed: collector.analyzed_modules,
    modules_total: collector.total_modules,
    functions_analyzed: collector.analyzed_functions,
    functions_total: collector.total_functions,
    truncation_occurred: collector.truncated_modules.length > 0,
    truncated_modules: collector.truncated_modules,
    validation_rate: Math.round(validationRate),
    static_analysis_coverage: Math.round(staticCoverage),
    cross_module_coverage: Math.round(crossModuleCoverage),
    llm_agreement_rate: Math.round(llmAgreement),
  };
}

/**
 * Identify limitations in the analysis
 */
function identifyLimitations(
  collector: MetricsCollector,
  quality: AnalysisQuality
): AnalysisLimitation[] {
  const limitations: AnalysisLimitation[] = [];

  // Truncation limitations
  if (quality.truncation_occurred) {
    limitations.push({
      type: 'truncation',
      severity: quality.truncated_modules.length > 2 ? 'significant' : 'moderate',
      description: `${quality.truncated_modules.length} module(s) were truncated due to size limits`,
      affected_area: quality.truncated_modules.join(', '),
    });
  }

  // Validation limitations
  if (quality.validation_rate < 50) {
    limitations.push({
      type: 'validation',
      severity: quality.validation_rate < 30 ? 'significant' : 'moderate',
      description: `Only ${quality.validation_rate}% of findings could be validated against bytecode`,
    });
  }

  // Coverage limitations
  if (quality.modules_analyzed < quality.modules_total) {
    limitations.push({
      type: 'coverage',
      severity: 'moderate',
      description: `Only ${quality.modules_analyzed}/${quality.modules_total} modules were analyzed`,
    });
  }

  // Complexity limitations (large contracts)
  if (collector.total_bytecode_size > 500000) {
    limitations.push({
      type: 'complexity',
      severity: 'minor',
      description: 'Large contract size may affect analysis depth',
    });
  }

  // LLM errors
  if (collector.llm_errors.length > 0) {
    limitations.push({
      type: 'timeout',
      severity: 'moderate',
      description: `${collector.llm_errors.length} LLM error(s) occurred during analysis`,
    });
  }

  // Low static coverage
  if (quality.static_analysis_coverage < 20 && collector.total_functions > 5) {
    limitations.push({
      type: 'coverage',
      severity: 'minor',
      description: 'Low static analysis coverage - contract may use uncommon patterns',
    });
  }

  return limitations;
}

/**
 * Calculate confidence interval for the risk score
 */
function calculateInterval(
  riskScore: number,
  quality: AnalysisQuality,
  limitations: AnalysisLimitation[]
): ConfidenceInterval {
  // Base interval width depends on validation rate and coverage
  let baseWidth = 20; // Default uncertainty of ±10 points

  // Adjust based on validation rate
  if (quality.validation_rate >= 80) {
    baseWidth -= 8; // High validation = narrow interval
  } else if (quality.validation_rate >= 50) {
    baseWidth -= 4;
  } else if (quality.validation_rate < 30) {
    baseWidth += 10; // Low validation = wider interval
  }

  // Adjust based on truncation
  if (quality.truncation_occurred) {
    baseWidth += 5 * quality.truncated_modules.length;
  }

  // Adjust based on limitations
  for (const limitation of limitations) {
    if (limitation.severity === 'significant') {
      baseWidth += 8;
    } else if (limitation.severity === 'moderate') {
      baseWidth += 4;
    } else {
      baseWidth += 2;
    }
  }

  // Adjust based on static/LLM agreement
  if (quality.llm_agreement_rate >= 70) {
    baseWidth -= 5; // Good agreement = more confidence
  } else if (quality.llm_agreement_rate < 40) {
    baseWidth += 5; // Poor agreement = less confidence
  }

  // Cap the width
  baseWidth = Math.min(50, Math.max(10, baseWidth));

  // Calculate bounds
  const halfWidth = baseWidth / 2;
  const lower = Math.max(0, Math.round(riskScore - halfWidth));
  const upper = Math.min(100, Math.round(riskScore + halfWidth));

  return {
    lower,
    upper,
    width: upper - lower,
  };
}

/**
 * Determine confidence level based on interval and quality
 */
function determineConfidenceLevel(
  interval: ConfidenceInterval,
  quality: AnalysisQuality
): 'high' | 'medium' | 'low' {
  // High confidence: narrow interval + good validation
  if (interval.width <= 15 && quality.validation_rate >= 70) {
    return 'high';
  }

  // Low confidence: wide interval or poor validation
  if (interval.width >= 30 || quality.validation_rate < 40) {
    return 'low';
  }

  // Medium confidence: everything else
  return 'medium';
}

/**
 * Generate recommendations based on confidence level and limitations
 */
function generateRecommendations(
  level: 'high' | 'medium' | 'low',
  limitations: AnalysisLimitation[]
): string[] {
  const recommendations: string[] = [];

  if (level === 'low') {
    recommendations.push('Manual security review strongly recommended due to analysis limitations');
  } else if (level === 'medium') {
    recommendations.push('Consider manual review for critical functionality');
  }

  // Add specific recommendations based on limitations
  for (const limitation of limitations) {
    if (limitation.type === 'truncation' && limitation.severity === 'significant') {
      recommendations.push('Large modules were truncated - review full bytecode manually');
    }
    if (limitation.type === 'validation' && limitation.severity !== 'minor') {
      recommendations.push('Many findings could not be validated - verify against source code if available');
    }
  }

  // Always add a positive recommendation for high confidence
  if (level === 'high' && recommendations.length === 0) {
    recommendations.push('Analysis has high confidence - automated findings are reliable');
  }

  return recommendations;
}

// ================================================================
// FORMATTING
// ================================================================

/**
 * Format confidence metrics for API response
 */
export function formatConfidenceForResponse(metrics: ConfidenceMetrics): {
  confidence_interval: { lower: number; upper: number };
  confidence_level: string;
  analysis_quality: AnalysisQuality;
  limitations: string[];
} {
  return {
    confidence_interval: {
      lower: metrics.confidence_interval.lower,
      upper: metrics.confidence_interval.upper,
    },
    confidence_level: metrics.confidence_level,
    analysis_quality: metrics.analysis_quality,
    limitations: metrics.limitations.map(l => l.description),
  };
}
