'use client';

import { CodeSnippet } from './CodeSnippet';

interface EvidenceBlockProps {
  text: string;
  className?: string;
}

// Parse evidence text to separate explanation from code snippets
function parseEvidence(text: string): { explanation: string; codeSnippets: string[] } {
  const codeSnippets: string[] = [];

  // Match various quote patterns for code evidence
  // Pattern 1: "13: Call module::function..."
  // Pattern 2: Evidence: "code here"
  // Pattern 3: e.g., "code here"
  const patterns = [
    /"(\d+:\s*(?:Call|MoveTo|MoveFrom|BorrowGlobal|Pack|Unpack|Ret|Branch|LdConst|CopyLoc|MoveLoc|StLoc)[^"]+)"/gi,
    /"(\d+:\s*[A-Za-z_][A-Za-z0-9_]*::[^"]+)"/gi,
    /Evidence:\s*"([^"]+)"/gi,
    /e\.g\.,?\s*"([^"]+)"/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const snippet = match[1].trim();
      // Avoid duplicates
      if (!codeSnippets.some(s => s.includes(snippet) || snippet.includes(s))) {
        codeSnippets.push(snippet);
      }
    }
  }

  // Clean up explanation text
  let explanation = text;

  // Remove evidence prefix
  explanation = explanation.replace(/^Evidence:\s*/i, '');

  // Remove code snippets from explanation
  for (const snippet of codeSnippets) {
    explanation = explanation.replace(`"${snippet}"`, '');
  }

  // Clean up artifacts
  explanation = explanation
    .replace(/e\.g\.,?\s*and\s*/gi, '')
    .replace(/e\.g\.,?\s*$/gi, '')
    .replace(/\s*\.\.\.\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/,\s*,/g, ',')
    .replace(/\s+,/g, ',')
    .replace(/,\s*$/g, '')
    .replace(/\s+$/g, '')
    .trim();

  // If no code was extracted but text contains bytecode-like content, treat whole thing differently
  if (codeSnippets.length === 0) {
    // Check if the text itself is mostly code
    const hasBytecodePatterns = /\d+:\s*(Call|MoveTo|MoveFrom|Pack|Unpack)/.test(text);
    if (hasBytecodePatterns) {
      // Split on "Evidence:" if present, otherwise use the whole thing
      const evidenceMatch = text.match(/Evidence:\s*"?(.+)"?$/i);
      if (evidenceMatch) {
        explanation = text.replace(/Evidence:\s*"?(.+)"?$/i, '').trim();
        codeSnippets.push(evidenceMatch[1].replace(/^"|"$/g, ''));
      }
    }
  }

  return { explanation, codeSnippets };
}

export function EvidenceBlock({ text, className }: EvidenceBlockProps) {
  const { explanation, codeSnippets } = parseEvidence(text);

  return (
    <div className={className}>
      {/* Explanation text */}
      {explanation && (
        <p className="text-sm leading-relaxed text-foreground/80 dark:text-white/80 mb-2">
          {explanation}
        </p>
      )}

      {/* Code snippets */}
      {codeSnippets.length > 0 && (
        <div className="space-y-2">
          {codeSnippets.map((snippet, index) => (
            <CodeSnippet key={index} code={snippet} />
          ))}
        </div>
      )}

      {/* Fallback: if no code was extracted, show original text */}
      {codeSnippets.length === 0 && !explanation && (
        <p className="text-sm leading-relaxed text-foreground/80 dark:text-white/80">
          {text}
        </p>
      )}
    </div>
  );
}

export default EvidenceBlock;
