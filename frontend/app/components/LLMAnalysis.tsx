'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
      case 'high': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800';
      case 'moderate': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800';
      case 'low': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-600 dark:text-red-400';
    if (score >= 50) return 'text-orange-600 dark:text-orange-400';
    if (score >= 30) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <div className="space-y-6" data-llm-analysis>
      {/* Analysis Input */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Security Analysis</CardTitle>
          <CardDescription>
            Analyze Sui smart contracts for security risks using AI-powered analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="packageId" className="block text-sm font-medium mb-2">
                Package ID
              </label>
              <input
                id="packageId"
                type="text"
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="network" className="block text-sm font-medium mb-2">
                Network
              </label>
              <select
                id="network"
                value={network}
                onChange={(e) => setNetwork(e.target.value as 'mainnet' | 'testnet')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="mainnet">Mainnet</option>
                <option value="testnet">Testnet</option>
              </select>
            </div>
          </div>
          
          <Button 
            onClick={analyzeContract} 
            disabled={isAnalyzing || !packageId.trim()}
            className="w-full"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Contract'}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="space-y-4">
          {/* Risk Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Risk Assessment</span>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(analysisResult.risk_level)}`}>
                    {analysisResult.risk_level.toUpperCase()}
                  </span>
                  <span className={`text-2xl font-bold ${getRiskScoreColor(analysisResult.risk_score)}`}>
                    {analysisResult.risk_score}/100
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2 text-zinc-900 dark:text-zinc-100">Summary</h4>
                <p className="text-zinc-700 dark:text-zinc-300">{analysisResult.summary}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2 text-zinc-900 dark:text-zinc-100">Main Risk</h4>
                <p className="text-zinc-700 dark:text-zinc-300">{analysisResult.why_risky_one_liner}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2 text-zinc-900 dark:text-zinc-100">Impact on Users</h4>
                <p className="text-zinc-700 dark:text-zinc-300">{analysisResult.impact_on_user}</p>
              </div>
            </CardContent>
          </Card>

          {/* Risky Functions */}
          {analysisResult.risky_functions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Risky Functions</CardTitle>
                <CardDescription>
                  Functions identified as potentially dangerous
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisResult.risky_functions.map((func, index) => (
                    <div key={index} className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-md">
                      <h5 className="font-medium text-red-800 dark:text-red-200">{func.function_name}</h5>
                      <p className="text-red-700 dark:text-red-300 text-sm mt-1">{func.reason}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rug Pull Indicators */}
          {analysisResult.rug_pull_indicators.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Rug Pull Indicators</CardTitle>
                <CardDescription>
                  Patterns that suggest potential rug pull risks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisResult.rug_pull_indicators.map((indicator, index) => (
                    <div key={index} className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md">
                      <h5 className="font-medium text-orange-800 dark:text-orange-200">{indicator.pattern_name}</h5>
                      <p className="text-orange-700 dark:text-orange-300 text-sm mt-1">{indicator.evidence}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Safe Contract Message */}
          {analysisResult.risk_level === 'low' && analysisResult.risky_functions.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-green-600 dark:text-green-400 text-6xl mb-4">✅</div>
                  <h3 className="text-xl font-semibold text-green-800 dark:text-green-200 mb-2">Contract Appears Safe</h3>
                  <p className="text-green-700 dark:text-green-300">
                    No significant security risks were detected in this contract.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
