import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createLLM, getModelConfig, MODEL_PRESETS } from './langchain-llm';
import { analyzerPromptTemplate, scorerPromptTemplate, reporterPromptTemplate } from './langchain-prompts';
import { analyzerParser, scorerParser, reporterParser } from './langchain-schemas';
import type { AnalyzerResponse, ScorerResponse, ReporterResponse } from './langchain-schemas';
import type { StaticAnalysisResult } from './static-analyzer';
import { formatStaticFindingsForPrompt } from './static-analyzer';
import { validateFindings, type ValidationResult, type ValidatedFinding, KNOWN_PATTERN_IDS } from './evidence-validator';
import { runCrossModuleAnalysis, formatCrossModuleForPrompt, type CrossModuleAnalysisResult } from './cross-module-analyzer';
import {
  createMetricsCollector,
  updateFromBytecode,
  updateFromStaticAnalysis,
  updateFromCrossModule,
  updateFromValidation,
  updateFromLLM,
  finalizeMetrics,
  calculateConfidence,
  type MetricsCollector,
} from './confidence-calculator';


// Helper: Strip markdown code blocks from JSON responses
function stripMarkdownJson(text: string): string {
  if (!text || typeof text !== 'string') {
    console.error('[stripMarkdownJson] Invalid input:', typeof text, text);
    return '{}';
  }

  let cleaned = text.trim();

  // Remove ```json and ``` wrappers
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*\n?/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*\n?/, '');
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\n?```\s*$/, '');
  }

  return cleaned.trim();
}

// Helper: Sleep for retry logic
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Retry with exponential backoff
// openrouter/free rotates models on each call, so retries naturally hit different models
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000,
  operationName: string = 'operation',
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        console.error(`[Retry] ${operationName} failed after ${maxRetries} attempts:`, lastError.message);
        throw lastError;
      }

      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      console.warn(`[Retry] ${operationName} attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
      console.warn(`[Retry] Waiting ${delay}ms before retry (next call may route to a different free model)...`);
      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed');
}

export interface ContractAnalysisInput {
  publicFunctions: any[];
  structDefinitions: any;
  disassembledCode: any;
  riskPatterns: string;
  staticFindings?: StaticAnalysisResult;  // Pre-LLM static analysis results
  crossModuleAnalysis?: CrossModuleAnalysisResult;  // Cross-module capability flow analysis
}

export interface SafetyCard {
  summary: string;
  risky_functions: Array<{ function_name: string; reason: string }>;
  rug_pull_indicators: Array<{ pattern_name: string; evidence: string }>;
  impact_on_user: string;
  why_risky_one_liner: string;
  risk_score: number;
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  technical_findings?: any[];
  validation_summary?: {
    total: number;
    validated: number;
    unvalidated: number;
    invalid: number;
    avg_validation_score: number;
  };
  // Phase 5: Confidence metrics
  confidence_interval?: {
    lower: number;
    upper: number;
  };
  confidence_level?: 'high' | 'medium' | 'low';
  analysis_quality?: {
    modules_analyzed: number;
    modules_total: number;
    functions_analyzed: number;
    functions_total: number;
    truncation_occurred: boolean;
    validation_rate: number;
    static_analysis_coverage: number;
  };
  limitations?: string[];
  // Phase 6: Dependency risks
  dependency_summary?: {
    total_dependencies: number;
    audited_count: number;
    unaudited_count: number;
    high_risk_count: number;
    system_packages: number;
  };
}

// ================================================================
// MAP-REDUCE CHUNKED ANALYSIS
// ================================================================

interface ModuleChunk {
  moduleName: string;
  publicFunctions: any[];
  structDefinitions: any;
  disassembledCode: string;
}

/**
 * Chunks a contract into independent module-level analysis units.
 * Each chunk contains only the functions, structs, and code for one module.
 */
function chunkByModule(input: ContractAnalysisInput): ModuleChunk[] {
  const { publicFunctions, structDefinitions, disassembledCode } = input;

  // Group functions by module name
  const moduleMap = new Map<string, any[]>();
  for (const func of publicFunctions) {
    const moduleName = func.module;
    if (!moduleMap.has(moduleName)) {
      moduleMap.set(moduleName, []);
    }
    moduleMap.get(moduleName)!.push(func);
  }

  // Create chunks for each module
  const chunks: ModuleChunk[] = [];
  for (const [moduleName, funcs] of moduleMap) {
    // Get disassembled code for this module
    const moduleCode = disassembledCode?.[moduleName];
    if (!moduleCode) {
      console.warn(`[Chunk] No disassembled code found for module: ${moduleName}`);
      continue;
    }

    // Filter struct definitions to only those used by this module's functions
    const relevantStructs = filterStructsForModule(structDefinitions, funcs);

    // Truncate module code if too large
    const codeStr = typeof moduleCode === 'string' ? moduleCode : JSON.stringify(moduleCode);
    const truncatedCode = codeStr.length > MAX_MODULE_CHARS
      ? codeStr.substring(0, MAX_MODULE_CHARS) + '\n... [MODULE TRUNCATED]'
      : codeStr;

    chunks.push({
      moduleName,
      publicFunctions: funcs,
      structDefinitions: relevantStructs,
      disassembledCode: truncatedCode,
    });
  }

  return chunks;
}

/**
 * Filters struct definitions to only include those used by the given functions.
 */
function filterStructsForModule(allStructs: any, functions: any[]): any {
  if (!allStructs || typeof allStructs !== 'object') {
    return {};
  }

  // Collect all struct IDs referenced by these functions
  const usedStructIds = new Set<string>();
  for (const func of functions) {
    for (const param of func.params || []) {
      if (param.value && typeof param.value === 'string') {
        usedStructIds.add(param.value);
      }
      // Also check typeArgs
      if (param.typeArgs) {
        for (const typeArg of param.typeArgs) {
          if (typeof typeArg === 'string' && typeArg.includes('::')) {
            usedStructIds.add(typeArg);
          }
        }
      }
    }
  }

  // Filter structs to only used ones
  const filtered: any = {};
  for (const structId of usedStructIds) {
    if (allStructs[structId]) {
      filtered[structId] = allStructs[structId];
    }
  }

  return filtered;
}

/**
 * Analyzes multiple modules in parallel using Promise.allSettled for fault tolerance.
 * Returns aggregated findings from all successful module analyses.
 * Supports automatic fallback to paid model on rate limits.
 */
async function analyzeModulesInParallel(
  chunks: ModuleChunk[],
  riskPatterns: string
): Promise<AnalyzerResponse> {
  console.log(`[MapReduce] Starting parallel analysis of ${chunks.length} modules...`);
  console.log(`[MapReduce] Model: ${MODEL_PRESETS.analyzer.model}`);

  const analyzerChain = await createAnalyzerChain();

  // Create analysis tasks for each module
  const analysisPromises = chunks.map(async (chunk, index) => {
    const startTime = Date.now();
    console.log(`[Chunk ${index + 1}/${chunks.length}] Analyzing module: ${chunk.moduleName} (${chunk.publicFunctions.length} functions)`);

    try {
      // Create module-scoped input
      const moduleInput: ContractAnalysisInput = {
        publicFunctions: chunk.publicFunctions,
        structDefinitions: chunk.structDefinitions,
        disassembledCode: { [chunk.moduleName]: chunk.disassembledCode },
        riskPatterns,
      };

      const rawResponse = await retryWithBackoff(
        () => analyzerChain.invoke(moduleInput),
        3,
        2000,
        `Analyzer for ${chunk.moduleName}`,
      );

      const findings = await safeParseAnalyzerResponse(rawResponse);
      const duration = Date.now() - startTime;

      console.log(`[Chunk ${index + 1}/${chunks.length}] ${chunk.moduleName}: ${findings.technical_findings?.length || 0} findings (${duration}ms)`);

      return {
        moduleName: chunk.moduleName,
        findings: findings.technical_findings || [],
        success: true,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[Chunk ${index + 1}/${chunks.length}] ${chunk.moduleName}: FAILED after ${duration}ms -`, error instanceof Error ? error.message : error);

      return {
        moduleName: chunk.moduleName,
        findings: [],
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // Run all analyses in parallel with fault tolerance
  const results = await Promise.allSettled(analysisPromises);

  // Aggregate findings from successful analyses
  const allFindings: any[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { moduleName, findings, success } = result.value;
      if (success) {
        successCount++;
        // Add module name to each finding for context
        for (const finding of findings) {
          allFindings.push({
            ...finding,
            _module: moduleName, // Track source module
          });
        }
      } else {
        failCount++;
      }
    } else {
      failCount++;
      console.error('[MapReduce] Promise rejected:', result.reason);
    }
  }

  console.log(`[MapReduce] Completed: ${successCount}/${chunks.length} modules succeeded, ${allFindings.length} total findings`);

  if (failCount > 0) {
    console.warn(`[MapReduce] Warning: ${failCount} module(s) failed analysis`);
  }

  // Sort findings by severity (Critical > High > Medium > Low)
  const severityOrder: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  allFindings.sort((a, b) => {
    const aOrder = severityOrder[a.severity] ?? 4;
    const bOrder = severityOrder[b.severity] ?? 4;
    return aOrder - bOrder;
  });

  return { technical_findings: allFindings };
}

// Helper: Truncate disassembled code to fit context limits
// Max ~60k tokens for disassembled code (leaving room for other prompt parts)
const MAX_DISASSEMBLED_CHARS = 300000; // ~60k tokens (rough estimate: 1 token ≈ 5 chars)
const MAX_MODULE_CHARS = 50000; // Max per module

function truncateDisassembledCode(
  disassembledCode: any,
  publicFunctions: any[]
): string {
  if (!disassembledCode || typeof disassembledCode !== 'object') {
    return JSON.stringify(disassembledCode || {}, null, 2);
  }

  // Get module names that have public functions
  const modulesWithPublicFunctions = new Set(
    publicFunctions.map(fn => fn.module)
  );

  const truncated: any = {};
  let totalChars = 0;
  let truncatedCount = 0;

  for (const [moduleName, moduleCode] of Object.entries(disassembledCode)) {
    // Only include modules with public functions
    if (!modulesWithPublicFunctions.has(moduleName)) {
      continue;
    }

    const moduleStr = typeof moduleCode === 'string' ? moduleCode : JSON.stringify(moduleCode);

    // Check if adding this module would exceed total limit
    if (totalChars + moduleStr.length > MAX_DISASSEMBLED_CHARS) {
      truncated['_TRUNCATED_NOTE'] = `[TRUNCATED: ${truncatedCount} modules omitted due to size limits. Analysis focuses on modules with public functions.]`;
      break;
    }

    // Truncate individual module if too large
    if (moduleStr.length > MAX_MODULE_CHARS) {
      truncated[moduleName] = moduleStr.substring(0, MAX_MODULE_CHARS) + '\n... [MODULE TRUNCATED]';
      totalChars += MAX_MODULE_CHARS;
    } else {
      truncated[moduleName] = moduleCode;
      totalChars += moduleStr.length;
    }
  }

  const result = JSON.stringify(truncated, null, 2);
  console.log(`[Truncate] Disassembled code: ${totalChars.toLocaleString()} chars (${Object.keys(truncated).length} modules)`);
  return result;
}

// Helper: Try to fix truncated JSON by closing brackets
function tryFixTruncatedJson(text: string): string {
  let fixed = text.trim();

  // Count open brackets
  const openBraces = (fixed.match(/\{/g) || []).length;
  const closeBraces = (fixed.match(/\}/g) || []).length;
  const openBrackets = (fixed.match(/\[/g) || []).length;
  const closeBrackets = (fixed.match(/\]/g) || []).length;

  // Remove trailing incomplete object (ending with comma or incomplete field)
  fixed = fixed.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"{}[\]]*$/, '');
  fixed = fixed.replace(/,\s*\{[^}]*$/, '');
  fixed = fixed.replace(/,\s*$/, '');

  // Close missing brackets
  const missingBrackets = openBrackets - closeBrackets;
  const missingBraces = openBraces - closeBraces;

  for (let i = 0; i < missingBrackets; i++) {
    fixed += ']';
  }
  for (let i = 0; i < missingBraces; i++) {
    fixed += '}';
  }

  return fixed;
}

// Helper: Extract partial findings from truncated JSON
function extractPartialFindings(text: string): any[] {
  const findings: any[] = [];

  // Try to extract complete finding objects using regex
  const findingPattern = /\{\s*"function_name"\s*:\s*"([^"]+)"\s*,\s*"technical_reason"\s*:\s*"([^"]+)"\s*,\s*"matched_pattern_id"\s*:\s*"([^"]+)"\s*,\s*"severity"\s*:\s*"(Critical|High|Medium|Low)"[^}]*\}/g;

  let match;
  while ((match = findingPattern.exec(text)) !== null) {
    try {
      const findingStr = match[0];
      // Try to fix the finding object if it has issues
      const finding = JSON.parse(findingStr);
      if (finding.function_name && finding.matched_pattern_id) {
        findings.push(finding);
      }
    } catch {
      // If full object fails, extract key fields
      findings.push({
        function_name: match[1],
        technical_reason: match[2],
        matched_pattern_id: match[3],
        severity: match[4],
      });
    }
  }

  return findings;
}

// Safe parser wrapper with validation, logging, and truncation recovery
async function safeParseAnalyzerResponse(text: string): Promise<AnalyzerResponse> {
  const cleaned = stripMarkdownJson(text);

  if (!cleaned || cleaned === '{}') {
    console.warn('[Parser] Empty or invalid analyzer response, returning empty findings');
    return { technical_findings: [] };
  }

  try {
    const parsed = await analyzerParser.parse(cleaned);

    // Validate structure
    if (!parsed || typeof parsed !== 'object') {
      console.error('[Parser] Parsed result is not an object:', parsed);
      return { technical_findings: [] };
    }

    if (!Array.isArray(parsed.technical_findings)) {
      console.error('[Parser] technical_findings is not an array:', parsed);
      return { technical_findings: [] };
    }

    return parsed;
  } catch (parseError) {
    console.warn('[Parser] Standard parsing failed, attempting recovery...');
    console.warn('[Parser] Error:', parseError instanceof Error ? parseError.message : parseError);

    // Strategy 1: Try to fix truncated JSON by closing brackets
    try {
      const fixed = tryFixTruncatedJson(cleaned);
      const parsed = JSON.parse(fixed);
      if (parsed.technical_findings && Array.isArray(parsed.technical_findings)) {
        console.log(`[Parser] Recovery: Fixed truncated JSON, found ${parsed.technical_findings.length} findings`);
        return parsed as AnalyzerResponse;
      }
    } catch {
      console.warn('[Parser] Recovery: Bracket-fixing failed');
    }

    // Strategy 2: Try to extract complete JSON object
    try {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extracted = JSON.parse(jsonMatch[0]);
        if (extracted.technical_findings && Array.isArray(extracted.technical_findings)) {
          console.log(`[Parser] Recovery: Extracted JSON object, found ${extracted.technical_findings.length} findings`);
          return extracted as AnalyzerResponse;
        }
      }
    } catch {
      console.warn('[Parser] Recovery: JSON extraction failed');
    }

    // Strategy 3: Extract individual findings using regex (last resort)
    const partialFindings = extractPartialFindings(cleaned);
    if (partialFindings.length > 0) {
      console.log(`[Parser] Recovery: Extracted ${partialFindings.length} partial findings via regex`);
      return { technical_findings: partialFindings };
    }

    console.error('[Parser] All recovery strategies failed');
    console.error('[Parser] Raw text (first 1000 chars):', text?.substring(0, 1000));
    return { technical_findings: [] };
  }
}

// Agent 1: Analyzer Chain
async function createAnalyzerChain() {
  const config = getModelConfig('analyzer');
  const llm = createLLM(config);
  const stringParser = new StringOutputParser();

  return RunnableSequence.from([
    {
      riskPatterns: (input: ContractAnalysisInput) => input.riskPatterns,
      publicFunctions: (input: ContractAnalysisInput) => JSON.stringify(input.publicFunctions, null, 2),
      structDefinitions: (input: ContractAnalysisInput) => JSON.stringify(input.structDefinitions, null, 2),
      disassembledCode: (input: ContractAnalysisInput) => truncateDisassembledCode(input.disassembledCode, input.publicFunctions),
      staticFindings: (input: ContractAnalysisInput) => input.staticFindings
        ? formatStaticFindingsForPrompt(input.staticFindings)
        : 'No static analysis performed.',
      crossModuleAnalysis: (input: ContractAnalysisInput) => input.crossModuleAnalysis
        ? formatCrossModuleForPrompt(input.crossModuleAnalysis)
        : 'No cross-module risks detected.',
      formatInstructions: () => analyzerParser.getFormatInstructions(),
    },
    analyzerPromptTemplate,
    llm,
    stringParser,
  ]);
}

// Safe parser wrapper for scorer
async function safeParseScorerResponse(text: string): Promise<ScorerResponse> {
  const cleaned = stripMarkdownJson(text);

  try {
    const parsed = await scorerParser.parse(cleaned);

    if (!parsed || typeof parsed.risk_score !== 'number') {
      console.error('[Parser] Invalid scorer response:', parsed);
      return { risk_score: 50, justification: 'Unable to parse score', confidence: 'Low' };
    }

    return parsed;
  } catch (parseError) {
    console.error('[Parser] Failed to parse scorer response:', parseError);

    // Try manual extraction
    try {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extracted = JSON.parse(jsonMatch[0]);
        if (typeof extracted.risk_score === 'number') {
          return {
            risk_score: extracted.risk_score,
            justification: extracted.justification || 'Extracted from raw response',
            confidence: extracted.confidence || 'Low',
          };
        }
      }
    } catch {
      // Ignore extraction error
    }

    return { risk_score: 50, justification: 'Parse error - default score', confidence: 'Low' };
  }
}

// Agent 2: Scorer Chain
async function createScorerChain() {
  const config = getModelConfig('scorer');
  const llm = createLLM(config);
  const stringParser = new StringOutputParser();

  return RunnableSequence.from([
    {
      findingsSummary: (input: { findings: AnalyzerResponse }) => {
        const findings = input.findings?.technical_findings || [];
        if (findings.length === 0) {
          return 'No security findings detected.';
        }
        return findings.map(f => {
          const context = f.contextual_notes ? ` | Context: ${f.contextual_notes.join(', ')}` : '';
          return `- Func: ${f.function_name}, Pattern: ${f.matched_pattern_id} (${f.severity})${context}`;
        }).join('\n');
      },
      formatInstructions: () => scorerParser.getFormatInstructions(),
    },
    scorerPromptTemplate,
    llm,
    stringParser,
  ]);
}

// Helper: Extract risky functions from truncated reporter response
function extractRiskyFunctions(text: string): Array<{ function_name: string; reason: string }> {
  const functions: Array<{ function_name: string; reason: string }> = [];
  const pattern = /\{\s*"function_name"\s*:\s*"([^"]+)"\s*,\s*"reason"\s*:\s*"([^"]+)"/g;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    functions.push({
      function_name: match[1],
      reason: match[2].substring(0, 300), // Limit reason length
    });
  }

  return functions;
}

// Safe parser wrapper for reporter with truncation recovery
async function safeParseReporterResponse(text: string): Promise<ReporterResponse> {
  const cleaned = stripMarkdownJson(text);

  try {
    const parsed = await reporterParser.parse(cleaned);

    if (!parsed || typeof parsed.summary !== 'string') {
      console.error('[Parser] Invalid reporter response:', parsed);
      return getDefaultReporterResponse();
    }

    return parsed;
  } catch (parseError) {
    console.warn('[Parser] Reporter parsing failed, attempting recovery...');

    // Strategy 1: Try to fix truncated JSON
    try {
      const fixed = tryFixTruncatedJson(cleaned);
      const extracted = JSON.parse(fixed);
      if (extracted.summary) {
        console.log('[Parser] Recovery: Fixed truncated reporter JSON');
        return {
          summary: extracted.summary,
          risky_functions: (extracted.risky_functions || []).slice(0, 10),
          rug_pull_indicators: (extracted.rug_pull_indicators || []).slice(0, 5),
          impact_on_user: extracted.impact_on_user || 'See risky functions for details',
          why_risky_one_liner: extracted.why_risky_one_liner || 'Multiple security concerns detected',
        };
      }
    } catch {
      console.warn('[Parser] Recovery: Bracket-fixing failed for reporter');
    }

    // Strategy 2: Try manual extraction
    try {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extracted = JSON.parse(jsonMatch[0]);
        if (extracted.summary) {
          console.log('[Parser] Recovery: Extracted reporter JSON object');
          return {
            summary: extracted.summary,
            risky_functions: (extracted.risky_functions || []).slice(0, 10),
            rug_pull_indicators: (extracted.rug_pull_indicators || []).slice(0, 5),
            impact_on_user: extracted.impact_on_user || 'See risky functions for details',
            why_risky_one_liner: extracted.why_risky_one_liner || 'Multiple security concerns detected',
          };
        }
      }
    } catch {
      console.warn('[Parser] Recovery: JSON extraction failed for reporter');
    }

    // Strategy 3: Extract partial data using regex
    const riskyFunctions = extractRiskyFunctions(cleaned);
    if (riskyFunctions.length > 0) {
      console.log(`[Parser] Recovery: Extracted ${riskyFunctions.length} risky functions via regex`);

      // Try to extract summary
      const summaryMatch = cleaned.match(/"summary"\s*:\s*"([^"]+)"/);
      const summary = summaryMatch ? summaryMatch[1] : 'Contract security analysis (partial recovery)';

      return {
        summary,
        risky_functions: riskyFunctions.slice(0, 10),
        rug_pull_indicators: [],
        impact_on_user: 'Review the risky functions identified above',
        why_risky_one_liner: 'Multiple potential security risks detected',
      };
    }

    console.error('[Parser] All reporter recovery strategies failed');
    return getDefaultReporterResponse();
  }
}

function getDefaultReporterResponse(): ReporterResponse {
  return {
    summary: 'Unable to generate detailed report due to parsing error.',
    risky_functions: [],
    rug_pull_indicators: [],
    impact_on_user: 'Manual review recommended.',
    why_risky_one_liner: 'Analysis incomplete - review raw findings',
  };
}

// Agent 3: Reporter Chain
async function createReporterChain() {
  const config = getModelConfig('reporter');
  const llm = createLLM(config);
  const stringParser = new StringOutputParser();

  return RunnableSequence.from([
    {
      technicalFindings: (input: { findings: AnalyzerResponse; score: ScorerResponse }) =>
        JSON.stringify(input.findings?.technical_findings || [], null, 2),
      riskScore: (input: { findings: AnalyzerResponse; score: ScorerResponse }) =>
        JSON.stringify(input.score, null, 2),
      formatInstructions: () => reporterParser.getFormatInstructions(),
    },
    reporterPromptTemplate,
    llm,
    stringParser,
  ]);
}

// Helper function to determine risk level
function getRiskLevel(score: number): 'low' | 'moderate' | 'high' | 'critical' {
  if (score >= 70) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'moderate';
  return 'low';
}

// ================================================================
// MAIN ANALYSIS ENTRY POINT
// ================================================================

/**
 * Main analysis function with Map-Reduce support for large contracts.
 * - Single module: Uses direct single-pass analysis
 * - Multiple modules: Uses parallel chunked analysis (Map-Reduce pattern)
 */
export async function runLangChainAnalysis(input: ContractAnalysisInput): Promise<SafetyCard> {
  const model = MODEL_PRESETS.analyzer.model;

  // Initialize metrics collector for confidence scoring
  const metrics = createMetricsCollector();

  try {
    console.log('[LangChain] Starting 3-agent analysis...');
    console.log(`[LangChain] Model: ${model} (auto-routes to available free models)`);

    // Update metrics from input data
    updateFromBytecode(metrics, input.disassembledCode, input.publicFunctions);
    if (input.staticFindings) {
      updateFromStaticAnalysis(metrics, input.staticFindings);
    }
    if (input.crossModuleAnalysis) {
      updateFromCrossModule(metrics, input.crossModuleAnalysis);
    }

    // Check if we should use chunked analysis
    const chunks = chunkByModule(input);
    const useChunkedAnalysis = chunks.length > 1;

    let findings: AnalyzerResponse;

    if (useChunkedAnalysis) {
      // ===== MAP-REDUCE: Parallel module analysis =====
      console.log(`[LangChain] Large contract detected: ${chunks.length} modules, ${input.publicFunctions.length} total functions`);
      console.log('[LangChain] Using Map-Reduce parallel analysis...');

      findings = await analyzeModulesInParallel(chunks, input.riskPatterns);
    } else {
      // ===== SINGLE-PASS: Traditional analysis =====
      console.log(`[LangChain] Small contract: ${chunks.length} module(s), using single-pass analysis`);
      console.log(`[Agent 1] Running Analyzer (${model})...`);

      const analyzerChain = await createAnalyzerChain();
      const rawAnalyzerResponse = await retryWithBackoff(
        () => analyzerChain.invoke(input),
        3,
        2000,
        'Analyzer LLM call',
      );

      console.log('[Agent 1] Raw response received, parsing...');
      findings = await safeParseAnalyzerResponse(rawAnalyzerResponse);
    }

    const findingsCount = findings.technical_findings?.length || 0;
    console.log(`[Agent 1] Total findings: ${findingsCount}`);

    // Validate findings against bytecode and known patterns
    console.log('[Validation] Validating LLM findings against bytecode...');
    const validationResult = validateFindings(findings, {
      disassembledCode: input.disassembledCode,
      publicFunctions: input.publicFunctions,
      knownPatternIds: KNOWN_PATTERN_IDS,
    });

    // Update findings with only validated ones (invalid findings removed)
    findings = {
      technical_findings: validationResult.validated_findings.map(vf => ({
        function_name: vf.function_name,
        technical_reason: vf.technical_reason,
        matched_pattern_id: vf.matched_pattern_id,
        severity: vf.severity,
        contextual_notes: [
          ...(vf.contextual_notes || []),
          `Validation: ${vf.validation_status} (score: ${vf.validation_score})`,
        ],
        evidence_code_snippet: vf.evidence_code_snippet,
      })),
    };

    const validatedCount = findings.technical_findings?.length || 0;
    console.log(`[Validation] ${validationResult.validation_summary.validated} validated, ${validationResult.validation_summary.unvalidated} unvalidated, ${validationResult.validation_summary.invalid} removed`);

    // Update metrics from validation
    updateFromValidation(metrics, validationResult);
    updateFromLLM(metrics, findingsCount);

    // Fast lane: No findings after validation
    if (validatedCount === 0) {
      console.log('[LangChain] No findings - returning low risk card');
      finalizeMetrics(metrics);
      const noFindingsConfidence = calculateConfidence(metrics, 5);
      return {
        summary: "No security risks detected.",
        risky_functions: [],
        rug_pull_indicators: [],
        impact_on_user: "No significant risks identified.",
        why_risky_one_liner: "Low risk - no suspicious patterns detected",
        risk_score: 5,
        risk_level: 'low',
        technical_findings: [],
        confidence_interval: {
          lower: noFindingsConfidence.confidence_interval.lower,
          upper: noFindingsConfidence.confidence_interval.upper,
        },
        confidence_level: noFindingsConfidence.confidence_level,
        analysis_quality: {
          modules_analyzed: noFindingsConfidence.analysis_quality.modules_analyzed,
          modules_total: noFindingsConfidence.analysis_quality.modules_total,
          functions_analyzed: noFindingsConfidence.analysis_quality.functions_analyzed,
          functions_total: noFindingsConfidence.analysis_quality.functions_total,
          truncation_occurred: noFindingsConfidence.analysis_quality.truncation_occurred,
          validation_rate: noFindingsConfidence.analysis_quality.validation_rate,
          static_analysis_coverage: noFindingsConfidence.analysis_quality.static_analysis_coverage,
        },
        limitations: noFindingsConfidence.limitations.map(l => l.description),
      };
    }

    // Agent 2: Score with retry
    console.log(`[Agent 2] Running Scorer (${model})...`);
    const scorerChain = await createScorerChain();

    const rawScorerResponse = await retryWithBackoff(
      () => scorerChain.invoke({ findings }),
      3,
      2000,
      'Scorer LLM call',
    );

    console.log('[Agent 2] Raw response received, parsing...');
    const score = await safeParseScorerResponse(rawScorerResponse);
    console.log(`[Agent 2] Risk score: ${score.risk_score}`);

    // Agent 3: Report with retry
    console.log(`[Agent 3] Running Reporter (${model})...`);
    const reporterChain = await createReporterChain();

    const rawReporterResponse = await retryWithBackoff(
      () => reporterChain.invoke({ findings, score }),
      3,
      2000,
      'Reporter LLM call',
    );

    console.log('[Agent 3] Raw response received, parsing...');
    const report = await safeParseReporterResponse(rawReporterResponse);
    console.log('[Agent 3] Report generated');

    // Combine results
    const riskLevel = getRiskLevel(score.risk_score);

    // Calculate confidence metrics
    finalizeMetrics(metrics);
    const confidenceMetrics = calculateConfidence(metrics, score.risk_score);
    console.log(`[Confidence] Level: ${confidenceMetrics.confidence_level}, Interval: [${confidenceMetrics.confidence_interval.lower}-${confidenceMetrics.confidence_interval.upper}]`);

    return {
      ...report,
      risk_score: score.risk_score,
      risk_level: riskLevel,
      technical_findings: findings.technical_findings,
      validation_summary: validationResult.validation_summary,
      // Phase 5: Confidence metrics
      confidence_interval: {
        lower: confidenceMetrics.confidence_interval.lower,
        upper: confidenceMetrics.confidence_interval.upper,
      },
      confidence_level: confidenceMetrics.confidence_level,
      analysis_quality: {
        modules_analyzed: confidenceMetrics.analysis_quality.modules_analyzed,
        modules_total: confidenceMetrics.analysis_quality.modules_total,
        functions_analyzed: confidenceMetrics.analysis_quality.functions_analyzed,
        functions_total: confidenceMetrics.analysis_quality.functions_total,
        truncation_occurred: confidenceMetrics.analysis_quality.truncation_occurred,
        validation_rate: confidenceMetrics.analysis_quality.validation_rate,
        static_analysis_coverage: confidenceMetrics.analysis_quality.static_analysis_coverage,
      },
      limitations: confidenceMetrics.limitations.map(l => l.description),
    };

  } catch (error) {
    console.error('[LangChain] Error in analysis chain:', error);

    // Log detailed error info for debugging
    if (error && typeof error === 'object') {
      if ('status' in error) console.error('[LangChain] HTTP Status:', (error as any).status);
      if ('code' in error) console.error('[LangChain] Error Code:', (error as any).code);
      if ('message' in error) console.error('[LangChain] Error Message:', (error as any).message);
      if ('error' in error) console.error('[LangChain] Error Details:', (error as any).error);
    }

    // THROW ERROR - don't return fallback card
    throw error;
  }
}

// Fallback handler - simply propagate errors, don't create fake cards
export async function runLangChainAnalysisWithFallback(input: ContractAnalysisInput): Promise<SafetyCard> {
  // Just run the analysis - let errors bubble up
  return await runLangChainAnalysis(input);
}
