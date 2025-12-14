'use client';

import { useEffect, useState } from 'react';

/**
 * Hook that returns a tick value that increments every `interval` ms.
 * Use this to force re-renders for time-based displays (e.g., "5m ago").
 */
export function useTimeTick(interval: number = 60000): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return tick;
}
