'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBanner } from './StatusBanner';

interface SupabaseHealthResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function SupabaseCheck() {
  const [healthData, setHealthData] = useState<SupabaseHealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkSupabaseHealth = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${backendUrl}/api/supabase/health`);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data: SupabaseHealthResponse = await response.json();
      setHealthData(data);
    } catch (err) {
      setHealthData(null);
      setError(err instanceof Error ? err.message : 'Failed to check Supabase health');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Supabase Health</CardTitle>
        <CardDescription>Ensure the Supabase project is reachable via the API proxy.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4" aria-live="polite">
        <Button
          onClick={checkSupabaseHealth}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 focus-visible:outline-indigo-600"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Testing…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-white" />
              Test Supabase Connection
            </span>
          )}
        </Button>

        {healthData ? (
          <StatusBanner
            variant={healthData.success ? 'success' : 'error'}
            title={
              healthData.success ? 'Supabase connection succeeded' : 'Supabase connection failed'
            }
          >
            <p>
              <strong>Status:</strong> {healthData.success ? 'Connected' : 'Unavailable'}
            </p>
            <p>
              <strong>Message:</strong> {healthData.message}
            </p>
            <p>
              <strong>Timestamp:</strong> {new Date(healthData.timestamp).toLocaleString()}
            </p>
          </StatusBanner>
        ) : null}

        {error ? (
          <StatusBanner variant="error" title="Supabase check failed">
            <p>{error}</p>
            <p>
              <strong>Backend URL:</strong> {backendUrl}
            </p>
          </StatusBanner>
        ) : null}
      </CardContent>
    </Card>
  );
}
