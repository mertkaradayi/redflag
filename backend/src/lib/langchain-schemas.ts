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
  summary: z.string(),
  risky_functions: z.array(z.object({
    function_name: z.string(),
    reason: z.string(),
  })),
  rug_pull_indicators: z.array(z.object({
    pattern_name: z.string(),
    evidence: z.string(),
  })),
  impact_on_user: z.string(),
  why_risky_one_liner: z.string(),
});

export const reporterParser = StructuredOutputParser.fromZodSchema(reporterResponseSchema);

// Export types
export type AnalyzerResponse = z.infer<typeof analyzerResponseSchema>;
export type ScorerResponse = z.infer<typeof scorerResponseSchema>;
export type ReporterResponse = z.infer<typeof reporterResponseSchema>;
