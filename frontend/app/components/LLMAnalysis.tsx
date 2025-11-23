'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getRiskLevelBadge, getRiskLevelIcon, getRiskLevelName } from '@/app/dashboard/risk-utils';
import { cn } from '@/lib/utils';

interface SafetyCard {
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
}

interface LLMAnalysisProps {
  packageId?: string;
  network?: 'mainnet' | 'testnet';
}

export default function LLMAnalysis({ packageId: initialPackageId, network: initialNetwork = 'mainnet' }: LLMAnalysisProps) {
  const [packageId, setPackageId] = useState(initialPackageId || '');
  const [network, setNetwork] = useState<'mainnet' | 'testnet'>(initialNetwork);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<SafetyCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeContract = async () => {
    if (!packageId.trim()) {
      setError('Please enter a package ID');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/llm/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          package_id: packageId.trim(),
          network,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAnalysisResult(data.safetyCard);
      } else {
        setError(data.message || 'Analysis failed');
      }
    } catch (err) {
      setError('Failed to connect to analysis service');
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return 'text-[#ff6b6e]';
    if (score >= 50) return 'text-orange-200';
    if (score >= 30) return 'text-yellow-200';
    return 'text-emerald-200';
  };

  return (
    <div className="space-y-6" data-llm-analysis>
      {/* Analysis Input */}
      <div className="space-y-6">

        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5">
            <div className="space-y-2">
              <label htmlFor="packageId" className="block text-sm font-medium text-muted-foreground">
                Package ID
              </label>
              <input
                id="packageId"
                type="text"
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
                placeholder="0x..."
                className="w-full h-14 px-5 bg-white dark:bg-black border-2 border-neutral-200 dark:border-neutral-800 rounded-xl text-lg text-black dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#D12226] dark:focus:border-[#D12226] transition-all duration-200 shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="network" className="block text-sm font-medium text-muted-foreground">
                Network
              </label>
              <select
                id="network"
                value={network}
                onChange={(e) => setNetwork(e.target.value as 'mainnet' | 'testnet')}
                className="w-full h-14 px-5 bg-white dark:bg-black border-2 border-neutral-200 dark:border-neutral-800 rounded-xl text-lg text-black dark:text-white focus:outline-none focus:border-[#D12226] dark:focus:border-[#D12226] transition-all duration-200 cursor-pointer shadow-sm"
              >
                <option value="mainnet" className="bg-background dark:bg-black text-foreground dark:text-white">Mainnet</option>
                <option value="testnet" className="bg-background dark:bg-black text-foreground dark:text-white">Testnet</option>
              </select>
            </div>
          </div>

          <Button
            onClick={analyzeContract}
            disabled={isAnalyzing || !packageId.trim()}
            className={cn(
              "w-full py-3 text-base font-semibold transition-all duration-200",
              isAnalyzing || !packageId.trim()
                ? "bg-neutral-100 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-600 cursor-not-allowed"
                : "bg-[#D12226] text-white hover:bg-[#b91c1c] hover:shadow-lg hover:shadow-red-600/20 hover:scale-[1.02] active:scale-[0.98]"
            )}
          >
            {isAnalyzing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Analyzing...
              </span>
            ) : (
              'Start analysis'
            )}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-xl border border-[#D12226]/60 bg-[#D12226]/15 p-4 backdrop-blur">
          <p className="text-sm text-[#ff8a8c] font-medium">{error}</p>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="space-y-6 pt-6 border-t border-border dark:border-white/10">
          {/* Risk Summary */}
          <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h3 className="text-xl font-semibold text-foreground dark:text-white">Risk Assessment</h3>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide',
                    getRiskLevelBadge(analysisResult.risk_level),
                  )}
                >
                  {getRiskLevelIcon(analysisResult.risk_level)} {getRiskLevelName(analysisResult.risk_level)}
                </span>
                <span className={`text-3xl font-bold ${getRiskScoreColor(analysisResult.risk_score)}`}>
                  {analysisResult.risk_score}/100
                </span>
              </div>
            </div>
            <div className="space-y-5">
              <div>
                <h4 className="font-semibold mb-2 text-foreground dark:text-white text-sm uppercase tracking-wide">Summary</h4>
                <p className="text-muted-foreground leading-relaxed">{analysisResult.summary}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-foreground dark:text-white text-sm uppercase tracking-wide">Main Risk</h4>
                <p className="text-muted-foreground leading-relaxed">{analysisResult.why_risky_one_liner}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-foreground dark:text-white text-sm uppercase tracking-wide">Impact on Users</h4>
                <p className="text-muted-foreground leading-relaxed">{analysisResult.impact_on_user}</p>
              </div>
            </div>
          </div>

          {/* Risky Functions */}
          {analysisResult.risky_functions.length > 0 && (
            <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black p-6 shadow-lg">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground dark:text-white mb-1">Risky Functions</h3>
                <p className="text-sm text-muted-foreground">
                  Functions identified as potentially dangerous
                </p>
              </div>
              <div className="space-y-3">
                {analysisResult.risky_functions.map((func, index) => (
                  <div
                    key={index}
                    className="space-y-2 rounded-xl border border-[#D12226]/30 bg-[#D12226]/5 p-4 text-sm backdrop-blur transition hover:border-[#D12226]/50 hover:bg-[#D12226]/10"
                  >
                    <h5 className="font-semibold text-foreground dark:text-white">{func.function_name}</h5>
                    <p className="text-muted-foreground leading-relaxed">{func.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rug Pull Indicators */}
          {analysisResult.rug_pull_indicators.length > 0 && (
            <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black p-6 shadow-lg">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground dark:text-white mb-1">Rug Pull Indicators</h3>
                <p className="text-sm text-muted-foreground">
                  Patterns that suggest potential rug pull risks
                </p>
              </div>
              <div className="space-y-3">
                {analysisResult.rug_pull_indicators.map((indicator, index) => (
                  <div
                    key={index}
                    className="space-y-2 rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 text-sm backdrop-blur transition hover:border-orange-500/50 hover:bg-orange-500/10"
                  >
                    <h5 className="font-semibold text-foreground dark:text-white">{indicator.pattern_name}</h5>
                    <p className="text-muted-foreground leading-relaxed">{indicator.evidence}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safe Contract Message */}
          {analysisResult.risk_level === 'low' && analysisResult.risky_functions.length === 0 && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 backdrop-blur shadow-lg">
              <div className="text-center">
                <div className="text-emerald-400 text-6xl mb-4">✅</div>
                <h3 className="text-xl font-semibold text-emerald-200 mb-2">Contract Appears Safe</h3>
                <p className="text-emerald-300">
                  No significant security risks were detected in this contract.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
