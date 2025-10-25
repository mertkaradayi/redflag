'use client';

import { useState } from 'react';

interface SupabaseHealthResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

export default function SupabaseCheck() {
  const [healthData, setHealthData] = useState<SupabaseHealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkSupabaseHealth = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use environment variable for backend URL, default to localhost for development
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/supabase/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setHealthData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check Supabase health');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Supabase Database Connection
      </h3>
      
      <button
        onClick={checkSupabaseHealth}
        disabled={loading}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-purple-600 px-4 text-white transition-colors hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Testing...
          </>
        ) : (
          <>
            <div className="h-4 w-4 rounded-full bg-purple-400" />
            Test Supabase Connection
          </>
        )}
      </button>

      {healthData && (
        <div className={`p-4 rounded-lg border ${
          healthData.success 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <h4 className={`font-medium mb-2 ${
            healthData.success 
              ? 'text-green-900 dark:text-green-100' 
              : 'text-red-900 dark:text-red-100'
          }`}>
            {healthData.success ? '✅ Supabase Connected' : '❌ Supabase Connection Failed'}
          </h4>
          <div className={`text-sm space-y-1 ${
            healthData.success 
              ? 'text-green-700 dark:text-green-300' 
              : 'text-red-700 dark:text-red-300'
          }`}>
            <p><strong>Status:</strong> {healthData.success ? 'Connected' : 'Failed'}</p>
            <p><strong>Message:</strong> {healthData.message}</p>
            <p><strong>Timestamp:</strong> {new Date(healthData.timestamp).toLocaleString()}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">
            ❌ Connection Test Failed
          </h4>
          <p className="text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">
            Backend URL: {process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}
          </p>
        </div>
      )}
    </div>
  );
}
