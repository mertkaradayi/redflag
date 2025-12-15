'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RiskScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { dimension: 36, strokeWidth: 3, fontSize: 'text-[10px]', labelSize: 'text-[8px]' },
  md: { dimension: 48, strokeWidth: 4, fontSize: 'text-xs', labelSize: 'text-[9px]' },
  lg: { dimension: 64, strokeWidth: 5, fontSize: 'text-sm', labelSize: 'text-[10px]' },
};

function getScoreColor(score: number): string {
  if (score >= 80) return '#D12226'; // Critical red
  if (score >= 60) return '#f97316'; // Orange
  if (score >= 40) return '#eab308'; // Yellow
  return '#10b981'; // Emerald green
}

function getScoreGradientId(score: number): string {
  if (score >= 80) return 'gauge-gradient-critical';
  if (score >= 60) return 'gauge-gradient-high';
  if (score >= 40) return 'gauge-gradient-moderate';
  return 'gauge-gradient-low';
}

export function RiskScoreGauge({
  score,
  size = 'sm',
  showLabel = true,
  animated = true,
  className,
}: RiskScoreGaugeProps) {
  const [mounted, setMounted] = useState(false);
  const config = sizeConfig[size];
  const radius = (config.dimension - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100) / 100;
  const strokeDashoffset = circumference * (1 - progress);

  useEffect(() => {
    setMounted(true);
  }, []);

  const center = config.dimension / 2;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: config.dimension, height: config.dimension }}
    >
      <svg
        width={config.dimension}
        height={config.dimension}
        viewBox={`0 0 ${config.dimension} ${config.dimension}`}
        className="transform -rotate-90"
      >
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="gauge-gradient-critical" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D12226" />
            <stop offset="100%" stopColor="#ff6b6e" />
          </linearGradient>
          <linearGradient id="gauge-gradient-high" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
          <linearGradient id="gauge-gradient-moderate" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ca8a04" />
            <stop offset="100%" stopColor="#facc15" />
          </linearGradient>
          <linearGradient id="gauge-gradient-low" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>

        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          className="text-zinc-200 dark:text-zinc-800"
        />

        {/* Progress circle */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${getScoreGradientId(score)})`}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={animated ? { strokeDashoffset: circumference } : { strokeDashoffset }}
          animate={mounted ? { strokeDashoffset } : {}}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>

      {/* Center label */}
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={cn('font-bold tabular-nums leading-none', config.fontSize)}
            style={{ color: getScoreColor(score) }}
            initial={animated ? { opacity: 0, scale: 0.5 } : {}}
            animate={mounted ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            {score}
          </motion.span>
        </div>
      )}
    </div>
  );
}

export default RiskScoreGauge;
