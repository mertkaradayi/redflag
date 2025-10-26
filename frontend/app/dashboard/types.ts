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
    timestamp: string;
  };
  analyzed_at: string;
}

export interface DashboardData {
  success: boolean;
  total: number;
  contracts: AnalyzedContract[];
}
