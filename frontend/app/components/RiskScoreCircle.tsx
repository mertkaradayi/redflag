'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RiskScoreCircleProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  animate?: boolean;
}

function getScoreColor(score: number) {
  // Saturated colors matching the filter/badge colors
  if (score >= 70) return { stroke: '#D12226', text: 'text-[#D12226] dark:text-[#ff6b6e]', glow: 'rgba(209, 34, 38, 0.35)' };
  if (score >= 50) return { stroke: '#F97316', text: 'text-orange-500 dark:text-orange-400', glow: 'rgba(249, 115, 22, 0.35)' };
  if (score >= 30) return { stroke: '#EAB308', text: 'text-yellow-500 dark:text-yellow-400', glow: 'rgba(234, 179, 8, 0.35)' };
  return { stroke: '#10B981', text: 'text-emerald-500 dark:text-emerald-400', glow: 'rgba(16, 185, 129, 0.35)' };
}

export function RiskScoreCircle({
  score,
  size = 44,
  strokeWidth = 3,
  className,
  animate = true,
}: RiskScoreCircleProps) {
  const colors = getScoreColor(score);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      {/* Background circle */}
      <svg
        width={size}
        height={size}
        className="absolute"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-zinc-200 dark:text-zinc-800"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={animate ? { strokeDashoffset: circumference } : { strokeDashoffset: offset }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          style={{
            filter: `drop-shadow(0 0 4px ${colors.glow})`,
          }}
        />
      </svg>

      {/* Score number */}
      <motion.span
        className={cn('font-bold text-xs tabular-nums', colors.text)}
        initial={animate ? { opacity: 0, scale: 0.5 } : { opacity: 1, scale: 1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        {score}
      </motion.span>
    </div>
  );
}

export default RiskScoreCircle;
