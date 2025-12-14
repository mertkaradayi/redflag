-- Migration: Add analysis_status and error_message columns
-- Purpose: Track failed analyses separately from successful ones
-- Date: 2025-12-14

-- Add analysis_status column (completed, failed, pending)
ALTER TABLE contract_analyses
ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'completed';

-- Add error_message column to store failure reasons
ALTER TABLE contract_analyses
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Update existing rows to 'completed' status
UPDATE contract_analyses
SET analysis_status = 'completed'
WHERE analysis_status IS NULL;

-- Add index for faster filtering by status
CREATE INDEX IF NOT EXISTS idx_contract_analyses_status
ON contract_analyses(analysis_status);

-- Add index for completed analyses queries
CREATE INDEX IF NOT EXISTS idx_contract_analyses_completed
ON contract_analyses(analysis_status, analyzed_at DESC)
WHERE analysis_status = 'completed';

-- Comments
COMMENT ON COLUMN contract_analyses.analysis_status IS 'Status of the analysis: completed, failed, or pending';
COMMENT ON COLUMN contract_analyses.error_message IS 'Error message if analysis failed';

-- Verification query
-- Run this after migration to verify
SELECT
  analysis_status,
  COUNT(*) as count,
  COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as with_errors
FROM contract_analyses
GROUP BY analysis_status
ORDER BY count DESC;
