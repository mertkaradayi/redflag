'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Microscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TechnicalFinding } from '@/app/dashboard/types';
import { CodeSnippet } from './CodeSnippet';

interface TechnicalFindingsSectionProps {
  findings: TechnicalFinding[];
  defaultVisible?: number;
  onExpand?: () => void;
}

const DEFAULT_VISIBLE = 3;

export function TechnicalFindingsSection({
  findings,
  defaultVisible = DEFAULT_VISIBLE,
  onExpand
}: TechnicalFindingsSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const [expandedFindings, setExpandedFindings] = useState<Record<number, boolean>>({});

  const visibleFindings = showAll ? findings : findings.slice(0, defaultVisible);
  const hasMore = findings.length > defaultVisible;

  const toggleShowAll = useCallback(() => {
    setShowAll(prev => !prev);
    if (!showAll && onExpand) {
      onExpand();
    }
  }, [showAll, onExpand]);

  const toggleFinding = useCallback((index: number) => {
    setExpandedFindings(prev => {
      const next = { ...prev, [index]: !prev[index] };
      if (!prev[index] && onExpand) {
        onExpand();
      }
      return next;
    });
  }, [onExpand]);

  if (findings.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/50 dark:border-white/5 bg-[hsl(var(--surface-muted))]/30 dark:bg-white/[0.02] p-4 transition-colors duration-200 w-full max-w-full overflow-x-hidden">
      <div className="mb-3 flex items-center justify-between">
        <h5 className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-foreground dark:text-white flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--surface-muted))]/50 dark:bg-white/[0.03] shrink-0">
            <Microscope className="h-3.5 w-3.5 text-muted-foreground dark:text-zinc-500" />
          </div>
          Technical Findings
          <span className="text-muted-foreground dark:text-zinc-500 font-normal">({findings.length})</span>
        </h5>
      </div>

      <div className="space-y-1.5">
        {visibleFindings.map((finding, index) => {
          const isExpanded = Boolean(expandedFindings[index]);

          return (
            <div
              key={`${finding.function_name}-${finding.matched_pattern_id}-${index}`}
              className={cn(
                'rounded-lg bg-[hsl(var(--surface-muted))]/30 dark:bg-black/40 border border-border/50 dark:border-white/5 px-3 py-2 transition-colors duration-150 w-full max-w-full overflow-x-hidden',
                isExpanded && 'border-border/60 dark:border-white/10 bg-[hsl(var(--surface-muted))]/40 dark:bg-black/50',
              )}
            >
              <button
                type="button"
                onClick={() => toggleFinding(index)}
                className="flex w-full flex-wrap items-start gap-2 text-left sm:flex-nowrap sm:items-center sm:justify-between min-w-0"
                aria-expanded={isExpanded}
              >
                <span className="flex min-w-0 flex-1 items-start gap-2">
                  <ChevronRight
                    className={cn(
                      'mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-150 sm:mt-0',
                      isExpanded && 'rotate-90',
                    )}
                  />
                  <span className="font-mono text-xs font-medium leading-5 text-muted-foreground dark:text-zinc-300 break-words line-clamp-2 sm:line-clamp-none min-w-0">
                    {finding.function_name}
                  </span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase text-muted-foreground/70 dark:text-zinc-500 bg-[hsl(var(--surface-muted))]/50 dark:bg-white/[0.03]">
                    {finding.severity}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/50 dark:text-zinc-600">
                    [{finding.matched_pattern_id}]
                  </span>
                </span>
              </button>

              {isExpanded && (
                <div className="mt-3 space-y-2.5 pl-6 w-full max-w-full overflow-x-hidden">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide font-medium text-foreground/70 dark:text-zinc-400 mb-1">
                      Reason
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground dark:text-zinc-400 break-words">
                      {finding.technical_reason}
                    </p>
                  </div>

                  {finding.evidence_code_snippet && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wide font-medium text-foreground/70 dark:text-zinc-400 mb-1">
                        Evidence
                      </div>
                      <CodeSnippet code={finding.evidence_code_snippet} />
                    </div>
                  )}

                  {finding.contextual_notes && finding.contextual_notes.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wide font-medium text-foreground/70 dark:text-zinc-400 mb-1">
                        Notes
                      </div>
                      <ul className="text-xs text-muted-foreground dark:text-zinc-500 space-y-0.5">
                        {finding.contextual_notes.map((note, noteIndex) => (
                          <li key={noteIndex} className="flex items-start gap-1.5">
                            <span className="text-zinc-400 dark:text-zinc-600 shrink-0">-</span>
                            <span className="break-words min-w-0">{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {hasMore && (
          <button
            type="button"
            onClick={toggleShowAll}
            className="w-full pt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
          >
            {showAll ? (
              <>Show less <ChevronDown className="h-3 w-3 rotate-180" /></>
            ) : (
              <>+{findings.length - defaultVisible} more <ChevronDown className="h-3 w-3" /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default TechnicalFindingsSection;
