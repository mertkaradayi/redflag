'use client';

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CodeSnippetProps {
  code: string;
  language?: string;
  className?: string;
  showLineNumbers?: boolean;
}

// Simple syntax highlighting for Move/Sui bytecode
function highlightCode(code: string): React.ReactNode[] {
  const lines = code.split('\n');

  return lines.map((line, lineIndex) => {
    // Tokenize each line
    const tokens: React.ReactNode[] = [];
    let remaining = line;
    let keyIndex = 0;

    // Pattern matching for syntax highlighting
    const patterns: Array<{ regex: RegExp; className: string }> = [
      // Line numbers at start (e.g., "13:", "4:")
      { regex: /^(\d+:)/, className: 'text-zinc-500' },
      // Keywords
      { regex: /\b(Call|MoveTo|MoveFrom|BorrowGlobal|BorrowGlobalMut|Ret|Branch|BrTrue|BrFalse|Pop|LdConst|CopyLoc|MoveLoc|StLoc|MutBorrowLoc|ImmBorrowLoc|MutBorrowField|ImmBorrowField|Pack|Unpack|ReadRef|WriteRef|FreezeRef|Add|Sub|Mul|Div|Mod|BitAnd|BitOr|Xor|Shl|Shr|Lt|Gt|Le|Ge|Eq|Neq|And|Or|Not|CastU8|CastU64|CastU128|Abort|Nop)\b/, className: 'text-purple-400' },
      // Module paths (e.g., state::remove_all_from_treasury, transfer::public_transfer)
      { regex: /\b([a-z_][a-z0-9_]*::)+[a-z_][a-z0-9_]*\b/i, className: 'text-cyan-400' },
      // Type parameters (e.g., <Coin<SUI>>, <Balance<SUI>>)
      { regex: /<[^>]+>/, className: 'text-yellow-400' },
      // Addresses (0x...)
      { regex: /0x[a-fA-F0-9]+/, className: 'text-green-400' },
      // Numbers
      { regex: /\b\d+\b/, className: 'text-orange-400' },
      // Function/variable names after ::
      { regex: /::([a-z_][a-z0-9_]*)/i, className: 'text-blue-400' },
      // Parentheses and brackets
      { regex: /[()[\]{}]/, className: 'text-zinc-400' },
      // Operators
      { regex: /[&*,;:]/, className: 'text-zinc-500' },
    ];

    while (remaining.length > 0) {
      let matched = false;

      for (const { regex, className } of patterns) {
        const match = remaining.match(regex);
        if (match && match.index === 0) {
          tokens.push(
            <span key={`${lineIndex}-${keyIndex++}`} className={className}>
              {match[0]}
            </span>
          );
          remaining = remaining.slice(match[0].length);
          matched = true;
          break;
        }
      }

      if (!matched) {
        // Check if next char starts a pattern
        let nextPatternStart = remaining.length;
        for (const { regex } of patterns) {
          const match = remaining.match(regex);
          if (match && match.index !== undefined && match.index > 0) {
            nextPatternStart = Math.min(nextPatternStart, match.index);
          }
        }

        // Add plain text up to next pattern
        const plainText = remaining.slice(0, nextPatternStart || 1);
        tokens.push(
          <span key={`${lineIndex}-${keyIndex++}`} className="text-zinc-300">
            {plainText}
          </span>
        );
        remaining = remaining.slice(plainText.length);
      }
    }

    return (
      <div key={lineIndex} className="leading-relaxed">
        {tokens}
      </div>
    );
  });
}

export function CodeSnippet({ code, language = 'move', className, showLineNumbers = false }: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  }, [code]);

  const highlightedCode = highlightCode(code);

  return (
    <div className={cn('group relative rounded-lg bg-zinc-900 dark:bg-black/60 border border-zinc-800 dark:border-zinc-700/50', className)}>
      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-all duration-150"
        aria-label="Copy code"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Code content */}
      <pre className="p-3 pr-10 overflow-x-auto text-xs font-mono">
        <code>{highlightedCode}</code>
      </pre>
    </div>
  );
}

// Helper to extract code from evidence text
// e.g., 'Evidence: "13: Call state::remove..." ... "19: Call transfer..."'
export function extractCodeFromEvidence(text: string): { explanation: string; codeSnippets: string[] } {
  const codeSnippets: string[] = [];

  // Match quoted code snippets that look like bytecode (contain :: or start with number:)
  const codePattern = /"(\d+:\s*[^"]+)"/g;
  let match;

  while ((match = codePattern.exec(text)) !== null) {
    codeSnippets.push(match[1]);
  }

  // Also match e.g., patterns at the end
  const evidencePattern = /e\.g\.,?\s*"([^"]+)"/gi;
  while ((match = evidencePattern.exec(text)) !== null) {
    if (!codeSnippets.includes(match[1])) {
      codeSnippets.push(match[1]);
    }
  }

  // Remove the quoted code from explanation
  let explanation = text
    .replace(/Evidence:\s*/gi, '')
    .replace(/"[^"]+"/g, '')
    .replace(/e\.g\.,?\s*/gi, '')
    .replace(/\s*\.\.\.\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+and\s*"?\s*$/i, '')
    .replace(/,\s*$/, '')
    .trim();

  return { explanation, codeSnippets };
}

export default CodeSnippet;
