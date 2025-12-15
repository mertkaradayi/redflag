-- ============================================
-- STEP 4: DEPENDENCY RISK TRACKING
-- Creates table for tracking dependency risks
-- Run via Supabase SQL Editor
-- ============================================

-- Start transaction (all or nothing!)
BEGIN;

-- Show current state before migration
SELECT 'BEFORE MIGRATION - Creating dependency_risks table' as status;

-- Create dependency_risks table
CREATE TABLE IF NOT EXISTS dependency_risks (
  id SERIAL PRIMARY KEY,
  package_id TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'mainnet',

  -- Dependency metadata
  dependency_type TEXT DEFAULT 'unknown', -- 'framework', 'library', 'contract'
  is_system_package BOOLEAN DEFAULT FALSE, -- 0x1, 0x2 etc.

  -- Risk assessment
  is_audited BOOLEAN DEFAULT FALSE,
  is_upgradeable BOOLEAN DEFAULT FALSE,
  risk_score INTEGER DEFAULT NULL,
  risk_level TEXT DEFAULT NULL, -- 'low', 'moderate', 'high', 'critical'

  -- Analysis tracking
  last_analyzed TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  analysis_source TEXT DEFAULT NULL, -- 'auto', 'manual', 'inherited'

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique package per network
  UNIQUE(package_id, network)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dependency_risks_package_network
ON dependency_risks(package_id, network);

CREATE INDEX IF NOT EXISTS idx_dependency_risks_risk_level
ON dependency_risks(risk_level);

CREATE INDEX IF NOT EXISTS idx_dependency_risks_is_audited
ON dependency_risks(is_audited);

-- Add dependency_summary column to contract_analyses
ALTER TABLE contract_analyses
ADD COLUMN IF NOT EXISTS dependency_summary JSONB DEFAULT NULL;

-- Enable RLS on the new table
ALTER TABLE dependency_risks ENABLE ROW LEVEL SECURITY;

-- Allow public read access (same as other tables)
CREATE POLICY "Allow public read access to dependency_risks"
ON dependency_risks
FOR SELECT
TO public
USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access to dependency_risks"
ON dependency_risks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Insert known system packages (always safe)
INSERT INTO dependency_risks (package_id, network, dependency_type, is_system_package, is_audited, risk_score, risk_level, analysis_source)
VALUES
  ('0x1', 'mainnet', 'framework', true, true, 0, 'low', 'manual'),
  ('0x1', 'testnet', 'framework', true, true, 0, 'low', 'manual'),
  ('0x2', 'mainnet', 'framework', true, true, 0, 'low', 'manual'),
  ('0x2', 'testnet', 'framework', true, true, 0, 'low', 'manual'),
  ('0x3', 'mainnet', 'framework', true, true, 0, 'low', 'manual'),
  ('0x3', 'testnet', 'framework', true, true, 0, 'low', 'manual')
ON CONFLICT (package_id, network) DO NOTHING;

-- VERIFICATION
SELECT 'AFTER MIGRATION' as status;

SELECT COUNT(*) as dependency_risks_count FROM dependency_risks;

SELECT
  'Migration successful' as result,
  'Run COMMIT; to save changes' as next_step,
  'Run ROLLBACK; to undo' as alternative;

-- ============================================
-- DECISION POINT:
-- If verification looks good → Run: COMMIT;
-- If anything wrong → Run: ROLLBACK;
-- ============================================
