/**
 * Audit Trail - Tracks analysis metadata for debugging, improvement, and cost monitoring
 *
 * Usage:
 *   const audit = new AuditTrailCollector(packageId, network);
 *   audit.startTimer();
 *   // ... run analysis ...
 *   audit.recordModuleStats(analyzed, total);
 *   audit.recordStaticFindings(count);
 *   audit.recordLLMCall(tokens);
 *   audit.addWarning('stage', 'message');
 *   audit.stopTimer();
 *   await audit.save();
 */

import { saveAuditLog, type AuditLogEntry } from './supabase';

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface AuditWarning {
  stage: string;
  message: string;
  timestamp: string;
}

export interface AuditError {
  stage: string;
  message: string;
  timestamp: string;
}

export class AuditTrailCollector {
  private packageId: string;
  private network: string;
  private startTime: number = 0;
  private endTime: number = 0;

  // Timing
  private totalDurationMs: number = 0;

  // LLM metrics
  private totalTokens: number = 0;
  private promptTokens: number = 0;
  private completionTokens: number = 0;
  private llmCalls: number = 0;

  // Analysis coverage
  private modulesAnalyzed: number = 0;
  private modulesTotal: number = 0;
  private functionsAnalyzed: number = 0;
  private functionsTotal: number = 0;
  private truncationOccurred: boolean = false;

  // Findings
  private staticFindingsCount: number = 0;
  private llmFindingsCount: number = 0;
  private validatedFindingsCount: number = 0;
  private crossModuleRisksCount: number = 0;

  // Risk summary
  private finalRiskScore: number | undefined;
  private finalRiskLevel: string | undefined;

  // Errors and warnings
  private errors: AuditError[] = [];
  private warnings: AuditWarning[] = [];

  // Config
  private modelUsed: string = '';
  private analysisVersion: string = 'v1';

  constructor(packageId: string, network: string) {
    this.packageId = packageId;
    this.network = network;
  }

  /**
   * Start the analysis timer
   */
  startTimer(): void {
    this.startTime = Date.now();
  }

  /**
   * Stop the analysis timer
   */
  stopTimer(): void {
    this.endTime = Date.now();
    this.totalDurationMs = this.endTime - this.startTime;
  }

  /**
   * Record module analysis stats
   */
  recordModuleStats(analyzed: number, total: number): void {
    this.modulesAnalyzed = analyzed;
    this.modulesTotal = total;
  }

  /**
   * Record function analysis stats
   */
  recordFunctionStats(analyzed: number, total: number): void {
    this.functionsAnalyzed = analyzed;
    this.functionsTotal = total;
  }

  /**
   * Record that truncation occurred
   */
  recordTruncation(): void {
    this.truncationOccurred = true;
  }

  /**
   * Record static analysis findings count
   */
  recordStaticFindings(count: number): void {
    this.staticFindingsCount = count;
  }

  /**
   * Record LLM findings count
   */
  recordLLMFindings(count: number): void {
    this.llmFindingsCount = count;
  }

  /**
   * Record validated findings count
   */
  recordValidatedFindings(count: number): void {
    this.validatedFindingsCount = count;
  }

  /**
   * Record cross-module risks count
   */
  recordCrossModuleRisks(count: number): void {
    this.crossModuleRisksCount = count;
  }

  /**
   * Record an LLM call with token usage
   */
  recordLLMCall(usage?: TokenUsage): void {
    this.llmCalls++;
    if (usage) {
      this.promptTokens += usage.prompt_tokens || 0;
      this.completionTokens += usage.completion_tokens || 0;
      this.totalTokens += usage.total_tokens || 0;
    }
  }

  /**
   * Record the model used for analysis
   */
  recordModel(model: string): void {
    this.modelUsed = model;
  }

  /**
   * Record final risk score and level
   */
  recordRiskResult(score: number, level: string): void {
    this.finalRiskScore = score;
    this.finalRiskLevel = level;
  }

  /**
   * Add a warning
   */
  addWarning(stage: string, message: string): void {
    this.warnings.push({
      stage,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Add an error
   */
  addError(stage: string, message: string): void {
    this.errors.push({
      stage,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Set the analysis version
   */
  setVersion(version: string): void {
    this.analysisVersion = version;
  }

  /**
   * Get duration so far (for logging during analysis)
   */
  getElapsedMs(): number {
    if (this.endTime > 0) {
      return this.totalDurationMs;
    }
    return Date.now() - this.startTime;
  }

  /**
   * Get current token count (for logging during analysis)
   */
  getTotalTokens(): number {
    return this.totalTokens;
  }

  /**
   * Get the collected audit entry (without saving)
   */
  toEntry(): AuditLogEntry {
    return {
      package_id: this.packageId,
      network: this.network,
      analyzed_at: new Date().toISOString(),
      total_duration_ms: this.totalDurationMs || this.getElapsedMs(),
      total_tokens: this.totalTokens,
      prompt_tokens: this.promptTokens,
      completion_tokens: this.completionTokens,
      llm_calls: this.llmCalls,
      modules_analyzed: this.modulesAnalyzed,
      modules_total: this.modulesTotal,
      functions_analyzed: this.functionsAnalyzed,
      functions_total: this.functionsTotal,
      truncation_occurred: this.truncationOccurred,
      static_findings_count: this.staticFindingsCount,
      llm_findings_count: this.llmFindingsCount,
      validated_findings_count: this.validatedFindingsCount,
      cross_module_risks_count: this.crossModuleRisksCount,
      final_risk_score: this.finalRiskScore,
      final_risk_level: this.finalRiskLevel,
      errors: this.errors,
      warnings: this.warnings,
      model_used: this.modelUsed,
      analysis_version: this.analysisVersion,
    };
  }

  /**
   * Save the audit log to the database
   */
  async save(): Promise<{ success: boolean; id?: number; error?: string }> {
    // Ensure timer is stopped
    if (this.totalDurationMs === 0 && this.startTime > 0) {
      this.stopTimer();
    }

    const entry = this.toEntry();
    const result = await saveAuditLog(entry);

    if (result.success) {
      console.log(`[AUDIT] Saved audit log for ${this.packageId} (ID: ${result.id}, Duration: ${this.totalDurationMs}ms, Tokens: ${this.totalTokens})`);
    } else {
      console.error(`[AUDIT] Failed to save audit log: ${result.error}`);
    }

    return result;
  }

  /**
   * Create a summary string for logging
   */
  getSummary(): string {
    return [
      `Duration: ${this.totalDurationMs}ms`,
      `LLM Calls: ${this.llmCalls}`,
      `Tokens: ${this.totalTokens}`,
      `Modules: ${this.modulesAnalyzed}/${this.modulesTotal}`,
      `Findings: ${this.staticFindingsCount} static, ${this.llmFindingsCount} LLM, ${this.validatedFindingsCount} validated`,
      `Risk: ${this.finalRiskScore} (${this.finalRiskLevel})`,
      this.errors.length > 0 ? `Errors: ${this.errors.length}` : '',
      this.warnings.length > 0 ? `Warnings: ${this.warnings.length}` : '',
    ]
      .filter(Boolean)
      .join(' | ');
  }
}

/**
 * Helper to extract token usage from LangChain response metadata
 */
export function extractTokenUsage(response: any): TokenUsage | undefined {
  // Try to extract from response_metadata (LangChain format)
  if (response?.response_metadata?.usage) {
    const usage = response.response_metadata.usage;
    return {
      prompt_tokens: usage.prompt_tokens || 0,
      completion_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
    };
  }

  // Try to extract from usage_metadata (alternative format)
  if (response?.usage_metadata) {
    return {
      prompt_tokens: response.usage_metadata.input_tokens || 0,
      completion_tokens: response.usage_metadata.output_tokens || 0,
      total_tokens: response.usage_metadata.total_tokens || 0,
    };
  }

  return undefined;
}
