import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";

// Agent 1: Analyzer Schema
export const analyzerFindingSchema = z.object({
  function_name: z.string(),
  technical_reason: z.string(),
  matched_pattern_id: z.string(),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']),
  contextual_notes: z.array(z.string()).optional(),
  evidence_code_snippet: z.string().optional(),
});

export const analyzerResponseSchema = z.object({
  technical_findings: z.array(analyzerFindingSchema),
});

export const analyzerParser = StructuredOutputParser.fromZodSchema(analyzerResponseSchema);

// Agent 2: Scorer Schema
export const scorerResponseSchema = z.object({
  risk_score: z.number().min(0).max(100),
  justification: z.string(),
  confidence: z.enum(['High', 'Medium', 'Low']),
});

export const scorerParser = StructuredOutputParser.fromZodSchema(scorerResponseSchema);

// Agent 3: Reporter Schema
export const reporterResponseSchema = z.object({
  summary: z.string().describe("A clear summary of the contract's purpose and overall risk assessment"),
  risky_functions: z.array(z.object({
    function_name: z.string().describe("Name of the risky function"),
    reason: z.string().describe("Plain-language explanation of why this function is risky"),
  })),
  rug_pull_indicators: z.array(z.object({
    pattern_name: z.string().describe("A short, human-readable title describing the risk (e.g., 'Unrestricted Fund Withdrawal', 'Missing Access Control', 'No Event Logging'). Do NOT use pattern IDs like 'HIGH-01' or 'SUI-CRITICAL-01'."),
    evidence: z.string().describe("Plain-language explanation with code evidence"),
  })),
  impact_on_user: z.string().describe("How this contract could affect users who interact with it"),
  why_risky_one_liner: z.string().describe("One sentence summary of the main risk"),
});

export const reporterParser = StructuredOutputParser.fromZodSchema(reporterResponseSchema);

// Export types
export type AnalyzerResponse = z.infer<typeof analyzerResponseSchema>;
export type ScorerResponse = z.infer<typeof scorerResponseSchema>;
export type ReporterResponse = z.infer<typeof reporterResponseSchema>;
export type AnalyzerFinding = z.infer<typeof analyzerFindingSchema>;
