'use client';

import { motion } from 'framer-motion';
import { LayoutList, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'full' | 'compact';

interface ViewModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

export function ViewModeToggle({ mode, onChange, className }: ViewModeToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-1',
        className
      )}
    >
      <button
        onClick={() => onChange('full')}
        className={cn(
          'relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
          mode === 'full'
            ? 'text-foreground dark:text-white'
            : 'text-muted-foreground hover:text-foreground dark:hover:text-white'
        )}
      >
        {mode === 'full' && (
          <motion.div
            layoutId="viewmode-indicator"
            className="absolute inset-0 rounded-md bg-white dark:bg-zinc-800 shadow-sm"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <LayoutList className="relative h-3.5 w-3.5" />
        <span className="relative hidden sm:inline">Full</span>
      </button>

      <button
        onClick={() => onChange('compact')}
        className={cn(
          'relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
          mode === 'compact'
            ? 'text-foreground dark:text-white'
            : 'text-muted-foreground hover:text-foreground dark:hover:text-white'
        )}
      >
        {mode === 'compact' && (
          <motion.div
            layoutId="viewmode-indicator"
            className="absolute inset-0 rounded-md bg-white dark:bg-zinc-800 shadow-sm"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <LayoutGrid className="relative h-3.5 w-3.5" />
        <span className="relative hidden sm:inline">Compact</span>
      </button>
    </div>
  );
}

export default ViewModeToggle;
