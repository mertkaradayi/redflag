'use client';

import { cn } from '@/lib/utils';
import { CodeSnippet } from './CodeSnippet';

interface EvidenceBlockProps {
  text: string;
  className?: string;
}

// Parse evidence text to separate explanation from code snippets
function parseEvidence(text: string): { explanation: string; codeSnippets: string[] } {
  const codeSnippets: string[] = [];
  let explanation = text;

  // Pattern 1: "Evidence: CODE" at the end (most common format from LLM)
  // Example: "Admin can drain funds. Evidence: 15: MoveLoc[0]... 19: Call coin::take"
  const evidencePattern = /\.\s*Evidence:\s*(.+)$/i;
  const evidenceMatch = text.match(evidencePattern);
  if (evidenceMatch) {
    const code = evidenceMatch[1].trim().replace(/^["']|["']$/g, '');
    if (code && /\d+:\s*\w+/.test(code)) {
      codeSnippets.push(code);
      explanation = text.replace(evidencePattern, '.').trim();
    }
  }

  // Pattern 2: Quoted bytecode like "13: Call module::function..."
  const quotedPatterns = [
    /"(\d+:\s*(?:Call|MoveTo|MoveFrom|BorrowGlobal|MutBorrowGlobal|MutBorrowField|BorrowField|Pack|Unpack|Ret|Branch|LdConst|CopyLoc|MoveLoc|StLoc|ImmBorrowLoc|MutBorrowLoc)[^"]+)"/gi,
    /"(\d+:\s*[A-Za-z_][A-Za-z0-9_]*::[^"]+)"/gi,
  ];

  for (const pattern of quotedPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const snippet = match[1].trim();
      // Avoid duplicates
      if (!codeSnippets.some(s => s.includes(snippet) || snippet.includes(s))) {
        codeSnippets.push(snippet);
        explanation = explanation.replace(`"${snippet}"`, '');
      }
    }
  }

  // Pattern 3: Inline bytecode without quotes (fallback)
  // Example: "15: Call transfer::transfer<AdminCap>"
  if (codeSnippets.length === 0) {
    const inlineCodePattern = /(\d+:\s*(?:Call|MoveTo|MoveFrom|BorrowGlobal|MutBorrowGlobal|MutBorrowField|BorrowField|Pack|Unpack|MoveLoc|CopyLoc|StLoc)[^\.\n]+(?:\.\.\.\s*\d+:\s*\w+[^\.\n]*)?)/gi;
    let match;
    while ((match = inlineCodePattern.exec(text)) !== null) {
      const snippet = match[1].trim();
      if (!codeSnippets.some(s => s.includes(snippet) || snippet.includes(s))) {
        codeSnippets.push(snippet);
        explanation = explanation.replace(snippet, '');
      }
    }
  }

  // Clean up explanation text
  explanation = explanation
    .replace(/^Evidence:\s*/i, '')
    .replace(/Evidence:\s*\.?\s*$/gi, '')
    .replace(/e\.g\.,?\s*and\s*/gi, '')
    .replace(/e\.g\.,?\s*$/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/,\s*,/g, ',')
    .replace(/\s+,/g, ',')
    .replace(/,\s*$/g, '')
    .replace(/\.\s*\.$/g, '.')
    .replace(/\s+$/g, '')
    .trim();

  return { explanation, codeSnippets };
}

export function EvidenceBlock({ text, className }: EvidenceBlockProps) {
  const { explanation, codeSnippets } = parseEvidence(text);

  return (
    <div className={cn('w-full min-w-0 max-w-full overflow-x-hidden', className)}>
      {/* Explanation text */}
      {explanation && (
        <p className="text-sm md:text-base leading-relaxed text-foreground/80 dark:text-white/80 mb-2 md:mb-3 break-words">
          {explanation}
        </p>
      )}

      {/* Code snippets */}
      {codeSnippets.length > 0 && (
        <div className="space-y-2 md:space-y-2.5 w-full min-w-0">
          {codeSnippets.map((snippet, index) => (
            <CodeSnippet key={index} code={snippet} />
          ))}
        </div>
      )}

      {/* Fallback: if no code was extracted, show original text */}
      {codeSnippets.length === 0 && !explanation && (
        <p className="text-sm md:text-base leading-relaxed text-foreground/80 dark:text-white/80 break-words">
          {text}
        </p>
      )}
    </div>
  );
}

export default EvidenceBlock;
