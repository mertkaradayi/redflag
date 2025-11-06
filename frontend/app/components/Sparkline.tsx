'use client';

import { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export default function Sparkline({ 
  data, 
  width = 60, 
  height = 20, 
  color = '#D12226',
  className = '' 
}: SparklineProps) {
  const path = useMemo(() => {
    if (data.length === 0) return '';

    // Filter out invalid values
    const validData = data.filter(val => typeof val === 'number' && !isNaN(val) && isFinite(val));
    if (validData.length === 0) return '';

    const max = Math.max(...validData);
    const min = Math.min(...validData);
    const range = max - min || 1;
    
    // Add padding to avoid edges
    const padding = range * 0.1 || 1;
    const adjustedMax = max + padding;
    const adjustedMin = Math.max(0, min - padding);
    const adjustedRange = adjustedMax - adjustedMin || 1;
    
    const points = validData.map((value, index) => {
      const x = (index / (validData.length - 1 || 1)) * width;
      // Invert y so higher values are at the top
      const y = height - ((value - adjustedMin) / adjustedRange) * height;
      return `${x},${y}`;
    });

    if (points.length === 0) return '';
    return `M ${points.join(' L ')}`;
  }, [data, width, height]);

  if (data.length === 0) {
    return (
      <svg width={width} height={height} className={className}>
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={color} strokeWidth="1" opacity="0.3" />
      </svg>
    );
  }

  // Check if all values are the same (flat line)
  const uniqueValues = new Set(data.filter(val => typeof val === 'number' && !isNaN(val)));
  const isFlatLine = uniqueValues.size <= 1;

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={isFlatLine ? "1" : "1.5"}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={isFlatLine ? "0.4" : "0.8"}
      />
    </svg>
  );
}

