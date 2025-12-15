/**
 * Evidence Validator - Post-LLM Finding Validation
 *
 * Validates LLM-generated findings against actual bytecode and known patterns.
 * Filters hallucinated or invalid evidence before passing to Scorer.
 */

import type { AnalyzerResponse } from './langchain-schemas';

// ================================================================
// TYPES
// ================================================================

export interface ValidatedFinding {
  function_name: string;
  technical_reason: string;
  matched_pattern_id: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  contextual_notes?: string[];
  evidence_code_snippet?: string;
  // Validation fields
  validation_status: 'validated' | 'unvalidated' | 'invalid';
  validation_notes: string[];
  validation_score: number; // 0-100, higher = more trustworthy
}

export interface ValidationResult {
  validated_findings: ValidatedFinding[];
  validation_summary: {
    total: number;
    validated: number;
    unvalidated: number;
    invalid: number;
    avg_validation_score: number;
  };
  removed_findings: ValidatedFinding[];
}

export interface ValidationContext {
  disassembledCode: Record<string, string>;
  publicFunctions: Array<{ module: string; name: string; params: any[] }>;
  knownPatternIds: string[];
}

// ================================================================
// KNOWN PATTERN IDS
// ================================================================

// All valid pattern IDs from risk-patterns.ts
const KNOWN_PATTERN_IDS = [
  // Generic patterns
  'CRITICAL-01', 'CRITICAL-02',
  'HIGH-01', 'HIGH-02', 'HIGH-03', 'HIGH-04',
  'MEDIUM-01', 'MEDIUM-02', 'MEDIUM-03', 'MEDIUM-04',
  'LOW-01', 'LOW-02', 'LOW-03',
  // Sui-specific patterns
  'SUI-CRITICAL-01', 'SUI-CRITICAL-02',
  'SUI-HIGH-01', 'SUI-HIGH-02',
  'SUI-MEDIUM-01', 'SUI-MEDIUM-02',
  // Static analysis patterns
  'STATIC-ADMINCAP-TRANSFER', 'STATIC-TREASURYCAP-PUBLIC', 'STATIC-UPGRADECAP-TRANSFER',
  'STATIC-GENERIC-DRAIN', 'STATIC-BALANCE-DRAIN', 'STATIC-COIN-SPLIT-TRANSFER',
  'STATIC-UNLIMITED-MINT', 'STATIC-SHARED-MUT-NO-CAP', 'STATIC-DYNAMIC-FIELD-ADD',
  'STATIC-CLOCK-DEPENDENT', 'STATIC-PAUSE-CONTROL', 'STATIC-FEE-MANIPULATION',
  'STATIC-MISSING-EVENTS',
];

// Pattern ID to expected severity mapping
const PATTERN_SEVERITY_MAP: Record<string, 'Critical' | 'High' | 'Medium' | 'Low'> = {
  'CRITICAL-01': 'Critical', 'CRITICAL-02': 'Critical',
  'HIGH-01': 'High', 'HIGH-02': 'High', 'HIGH-03': 'High', 'HIGH-04': 'High',
  'MEDIUM-01': 'Medium', 'MEDIUM-02': 'Medium', 'MEDIUM-03': 'Medium', 'MEDIUM-04': 'Medium',
  'LOW-01': 'Low', 'LOW-02': 'Low', 'LOW-03': 'Low',
  'SUI-CRITICAL-01': 'Critical', 'SUI-CRITICAL-02': 'Critical',
  'SUI-HIGH-01': 'High', 'SUI-HIGH-02': 'High',
  'SUI-MEDIUM-01': 'Medium', 'SUI-MEDIUM-02': 'Medium',
  'STATIC-ADMINCAP-TRANSFER': 'Critical', 'STATIC-TREASURYCAP-PUBLIC': 'Critical',
  'STATIC-UPGRADECAP-TRANSFER': 'Critical',
  'STATIC-GENERIC-DRAIN': 'High', 'STATIC-BALANCE-DRAIN': 'High',
  'STATIC-COIN-SPLIT-TRANSFER': 'High', 'STATIC-UNLIMITED-MINT': 'High',
  'STATIC-SHARED-MUT-NO-CAP': 'Medium', 'STATIC-DYNAMIC-FIELD-ADD': 'Medium',
  'STATIC-CLOCK-DEPENDENT': 'Medium', 'STATIC-PAUSE-CONTROL': 'Medium',
  'STATIC-FEE-MANIPULATION': 'Medium', 'STATIC-MISSING-EVENTS': 'Low',
};

// ================================================================
// MAIN VALIDATION FUNCTION
// ================================================================

/**
 * Validates LLM findings against actual bytecode and known patterns.
 * Returns validated findings with status and removes clearly invalid ones.
 */
export function validateFindings(
  findings: AnalyzerResponse,
  context: ValidationContext
): ValidationResult {
  const validatedFindings: ValidatedFinding[] = [];
  const removedFindings: ValidatedFinding[] = [];

  // Combine all bytecode into one string for searching
  const allBytecode = Object.values(context.disassembledCode).join('\n');

  // Create set of known function names
  const knownFunctions = new Set(
    context.publicFunctions.map(f => f.name.toLowerCase())
  );

  for (const finding of findings.technical_findings || []) {
    const validationNotes: string[] = [];
    let validationScore = 100; // Start at 100, deduct for issues

    // 1. Check pattern ID validity
    const patternIdValid = isPatternIdValid(finding.matched_pattern_id);
    if (!patternIdValid) {
      validationNotes.push(`Unknown pattern ID: ${finding.matched_pattern_id}`);
      validationScore -= 30;
    }

    // 2. Check function name exists
    const functionExists = isFunctionKnown(finding.function_name, knownFunctions);
    if (!functionExists) {
      validationNotes.push(`Function not found in public functions: ${finding.function_name}`);
      validationScore -= 25;
    }

    // 3. Check evidence exists in bytecode
    const evidenceResult = validateEvidence(finding.evidence_code_snippet, allBytecode, context.disassembledCode);
    if (evidenceResult.found) {
      validationNotes.push(`Evidence verified in module: ${evidenceResult.module || 'unknown'}`);
    } else if (finding.evidence_code_snippet) {
      validationNotes.push('Evidence snippet not found in bytecode');
      validationScore -= 20;
    } else {
      validationNotes.push('No evidence provided');
      validationScore -= 10;
    }

    // 4. Check severity consistency
    const expectedSeverity = PATTERN_SEVERITY_MAP[finding.matched_pattern_id];
    if (expectedSeverity && finding.severity !== expectedSeverity) {
      validationNotes.push(`Severity mismatch: expected ${expectedSeverity}, got ${finding.severity}`);
      validationScore -= 15;
    }

    // 5. Check for suspicious patterns (hallucination indicators)
    const hallucationCheck = checkForHallucination(finding);
    if (hallucationCheck.suspicious) {
      validationNotes.push(...hallucationCheck.reasons);
      validationScore -= hallucationCheck.penalty;
    }

    // Determine validation status
    let status: 'validated' | 'unvalidated' | 'invalid';
    if (validationScore >= 70) {
      status = 'validated';
    } else if (validationScore >= 40) {
      status = 'unvalidated';
    } else {
      status = 'invalid';
    }

    const validatedFinding: ValidatedFinding = {
      ...finding,
      validation_status: status,
      validation_notes: validationNotes,
      validation_score: Math.max(0, validationScore),
    };

    // Only remove clearly invalid findings
    if (status === 'invalid') {
      removedFindings.push(validatedFinding);
    } else {
      validatedFindings.push(validatedFinding);
    }
  }

  // Calculate summary
  const validated = validatedFindings.filter(f => f.validation_status === 'validated').length;
  const unvalidated = validatedFindings.filter(f => f.validation_status === 'unvalidated').length;
  const avgScore = validatedFindings.length > 0
    ? validatedFindings.reduce((sum, f) => sum + f.validation_score, 0) / validatedFindings.length
    : 0;

  console.log(`[Validation] ${validated} validated, ${unvalidated} unvalidated, ${removedFindings.length} invalid (removed)`);

  return {
    validated_findings: validatedFindings,
    validation_summary: {
      total: (findings.technical_findings || []).length,
      validated,
      unvalidated,
      invalid: removedFindings.length,
      avg_validation_score: Math.round(avgScore),
    },
    removed_findings: removedFindings,
  };
}

// ================================================================
// VALIDATION HELPERS
// ================================================================

function isPatternIdValid(patternId: string): boolean {
  if (!patternId) return false;

  // Check exact match
  if (KNOWN_PATTERN_IDS.includes(patternId)) return true;

  // Check if it matches pattern format (e.g., CRITICAL-01, HIGH-02)
  const patternFormats = [
    /^CRITICAL-\d+$/,
    /^HIGH-\d+$/,
    /^MEDIUM-\d+$/,
    /^LOW-\d+$/,
    /^SUI-CRITICAL-\d+$/,
    /^SUI-HIGH-\d+$/,
    /^SUI-MEDIUM-\d+$/,
    /^SUI-LOW-\d+$/,
    /^STATIC-/,
  ];

  return patternFormats.some(regex => regex.test(patternId));
}

function isFunctionKnown(functionName: string, knownFunctions: Set<string>): boolean {
  if (!functionName) return false;

  // Direct match
  const normalizedName = functionName.toLowerCase();
  if (knownFunctions.has(normalizedName)) return true;

  // Handle module::function format
  if (functionName.includes('::')) {
    const parts = functionName.split('::');
    const funcOnly = parts[parts.length - 1].toLowerCase();
    if (knownFunctions.has(funcOnly)) return true;
  }

  // Fuzzy match - function name might be slightly different
  for (const known of knownFunctions) {
    if (known.includes(normalizedName) || normalizedName.includes(known)) {
      return true;
    }
  }

  return false;
}

interface EvidenceValidationResult {
  found: boolean;
  module?: string;
  matchQuality: 'exact' | 'partial' | 'none';
}

function validateEvidence(
  evidence: string | undefined,
  allBytecode: string,
  modulesBytecode: Record<string, string>
): EvidenceValidationResult {
  if (!evidence || evidence.trim().length === 0) {
    return { found: false, matchQuality: 'none' };
  }

  // Clean evidence - remove quotes, ellipsis, etc.
  const cleanEvidence = evidence
    .replace(/\\n/g, '\n')
    .replace(/\.\.\./g, '')
    .replace(/^["']|["']$/g, '')
    .trim();

  // Try exact match first
  if (allBytecode.includes(cleanEvidence)) {
    // Find which module contains it
    for (const [moduleName, code] of Object.entries(modulesBytecode)) {
      if (code.includes(cleanEvidence)) {
        return { found: true, module: moduleName, matchQuality: 'exact' };
      }
    }
    return { found: true, matchQuality: 'exact' };
  }

  // Try partial match - extract key identifiers from evidence
  const keyParts = extractKeyParts(cleanEvidence);
  if (keyParts.length > 0) {
    const matchCount = keyParts.filter(part => allBytecode.includes(part)).length;
    if (matchCount >= keyParts.length * 0.6) { // 60% of key parts found
      return { found: true, matchQuality: 'partial' };
    }
  }

  return { found: false, matchQuality: 'none' };
}

function extractKeyParts(evidence: string): string[] {
  const parts: string[] = [];

  // Extract function calls (e.g., "coin::mint", "transfer::public_transfer")
  const funcCalls = evidence.match(/\w+::\w+/g) || [];
  parts.push(...funcCalls);

  // Extract field accesses (e.g., "BondingCurve.status")
  const fieldAccesses = evidence.match(/\w+\.\w+/g) || [];
  parts.push(...fieldAccesses);

  // Extract bytecode operations (e.g., "MutBorrowField", "WriteRef")
  const operations = evidence.match(/(?:MutBorrow|ImmBorrow|MoveLoc|CopyLoc|StLoc|Call|Ret|WriteRef|ReadRef|Pack|Unpack)\w*/g) || [];
  parts.push(...operations);

  return [...new Set(parts)]; // Deduplicate
}

interface HallucationCheckResult {
  suspicious: boolean;
  reasons: string[];
  penalty: number;
}

function checkForHallucination(finding: any): HallucationCheckResult {
  const reasons: string[] = [];
  let penalty = 0;

  // Check for overly generic technical reasons
  const genericPhrases = [
    'could potentially',
    'might be able to',
    'appears to allow',
    'seems like',
    'possibly',
  ];

  const techReason = (finding.technical_reason || '').toLowerCase();
  for (const phrase of genericPhrases) {
    if (techReason.includes(phrase)) {
      reasons.push(`Vague language detected: "${phrase}"`);
      penalty += 5;
    }
  }

  // Check for evidence that looks fabricated (too perfect)
  if (finding.evidence_code_snippet) {
    const evidence = finding.evidence_code_snippet;

    // Evidence with line numbers that are suspiciously round
    if (/Line \d{2}00:/i.test(evidence)) {
      reasons.push('Suspiciously round line numbers');
      penalty += 10;
    }

    // Evidence that's just a description, not actual code
    if (evidence.length < 20 && !/[:\(\)\[\]{}]/.test(evidence)) {
      reasons.push('Evidence appears to be description, not code');
      penalty += 15;
    }
  }

  // Check for inconsistent severity vs reason
  const severityKeywords: Record<string, string[]> = {
    Critical: ['drain', 'steal', 'unlimited', 'arbitrary', 'all funds', 'rug pull'],
    High: ['mint', 'pause', 'freeze', 'manipulate', 'bypass'],
    Medium: ['oracle', 'timestamp', 'flash loan', 'reentrancy'],
    Low: ['overflow', 'dos', 'event', 'gas'],
  };

  const severity = finding.severity as string;
  const expectedKeywords = severityKeywords[severity] || [];
  const hasExpectedKeyword = expectedKeywords.some(kw => techReason.includes(kw));

  if (!hasExpectedKeyword && severity === 'Critical') {
    reasons.push('Critical severity without strong risk keywords');
    penalty += 10;
  }

  return {
    suspicious: penalty > 0,
    reasons,
    penalty,
  };
}

// ================================================================
// EXPORTS
// ================================================================

export { KNOWN_PATTERN_IDS, PATTERN_SEVERITY_MAP };
