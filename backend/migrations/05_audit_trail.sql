-- ============================================
-- STEP 5: ANALYSIS AUDIT TRAIL
-- Creates table for tracking analysis metadata
-- Run via Supabase SQL Editor
-- ============================================

-- Start transaction (all or nothing!)
BEGIN;

-- Show current state before migration
SELECT 'BEFORE MIGRATION - Creating analysis_audit_logs table' as status;

-- Create analysis_audit_logs table
CREATE TABLE IF NOT EXISTS analysis_audit_logs (
  id SERIAL PRIMARY KEY,
  package_id TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'testnet',

  -- Timing
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_duration_ms INTEGER,

  -- LLM metrics
  total_tokens INTEGER DEFAULT 0,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  llm_calls INTEGER DEFAULT 0,

  -- Analysis coverage
  modules_analyzed INTEGER DEFAULT 0,
  modules_total INTEGER DEFAULT 0,
  functions_analyzed INTEGER DEFAULT 0,
  functions_total INTEGER DEFAULT 0,
  truncation_occurred BOOLEAN DEFAULT FALSE,

  -- Findings counts
  static_findings_count INTEGER DEFAULT 0,
  llm_findings_count INTEGER DEFAULT 0,
  validated_findings_count INTEGER DEFAULT 0,
  cross_module_risks_count INTEGER DEFAULT 0,

  -- Risk summary
  final_risk_score INTEGER,
  final_risk_level TEXT,

  -- Errors and warnings
  errors JSONB DEFAULT '[]'::jsonb,
  warnings JSONB DEFAULT '[]'::jsonb,

  -- Analysis configuration
  model_used TEXT,
  analysis_version TEXT DEFAULT 'v1',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_package_network
ON analysis_audit_logs(package_id, network);

CREATE INDEX IF NOT EXISTS idx_audit_logs_analyzed_at
ON analysis_audit_logs(analyzed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level
ON analysis_audit_logs(final_risk_level);

CREATE INDEX IF NOT EXISTS idx_audit_logs_errors
ON analysis_audit_logs USING gin(errors);

-- Enable RLS
ALTER TABLE analysis_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for transparency)
CREATE POLICY "Allow public read access to analysis_audit_logs"
ON analysis_audit_logs
FOR SELECT
TO public
USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access to analysis_audit_logs"
ON analysis_audit_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- VERIFICATION
SELECT 'AFTER MIGRATION' as status;

SELECT COUNT(*) as audit_logs_count FROM analysis_audit_logs;

SELECT
  'Migration successful' as result,
  'Run COMMIT; to save changes' as next_step,
  'Run ROLLBACK; to undo' as alternative;

-- ============================================
-- DECISION POINT:
-- If verification looks good → Run: COMMIT;
-- If anything wrong → Run: ROLLBACK;
-- ============================================
