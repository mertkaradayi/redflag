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
  };
  analyzed_at: string;
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
