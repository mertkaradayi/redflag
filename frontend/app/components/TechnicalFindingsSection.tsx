'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Microscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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

  const allExpanded = findings.length > 0 && findings.every((_, i) => expandedFindings[i]);

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

  const toggleAllFindings = useCallback(() => {
    const nextExpanded = !allExpanded;
    const nextState: Record<number, boolean> = {};
    findings.forEach((_, i) => {
      nextState[i] = nextExpanded;
    });
    setExpandedFindings(nextState);
    if (nextExpanded && onExpand) {
      onExpand();
    }
  }, [allExpanded, findings, onExpand]);

  if (findings.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h5 className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-500 flex items-center gap-1.5">
          <Microscope className="h-3 w-3" />
          Technical Findings ({findings.length})
        </h5>
        <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto sm:justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAllFindings}
            className="inline-flex h-9 w-full items-center justify-center gap-1 px-2 text-xs font-semibold text-foreground dark:text-white hover:bg-[hsl(var(--surface-muted))] dark:hover:bg-black/40 sm:h-7 sm:w-auto"
          >
            {allExpanded ? 'Fold all' : 'Unfold all'}
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', allExpanded && 'rotate-180')} />
          </Button>
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleShowAll}
              className="inline-flex h-9 w-full items-center justify-center gap-1 px-2 text-xs font-semibold text-foreground dark:text-white hover:bg-[hsl(var(--surface-muted))] dark:hover:bg-black/40 sm:h-7 sm:w-auto"
            >
              {showAll ? 'Show less' : `Show all (+${findings.length - defaultVisible})`}
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showAll && 'rotate-180')} />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {visibleFindings.map((finding, index) => {
          const isExpanded = Boolean(expandedFindings[index]);

          return (
            <div
              key={`${finding.function_name}-${finding.matched_pattern_id}-${index}`}
              className={cn(
                'rounded-lg bg-[hsl(var(--surface-muted))] dark:bg-black/40 px-3 py-2 text-sm transition-colors duration-150',
                isExpanded && 'border border-border dark:border-white/10',
              )}
            >
              <button
                type="button"
                onClick={() => toggleFinding(index)}
                className="flex w-full flex-wrap items-start gap-2 text-left sm:flex-nowrap sm:items-center sm:justify-between sm:gap-3"
                aria-expanded={isExpanded}
              >
                <span className="flex min-w-0 flex-1 items-start gap-2">
                  <ChevronRight
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 sm:mt-0',
                      isExpanded && 'rotate-90',
                    )}
                  />
                  <span className="font-mono text-sm font-medium leading-5 text-foreground dark:text-white">
                    {finding.function_name}
                  </span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase text-muted-foreground dark:text-zinc-400 bg-[hsl(var(--surface-muted))] dark:bg-black/60">
                    {finding.severity}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground dark:text-zinc-500">
                    [{finding.matched_pattern_id}]
                  </span>
                </span>
              </button>

              {isExpanded && (
                <div className="mt-3 space-y-2 pl-6">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground dark:text-zinc-500 mb-1">
                      Reason
                    </div>
                    <p className="text-sm leading-5 text-foreground/80 dark:text-white/80">
                      {finding.technical_reason}
                    </p>
                  </div>

                  {finding.evidence_code_snippet && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground dark:text-zinc-500 mb-1">
                        Evidence
                      </div>
                      <CodeSnippet code={finding.evidence_code_snippet} />
                    </div>
                  )}

                  {finding.contextual_notes && finding.contextual_notes.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground dark:text-zinc-500 mb-1">
                        Notes
                      </div>
                      <ul className="text-xs text-foreground/70 dark:text-white/70 space-y-0.5">
                        {finding.contextual_notes.map((note, noteIndex) => (
                          <li key={noteIndex} className="flex items-start gap-1.5">
                            <span className="text-muted-foreground">-</span>
                            <span>{note}</span>
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
      </div>
    </div>
  );
}

export default TechnicalFindingsSection;
