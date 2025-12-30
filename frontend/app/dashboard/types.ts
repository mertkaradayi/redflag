// Sub-types for new analysis fields
export interface ConfidenceInterval {
  lower: number;
  upper: number;
}

export type ConfidenceLevel = "high" | "medium" | "low";

export interface AnalysisQuality {
  modules_analyzed: number;
  modules_total: number;
  functions_analyzed: number;
  functions_total: number;
  truncation_occurred: boolean;
  validation_rate: number;
  static_analysis_coverage: number;
}

export interface ValidationSummary {
  total: number;
  validated: number;
  unvalidated: number;
  invalid: number;
  avg_validation_score: number;
}

export type FindingSeverity = "Critical" | "High" | "Medium" | "Low";

export interface TechnicalFinding {
  function_name: string;
  technical_reason: string;
  matched_pattern_id: string;
  severity: FindingSeverity;
  evidence_code_snippet: string;
  contextual_notes?: string[];
}

export interface DependencySummary {
  total_dependencies: number;
  audited_count: number;
  unaudited_count: number;
  high_risk_count: number;
  system_packages: number;
}

export interface AnalyzedContract {
  package_id: string;
  network: "mainnet" | "testnet";
  analysis: {
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
    risk_level: "low" | "moderate" | "high" | "critical";

    // Confidence metrics (optional for backward compatibility)
    confidence_interval?: ConfidenceInterval;
    confidence_level?: ConfidenceLevel;
    analysis_quality?: AnalysisQuality;
    limitations?: string[];

    // Validation summary (optional)
    validation_summary?: ValidationSummary;

    // Technical findings with evidence (optional)
    technical_findings?: TechnicalFinding[];

    // Dependency audit status (optional)
    dependency_summary?: DependencySummary;
  };
  analyzed_at: string;

  // Deployment metadata from blockchain (optional for backward compatibility)
  deployment?: {
    timestamp: string;
    deployer_address: string;
    tx_digest: string;
    checkpoint: number;
  } | null;
}

export interface DashboardData {
  success: boolean;
  total: number;           // Total matching records
  limit: number;           // Page size
  offset: number;          // Current offset
  contracts: AnalyzedContract[];
  risk_counts?: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
  last_updated?: string;
  message?: string;
  timestamp?: string;
}
