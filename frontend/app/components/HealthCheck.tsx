'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBanner } from './StatusBanner';

interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
}

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export default function HealthCheck() {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${backendUrl}/health`);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data: HealthResponse = await response.json();
      setHealthData(data);
    } catch (err) {
      setHealthData(null);
      setError(err instanceof Error ? err.message : 'Failed to check health');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Backend Health</CardTitle>
        <CardDescription>Verify the FastAPI service is reachable and responding.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4" aria-live="polite">
        <Button
          onClick={checkHealth}
          disabled={loading}
          className="w-full"
          style={{
            backgroundColor: 'rgb(5 150 105)', // emerald-600
            color: 'white',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgb(4 120 87)'; // emerald-700
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgb(5 150 105)'; // emerald-600
          }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Checking…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-white" />
              Check Backend Health
            </span>
          )}
        </Button>

        {healthData ? (
          <StatusBanner variant="success" title="Backend is healthy">
            <p>
              <strong>Status:</strong> {healthData.status}
            </p>
            <p>
              <strong>Service:</strong> {healthData.service}
            </p>
            <p>
              <strong>Timestamp:</strong> {new Date(healthData.timestamp).toLocaleString()}
            </p>
          </StatusBanner>
        ) : null}

        {error ? (
          <StatusBanner variant="error" title="Backend check failed">
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
