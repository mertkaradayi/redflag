'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

interface AnalyzedContract {
  package_id: string;
  network: 'mainnet' | 'testnet';
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
    risk_level: 'low' | 'moderate' | 'high' | 'critical';
    timestamp: string;
  };
  analyzed_at: string;
}

interface DashboardData {
  success: boolean;
  total: number;
  contracts: AnalyzedContract[];
}

const getRiskLevelColor = (level: string) => {
  switch (level) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getRiskLevelIcon = (level: string) => {
  switch (level) {
    case 'critical': return '🚨';
    case 'high': return '⚠️';
    case 'moderate': return '⚡';
    case 'low': return '✅';
    default: return '❓';
  }
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'moderate' | 'low'>('all');

  const fetchAnalyzedContracts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/api/llm/analyzed-contracts');
      const result = await response.json();
      
      if (result.success) {
        setData(result);
      } else {
        setError(result.message || 'Failed to fetch analyzed contracts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyzedContracts();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAnalyzedContracts, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredContracts = data?.contracts.filter(contract => 
    filter === 'all' || contract.analysis.risk_level === filter
  ) || [];

  const riskStats = data ? {
    total: data.total,
    critical: data.contracts.filter(c => c.analysis.risk_level === 'critical').length,
    high: data.contracts.filter(c => c.analysis.risk_level === 'high').length,
    moderate: data.contracts.filter(c => c.analysis.risk_level === 'moderate').length,
    low: data.contracts.filter(c => c.analysis.risk_level === 'low').length,
  } : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <div className="container mx-auto px-6 py-16">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-zinc-600 dark:text-zinc-300">Loading analyzed contracts...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="container mx-auto px-6 py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              Contract Analysis Dashboard
            </h1>
            <p className="text-zinc-600 dark:text-zinc-300">
              Monitor and analyze smart contract security risks
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={fetchAnalyzedContracts} variant="outline">
              🔄 Refresh
            </Button>
            <Link href="/analyze">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                ➕ Analyze New Contract
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        {riskStats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {riskStats.total}
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">Total Analyzed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-red-600">
                  {riskStats.critical}
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">Critical Risk</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-orange-600">
                  {riskStats.high}
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">High Risk</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-yellow-600">
                  {riskStats.moderate}
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">Moderate Risk</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-green-600">
                  {riskStats.low}
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">Low Risk</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'critical', 'high', 'moderate', 'low'].map((level) => (
            <Button
              key={level}
              variant={filter === level ? 'default' : 'outline'}
              onClick={() => setFilter(level as any)}
              className={filter === level ? 'bg-purple-600 text-white' : ''}
            >
              {level === 'all' ? 'All' : level.charAt(0).toUpperCase() + level.slice(1)}
              {level !== 'all' && riskStats && (
                <span className="ml-2 px-2 py-1 bg-white/20 rounded-full text-xs">
                  {riskStats[level as keyof typeof riskStats]}
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Contracts List */}
        <div className="space-y-4">
          {filteredContracts.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  No analyzed contracts found
                </h3>
                <p className="text-zinc-600 dark:text-zinc-300 mb-4">
                  {filter === 'all' 
                    ? 'Start by analyzing your first smart contract.'
                    : `No contracts with ${filter} risk level found.`
                  }
                </p>
                <Link href="/analyze">
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                    Analyze Contract
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            filteredContracts.map((contract) => (
              <Card key={`${contract.package_id}-${contract.network}`} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-mono text-zinc-900 dark:text-zinc-100 break-all">
                        {contract.package_id}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {contract.network} • Analyzed {new Date(contract.analyzed_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getRiskLevelColor(contract.analysis.risk_level)}`}>
                      {getRiskLevelIcon(contract.analysis.risk_level)} {contract.analysis.risk_level.toUpperCase()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Risk Score */}
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-zinc-600 dark:text-zinc-300">Risk Score:</div>
                      <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            contract.analysis.risk_score >= 80 ? 'bg-red-500' :
                            contract.analysis.risk_score >= 60 ? 'bg-orange-500' :
                            contract.analysis.risk_score >= 40 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${contract.analysis.risk_score}%` }}
                        ></div>
                      </div>
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {contract.analysis.risk_score}/100
                      </div>
                    </div>

                    {/* Summary */}
                    <div>
                      <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">Summary</h4>
                      <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        {contract.analysis.summary}
                      </p>
                    </div>

                    {/* Risky Functions */}
                    {contract.analysis.risky_functions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                          Risky Functions ({contract.analysis.risky_functions.length})
                        </h4>
                        <div className="space-y-2">
                          {contract.analysis.risky_functions.slice(0, 3).map((func, index) => (
                            <div key={index} className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                              <div className="font-mono text-sm text-red-800 dark:text-red-200">
                                {func.function_name}
                              </div>
                              <div className="text-xs text-red-600 dark:text-red-300 mt-1">
                                {func.reason}
                              </div>
                            </div>
                          ))}
                          {contract.analysis.risky_functions.length > 3 && (
                            <div className="text-xs text-zinc-500">
                              +{contract.analysis.risky_functions.length - 3} more functions
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rug Pull Indicators */}
                    {contract.analysis.rug_pull_indicators.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                          Rug Pull Indicators ({contract.analysis.rug_pull_indicators.length})
                        </h4>
                        <div className="space-y-2">
                          {contract.analysis.rug_pull_indicators.slice(0, 2).map((indicator, index) => (
                            <div key={index} className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                              <div className="font-medium text-sm text-orange-800 dark:text-orange-200">
                                {indicator.pattern_name}
                              </div>
                              <div className="text-xs text-orange-600 dark:text-orange-300 mt-1">
                                {indicator.evidence}
                              </div>
                            </div>
                          ))}
                          {contract.analysis.rug_pull_indicators.length > 2 && (
                            <div className="text-xs text-zinc-500">
                              +{contract.analysis.rug_pull_indicators.length - 2} more indicators
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Impact */}
                    <div>
                      <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">User Impact</h4>
                      <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        {contract.analysis.impact_on_user}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
