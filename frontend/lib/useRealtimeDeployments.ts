'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from './supabase';
import type { Deployment } from './deployments';
import type { RealtimeChannel, RealtimePostgresInsertPayload } from '@supabase/supabase-js';

interface RealtimeDeploymentPayload {
  package_id: string;
  deployer_address: string;
  tx_digest: string;
  checkpoint: number;
  timestamp: string;
  first_seen_at: string;
  network?: 'mainnet' | 'testnet';
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseRealtimeDeploymentsOptions {
  enabled?: boolean;
  onNewDeployment?: (deployment: Deployment) => void;
  networkFilter?: 'all' | 'mainnet' | 'testnet';
}

interface UseRealtimeDeploymentsReturn {
  status: ConnectionStatus;
  reconnect: () => void;
}

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useRealtimeDeployments({
  enabled = true,
  onNewDeployment,
  networkFilter = 'all',
}: UseRealtimeDeploymentsOptions = {}): UseRealtimeDeploymentsReturn {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onNewDeploymentRef = useRef(onNewDeployment);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const enabledRef = useRef(enabled);
  const networkFilterRef = useRef(networkFilter);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  // Keep refs updated
  useEffect(() => {
    onNewDeploymentRef.current = onNewDeployment;
  }, [onNewDeployment]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    networkFilterRef.current = networkFilter;
  }, [networkFilter]);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const unsubscribe = useCallback(() => {
    clearReconnectTimeout();
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      console.log('[Realtime] Unsubscribed from sui_package_deployments');
    }
  }, [clearReconnectTimeout]);

  // Use a ref for subscribe to break circular dependency
  const subscribeRef = useRef<() => void>(() => {});

  const scheduleReconnect = useCallback(() => {
    clearReconnectTimeout();

    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[Realtime] Max reconnect attempts reached');
      setStatus('error');
      return;
    }

    reconnectAttemptsRef.current += 1;
    const delay = RECONNECT_DELAY * reconnectAttemptsRef.current;
    console.log(`[Realtime] Scheduling reconnect attempt ${reconnectAttemptsRef.current} in ${delay}ms`);

    reconnectTimeoutRef.current = setTimeout(() => {
      subscribeRef.current();
    }, delay);
  }, [clearReconnectTimeout]);

  const subscribe = useCallback(() => {
    if (!enabledRef.current) {
      setStatus('disconnected');
      return;
    }

    // Clean up existing connection first
    if (channelRef.current) {
      unsubscribe();
    }

    setStatus('connecting');

    const channel = supabase
      .channel('sui-deployments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sui_package_deployments',
        },
        (payload: RealtimePostgresInsertPayload<RealtimeDeploymentPayload>) => {
          const newRecord = payload.new;
          if (newRecord && onNewDeploymentRef.current) {
            // Filter by network if a specific network is selected
            const currentFilter = networkFilterRef.current;
            if (currentFilter !== 'all' && newRecord.network && newRecord.network !== currentFilter) {
              // Skip deployments that don't match the network filter
              return;
            }

            const deployment: Deployment = {
              package_id: newRecord.package_id,
              deployer_address: newRecord.deployer_address,
              tx_digest: newRecord.tx_digest,
              checkpoint: newRecord.checkpoint,
              timestamp: newRecord.timestamp,
              first_seen_at: newRecord.first_seen_at,
              network: newRecord.network,
            };
            onNewDeploymentRef.current(deployment);
          }
        }
      )
      .subscribe((subscriptionStatus, err) => {
        switch (subscriptionStatus) {
          case 'SUBSCRIBED':
            console.log('[Realtime] Subscribed to sui_package_deployments');
            setStatus('connected');
            reconnectAttemptsRef.current = 0; // Reset on successful connection
            break;
          case 'CHANNEL_ERROR':
            console.error('[Realtime] Channel error:', err);
            setStatus('error');
            scheduleReconnect();
            break;
          case 'TIMED_OUT':
            console.warn('[Realtime] Connection timed out');
            setStatus('disconnected');
            scheduleReconnect();
            break;
          case 'CLOSED':
            console.log('[Realtime] Channel closed');
            setStatus('disconnected');
            // Only reconnect if still enabled
            if (enabledRef.current) {
              scheduleReconnect();
            }
            break;
        }
      });

    channelRef.current = channel;
  }, [unsubscribe, scheduleReconnect]);

  // Keep subscribe ref updated
  useEffect(() => {
    subscribeRef.current = subscribe;
  }, [subscribe]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    subscribe();
  }, [subscribe]);

  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);

  return { status, reconnect };
}
