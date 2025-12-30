'use client';

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
    <div className={cn('inline-flex items-center gap-2', className)}>
      <button
        onClick={() => onChange('full')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
          mode === 'full'
            ? 'border-[#D12226] bg-[#D12226] text-white hover:bg-[#a8181b]'
            : 'border-[#D12226]/40 text-[#D12226] hover:bg-[#D12226]/10'
        )}
      >
        <LayoutList className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Full</span>
      </button>

      <button
        onClick={() => onChange('compact')}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
          mode === 'compact'
            ? 'border-[#D12226] bg-[#D12226] text-white hover:bg-[#a8181b]'
            : 'border-[#D12226]/40 text-[#D12226] hover:bg-[#D12226]/10'
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Compact</span>
      </button>
    </div>
  );
}

export default ViewModeToggle;