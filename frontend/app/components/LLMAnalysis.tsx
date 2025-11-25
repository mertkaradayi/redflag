'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getRiskLevelBadge, getRiskLevelIcon, getRiskLevelName } from '@/app/dashboard/risk-utils';
import { cn } from '@/lib/utils';
import { ArrowRight, ShieldCheck, AlertTriangle, FileCode } from 'lucide-react';

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
    <div className="space-y-8" data-llm-analysis>
      {/* Analysis Input */}
      <div className="space-y-6">

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-2">
              <label htmlFor="packageId" className="block text-sm font-medium text-muted-foreground ml-1">
                Package ID
              </label>
              <input
                id="packageId"
                type="text"
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
                placeholder="0x..."
                className="w-full h-12 px-6 bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-full text-base text-black dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all duration-200 shadow-sm dark:shadow-none backdrop-blur-sm dark:backdrop-blur-none"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="network" className="block text-sm font-medium text-muted-foreground ml-1">
                Network
              </label>
              <div className="relative">
                <select
                  id="network"
                  value={network}
                  onChange={(e) => setNetwork(e.target.value as 'mainnet' | 'testnet')}
                  className="w-full h-12 px-6 bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-full text-base text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all duration-200 cursor-pointer shadow-sm dark:shadow-none appearance-none backdrop-blur-sm dark:backdrop-blur-none"
                >
                  <option value="mainnet" className="bg-background dark:bg-black text-foreground dark:text-white">Mainnet</option>
                  <option value="testnet" className="bg-background dark:bg-black text-foreground dark:text-white">Testnet</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-neutral-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={analyzeContract}
            disabled={isAnalyzing || !packageId.trim()}
            className={cn(
              "w-full h-12 text-base font-medium rounded-full transition-all duration-200 shadow-xl",
              isAnalyzing || !packageId.trim()
                ? "bg-neutral-100 dark:bg-black text-neutral-400 dark:text-neutral-500 cursor-not-allowed shadow-none"
                : "bg-[#D12226] text-white hover:bg-[#b91c1c] shadow-red-500/20 hover:shadow-red-500/40 hover:scale-[1.01] active:scale-[0.99]"
            )}
          >
            {isAnalyzing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Analyzing Contract...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Run Analysis <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-2xl border border-[#D12226]/30 bg-[#D12226]/10 p-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-[#ff6b6e]" />
            <p className="text-sm text-[#ff8a8c] font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {/* Risk Summary Card */}
          <div className="rounded-3xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black p-6 md:p-8 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <ShieldCheck className="w-32 h-32" />
            </div>

            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-foreground dark:text-white tracking-tight">Risk Assessment</h3>
                  <p className="text-muted-foreground mt-1">AI-generated security report</p>
                </div>
                <div className="flex items-center gap-4 bg-neutral-50 dark:bg-black p-2 pr-6 rounded-full border border-neutral-100 dark:border-neutral-800">
                  <div className={cn(
                    'flex items-center justify-center w-12 h-12 rounded-full',
                    analysisResult.risk_level === 'critical' || analysisResult.risk_level === 'high' ? 'bg-red-500/10 text-red-500' :
                      analysisResult.risk_level === 'moderate' ? 'bg-orange-500/10 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'
                  )}>
                    {getRiskLevelIcon(analysisResult.risk_level)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score</span>
                    <span className={`text-2xl font-bold leading-none ${getRiskScoreColor(analysisResult.risk_score)}`}>
                      {analysisResult.risk_score}/100
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Summary
                    </h4>
                    <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed text-sm md:text-base">
                      {analysisResult.summary}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Impact
                    </h4>
                    <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed text-sm md:text-base">
                      {analysisResult.impact_on_user}
                    </p>
                  </div>
                </div>

                <div className="bg-neutral-50 dark:bg-black rounded-2xl p-6 border border-neutral-100 dark:border-white/5">
                  <h4 className="text-sm font-semibold text-foreground dark:text-white uppercase tracking-wider mb-4">Critical Finding</h4>
                  <p className="text-lg font-medium text-foreground dark:text-white leading-relaxed">
                    "{analysisResult.why_risky_one_liner}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Findings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Risky Functions */}
            {analysisResult.risky_functions.length > 0 && (
              <div className="rounded-3xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black p-6 shadow-lg h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground dark:text-white">Risky Functions</h3>
                </div>

                <div className="space-y-3">
                  {analysisResult.risky_functions.map((func, index) => (
                    <div
                      key={index}
                      className="group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-black p-4 transition-all hover:border-red-500/30 hover:bg-red-500/5"
                    >
                      <h5 className="font-mono text-sm font-semibold text-red-600 dark:text-red-400 mb-2">{func.function_name}</h5>
                      <p className="text-sm text-muted-foreground leading-relaxed">{func.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rug Pull Indicators */}
            {analysisResult.rug_pull_indicators.length > 0 && (
              <div className="rounded-3xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black p-6 shadow-lg h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground dark:text-white">Rug Pull Indicators</h3>
                </div>

                <div className="space-y-3">
                  {analysisResult.rug_pull_indicators.map((indicator, index) => (
                    <div
                      key={index}
                      className="group rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/20 p-4 transition-all hover:border-orange-500/30 hover:bg-orange-500/5"
                    >
                      <h5 className="font-semibold text-foreground dark:text-white text-sm mb-2">{indicator.pattern_name}</h5>
                      <p className="text-sm text-muted-foreground leading-relaxed">{indicator.evidence}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Safe Contract Message */}
          {analysisResult.risk_level === 'low' && analysisResult.risky_functions.length === 0 && (
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-8 backdrop-blur shadow-lg text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mb-2">Contract Appears Safe</h3>
              <p className="text-emerald-600/80 dark:text-emerald-500/80 max-w-md mx-auto">
                Our AI agents did not detect any significant security risks or malicious patterns in this contract.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
