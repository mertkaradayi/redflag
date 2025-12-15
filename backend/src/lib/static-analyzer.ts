/**
 * Static Analyzer - Deterministic Pattern Detection (Pre-LLM)
 *
 * Performs regex/signature-based pattern matching BEFORE LLM analysis.
 * Catches obvious risks faster and provides validated context to the LLM.
 */

// ================================================================
// TYPES
// ================================================================

export interface StaticFinding {
  pattern_id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  function_name: string;
  module_name: string;
  evidence: string;
  description: string;
  confidence: 'definite' | 'likely' | 'possible';
}

export interface StaticAnalysisResult {
  findings: StaticFinding[];
  analyzed_modules: string[];
  patterns_checked: string[];
  analysis_time_ms: number;
}

interface PatternDefinition {
  id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  // Bytecode patterns (regex on disassembled code)
  bytecodePatterns?: RegExp[];
  // Function signature patterns (checks function params)
  signatureCheck?: (func: PublicFunction) => { match: boolean; evidence: string };
  // Combined check (bytecode + context)
  combinedCheck?: (bytecode: string, func: PublicFunction) => { match: boolean; evidence: string };
}

export interface PublicFunction {
  module: string;
  name: string;
  params: any[];
}

// ================================================================
// PATTERN DEFINITIONS
// ================================================================

const STATIC_PATTERNS: PatternDefinition[] = [
  // ============ CRITICAL PATTERNS ============
  {
    id: 'STATIC-ADMINCAP-TRANSFER',
    severity: 'Critical',
    description: 'AdminCap or OwnerCap transferred in public function - allows admin privilege transfer',
    signatureCheck: (func) => {
      const hasAdminCap = func.params.some((p: any) => {
        const paramStr = JSON.stringify(p).toLowerCase();
        return paramStr.includes('admincap') || paramStr.includes('ownercap');
      });
      if (hasAdminCap) {
        return {
          match: true,
          evidence: `Function ${func.name} takes AdminCap/OwnerCap as parameter`,
        };
      }
      return { match: false, evidence: '' };
    },
    bytecodePatterns: [
      /AdminCap.*transfer::public_transfer/i,
      /OwnerCap.*transfer::public_transfer/i,
      /transfer::public_transfer.*AdminCap/i,
    ],
  },
  {
    id: 'STATIC-TREASURYCAP-PUBLIC',
    severity: 'Critical',
    description: 'TreasuryCap exposed in public function - allows unlimited token minting',
    signatureCheck: (func) => {
      const hasTreasuryCap = func.params.some((p: any) => {
        const paramStr = JSON.stringify(p).toLowerCase();
        return paramStr.includes('treasurycap');
      });
      if (hasTreasuryCap) {
        return {
          match: true,
          evidence: `Function ${func.name} takes TreasuryCap as parameter - can mint tokens`,
        };
      }
      return { match: false, evidence: '' };
    },
  },
  {
    id: 'STATIC-UPGRADECAP-TRANSFER',
    severity: 'Critical',
    description: 'UpgradeCap transferred to arbitrary address - allows package takeover',
    signatureCheck: (func) => {
      const hasUpgradeCap = func.params.some((p: any) => {
        const paramStr = JSON.stringify(p).toLowerCase();
        return paramStr.includes('upgradecap');
      });
      if (hasUpgradeCap) {
        return {
          match: true,
          evidence: `Function ${func.name} takes UpgradeCap as parameter - can upgrade package`,
        };
      }
      return { match: false, evidence: '' };
    },
    bytecodePatterns: [
      /UpgradeCap.*transfer/i,
      /transfer.*UpgradeCap/i,
      /package::authorize_upgrade/i,
    ],
  },

  // ============ HIGH PATTERNS ============
  {
    id: 'STATIC-GENERIC-DRAIN',
    severity: 'High',
    description: 'Generic withdraw function with type parameter <T> - can drain any coin type',
    combinedCheck: (bytecode, func) => {
      // Check for generic type parameters + withdraw-like name
      const funcName = func.name.toLowerCase();
      const isWithdrawLike = ['withdraw', 'drain', 'sweep', 'collect', 'extract', 'remove'].some(
        kw => funcName.includes(kw)
      );
      const hasGenericCoin = func.params.some((p: any) => {
        const paramStr = JSON.stringify(p);
        return paramStr.includes('Coin<') && paramStr.includes('type-parameter');
      });

      if (isWithdrawLike && hasGenericCoin) {
        return {
          match: true,
          evidence: `Generic withdraw function ${func.name} can extract any Coin<T> type`,
        };
      }
      return { match: false, evidence: '' };
    },
  },
  {
    id: 'STATIC-BALANCE-DRAIN',
    severity: 'High',
    description: 'Balance extraction with public_transfer - funds sent to parameter address',
    bytecodePatterns: [
      /balance::withdraw_all.*transfer::public_transfer/i,
      /balance::split.*transfer::public_transfer/i,
      /coin::from_balance.*transfer::public_transfer/i,
    ],
  },
  {
    id: 'STATIC-COIN-SPLIT-TRANSFER',
    severity: 'High',
    description: 'Coin split and transfer to arbitrary recipient - potential fund extraction',
    bytecodePatterns: [
      /coin::split.*transfer::public_transfer/i,
      /coin::take.*transfer::public_transfer/i,
    ],
    combinedCheck: (bytecode, func) => {
      // Check if function has address parameter (recipient) + balance operations
      const hasAddressParam = func.params.some((p: any) => {
        const paramStr = JSON.stringify(p).toLowerCase();
        return paramStr.includes('address') || paramStr.includes('0x2::object::id');
      });
      const hasCoinOp = bytecode.includes('coin::') && bytecode.includes('transfer::');

      if (hasAddressParam && hasCoinOp) {
        return {
          match: true,
          evidence: `Function ${func.name} transfers coins to address parameter`,
        };
      }
      return { match: false, evidence: '' };
    },
  },
  {
    id: 'STATIC-UNLIMITED-MINT',
    severity: 'High',
    description: 'Unlimited minting capability detected',
    bytecodePatterns: [
      /coin::mint\s*</i,
      /coin::mint_and_transfer/i,
      /supply::increase/i,
    ],
  },

  // ============ MEDIUM PATTERNS ============
  {
    id: 'STATIC-SHARED-MUT-NO-CAP',
    severity: 'Medium',
    description: 'Shared object mutation without capability check - anyone can modify state',
    combinedCheck: (bytecode, func) => {
      // Check for mutable reference to shared-looking objects without capability params
      const hasMutableShared = func.params.some((p: any) => {
        return p.kind === 'reference' && p.mutable === true;
      });
      const hasCapability = func.params.some((p: any) => {
        const paramStr = JSON.stringify(p).toLowerCase();
        return paramStr.includes('cap') || paramStr.includes('admin') || paramStr.includes('owner');
      });

      if (hasMutableShared && !hasCapability) {
        return {
          match: true,
          evidence: `Function ${func.name} mutates shared state without capability check`,
        };
      }
      return { match: false, evidence: '' };
    },
  },
  {
    id: 'STATIC-DYNAMIC-FIELD-ADD',
    severity: 'Medium',
    description: 'Dynamic field addition in public function - can inject arbitrary data',
    bytecodePatterns: [
      /dynamic_field::add/i,
      /dynamic_object_field::add/i,
    ],
  },
  {
    id: 'STATIC-CLOCK-DEPENDENT',
    severity: 'Medium',
    description: 'Clock-based logic detected - time manipulation risk',
    bytecodePatterns: [
      /clock::timestamp_ms/i,
      /sui::clock::Clock/i,
    ],
    signatureCheck: (func) => {
      const hasClock = func.params.some((p: any) => {
        const paramStr = JSON.stringify(p).toLowerCase();
        return paramStr.includes('clock');
      });
      if (hasClock) {
        return {
          match: true,
          evidence: `Function ${func.name} uses Clock for time-based logic`,
        };
      }
      return { match: false, evidence: '' };
    },
  },
  {
    id: 'STATIC-PAUSE-CONTROL',
    severity: 'Medium',
    description: 'Pause/freeze mechanism detected - admin can halt operations',
    bytecodePatterns: [
      /pause|unpause|paused|is_paused|set_paused/i,
      /freeze|unfreeze|frozen|is_frozen/i,
      /halt|unhalt|halted/i,
    ],
  },
  {
    id: 'STATIC-FEE-MANIPULATION',
    severity: 'Medium',
    description: 'Fee setting function detected - fees can be changed arbitrarily',
    combinedCheck: (bytecode, func) => {
      const funcName = func.name.toLowerCase();
      const isFeeFunction = ['set_fee', 'update_fee', 'change_fee', 'set_rate', 'update_rate'].some(
        kw => funcName.includes(kw.replace('_', '')) || funcName.includes(kw)
      );
      if (isFeeFunction) {
        return {
          match: true,
          evidence: `Function ${func.name} can modify fee parameters`,
        };
      }
      return { match: false, evidence: '' };
    },
  },

  // ============ LOW PATTERNS ============
  {
    id: 'STATIC-MISSING-EVENTS',
    severity: 'Low',
    description: 'Critical operation without event emission - reduces transparency',
    combinedCheck: (bytecode, func) => {
      const funcName = func.name.toLowerCase();
      const isCriticalOp = ['withdraw', 'transfer', 'mint', 'burn', 'upgrade', 'pause'].some(
        kw => funcName.includes(kw)
      );
      const hasEvent = bytecode.includes('event::emit');

      if (isCriticalOp && !hasEvent) {
        return {
          match: true,
          evidence: `Critical function ${func.name} does not emit events`,
        };
      }
      return { match: false, evidence: '' };
    },
  },
];

// ================================================================
// MAIN ANALYSIS FUNCTION
// ================================================================

/**
 * Runs static pattern analysis on contract data.
 * This is deterministic and runs BEFORE LLM analysis.
 */
export function runStaticAnalysis(
  disassembledCode: Record<string, string>,
  publicFunctions: PublicFunction[]
): StaticAnalysisResult {
  const startTime = Date.now();
  const findings: StaticFinding[] = [];
  const analyzedModules = new Set<string>();

  // Group functions by module
  const functionsByModule = new Map<string, PublicFunction[]>();
  for (const func of publicFunctions) {
    if (!functionsByModule.has(func.module)) {
      functionsByModule.set(func.module, []);
    }
    functionsByModule.get(func.module)!.push(func);
  }

  // Analyze each module
  for (const [moduleName, functions] of functionsByModule) {
    analyzedModules.add(moduleName);
    const bytecode = disassembledCode[moduleName] || '';

    for (const func of functions) {
      // Check each pattern against this function
      for (const pattern of STATIC_PATTERNS) {
        const result = checkPattern(pattern, bytecode, func);
        if (result.match) {
          findings.push({
            pattern_id: pattern.id,
            severity: pattern.severity,
            function_name: func.name,
            module_name: moduleName,
            evidence: result.evidence,
            description: pattern.description,
            confidence: result.confidence,
          });
        }
      }
    }
  }

  // Deduplicate findings (same pattern + function = one finding)
  const uniqueFindings = deduplicateFindings(findings);

  // Sort by severity
  const severityOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  uniqueFindings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const analysisTime = Date.now() - startTime;

  console.log(`[StaticAnalysis] Completed in ${analysisTime}ms: ${uniqueFindings.length} findings across ${analyzedModules.size} modules`);

  return {
    findings: uniqueFindings,
    analyzed_modules: Array.from(analyzedModules),
    patterns_checked: STATIC_PATTERNS.map(p => p.id),
    analysis_time_ms: analysisTime,
  };
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

interface PatternCheckResult {
  match: boolean;
  evidence: string;
  confidence: 'definite' | 'likely' | 'possible';
}

function checkPattern(
  pattern: PatternDefinition,
  bytecode: string,
  func: PublicFunction
): PatternCheckResult {
  let matches: PatternCheckResult[] = [];

  // 1. Check signature patterns
  if (pattern.signatureCheck) {
    const result = pattern.signatureCheck(func);
    if (result.match) {
      matches.push({
        match: true,
        evidence: result.evidence,
        confidence: 'definite', // Signature matches are definite
      });
    }
  }

  // 2. Check bytecode patterns
  if (pattern.bytecodePatterns && bytecode) {
    for (const regex of pattern.bytecodePatterns) {
      const match = bytecode.match(regex);
      if (match) {
        // Extract context around the match
        const matchIndex = bytecode.indexOf(match[0]);
        const contextStart = Math.max(0, matchIndex - 50);
        const contextEnd = Math.min(bytecode.length, matchIndex + match[0].length + 50);
        const context = bytecode.substring(contextStart, contextEnd).trim();

        matches.push({
          match: true,
          evidence: `Bytecode pattern matched: "${match[0]}" in context: ...${context}...`,
          confidence: 'likely',
        });
        break; // One bytecode match is enough
      }
    }
  }

  // 3. Check combined patterns
  if (pattern.combinedCheck) {
    const result = pattern.combinedCheck(bytecode, func);
    if (result.match) {
      matches.push({
        match: true,
        evidence: result.evidence,
        confidence: 'likely',
      });
    }
  }

  // Return the best match (highest confidence)
  if (matches.length > 0) {
    // Prefer definite matches
    const definiteMatch = matches.find(m => m.confidence === 'definite');
    if (definiteMatch) return definiteMatch;
    return matches[0];
  }

  return { match: false, evidence: '', confidence: 'possible' };
}

function deduplicateFindings(findings: StaticFinding[]): StaticFinding[] {
  const seen = new Set<string>();
  const unique: StaticFinding[] = [];

  for (const finding of findings) {
    const key = `${finding.pattern_id}:${finding.module_name}:${finding.function_name}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(finding);
    }
  }

  return unique;
}

/**
 * Formats static findings for inclusion in LLM prompt.
 * Returns a structured string that the LLM can reference.
 */
export function formatStaticFindingsForPrompt(result: StaticAnalysisResult): string {
  if (result.findings.length === 0) {
    return 'No static patterns detected.';
  }

  const lines = [
    `Static Analysis detected ${result.findings.length} pattern(s):`,
    '',
  ];

  for (const finding of result.findings) {
    lines.push(`- [${finding.severity}] ${finding.pattern_id}`);
    lines.push(`  Function: ${finding.module_name}::${finding.function_name}`);
    lines.push(`  Evidence: ${finding.evidence}`);
    lines.push(`  Confidence: ${finding.confidence}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Returns the count of findings by severity level.
 */
export function countFindingsBySeverity(result: StaticAnalysisResult): Record<string, number> {
  const counts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  for (const finding of result.findings) {
    counts[finding.severity]++;
  }
  return counts;
}
