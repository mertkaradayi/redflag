'use client';

import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  variant?: 'full' | 'compact';
}

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-zinc-200 dark:bg-zinc-800',
        className
      )}
    />
  );
}

export function SkeletonCard({ variant = 'full' }: SkeletonCardProps) {
  if (variant === 'compact') {
    return (
      <div className="rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-zinc-950/80 p-3">
        <div className="flex items-center gap-3">
          <SkeletonPulse className="h-6 w-20 rounded-md" />
          <SkeletonPulse className="h-5 w-32 rounded-md" />
          <SkeletonPulse className="h-8 w-8 rounded-full" />
          <SkeletonPulse className="h-4 flex-1 max-w-[300px] rounded" />
          <SkeletonPulse className="h-4 w-16 rounded ml-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-zinc-950/80 p-4 sm:p-6 space-y-4">
      {/* Header row - badges */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <SkeletonPulse className="h-7 w-24 rounded-md" />
          <SkeletonPulse className="h-7 w-20 rounded-md" />
          <SkeletonPulse className="h-7 w-16 rounded-md" />
          <SkeletonPulse className="h-7 w-28 rounded-md" />
        </div>

        {/* Package ID field */}
        <div className="space-y-1.5">
          <SkeletonPulse className="h-3 w-16 rounded" />
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-black/40 h-10 px-3">
            <SkeletonPulse className="h-4 flex-1 rounded" />
            <SkeletonPulse className="h-6 w-6 rounded" />
            <SkeletonPulse className="h-6 w-6 rounded" />
          </div>
        </div>

        {/* Timestamp and progress bar */}
        <div className="flex items-center gap-2">
          <SkeletonPulse className="h-3 w-32 rounded" />
          <SkeletonPulse className="h-1.5 w-24 rounded-full" />
        </div>
      </div>

      {/* Summary section */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <SkeletonPulse className="h-3 w-3 rounded" />
          <SkeletonPulse className="h-3 w-16 rounded" />
        </div>
        <SkeletonPulse className="h-4 w-full rounded" />
        <SkeletonPulse className="h-4 w-4/5 rounded" />
        <SkeletonPulse className="h-10 w-full rounded-lg" />
      </div>

      {/* Two column layout */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Left column - risky functions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <SkeletonPulse className="h-4 w-4 rounded" />
              <SkeletonPulse className="h-4 w-32 rounded" />
            </div>
            <SkeletonPulse className="h-7 w-20 rounded" />
          </div>

          {/* Function items */}
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-lg bg-zinc-100 dark:bg-zinc-900 px-3 py-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SkeletonPulse className="h-4 w-4 rounded" />
                  <SkeletonPulse className="h-4 w-36 rounded" />
                </div>
                <SkeletonPulse className="h-4 w-20 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Right column - sidebar cards */}
        <div className="space-y-4">
          {/* Impact card */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <SkeletonPulse className="h-8 w-8 rounded-lg" />
              <SkeletonPulse className="h-3 w-24 rounded" />
            </div>
            <SkeletonPulse className="h-4 w-full rounded mb-1.5" />
            <SkeletonPulse className="h-4 w-3/4 rounded" />
          </div>

          {/* Data source card */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <SkeletonPulse className="h-8 w-8 rounded-lg" />
              <SkeletonPulse className="h-3 w-20 rounded" />
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <SkeletonPulse className="h-3 w-16 rounded" />
                  <SkeletonPulse className="h-3 w-24 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SkeletonCard;
