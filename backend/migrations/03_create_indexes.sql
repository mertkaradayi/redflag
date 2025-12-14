-- ============================================
-- STEP 3: CREATE INDEXES (After Migration Success)
-- Run this ONLY if migration (Step 2) succeeded
-- ============================================

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_contract_analyses_status
ON contract_analyses(analysis_status);

-- Create index for completed analyses queries (most common)
CREATE INDEX IF NOT EXISTS idx_contract_analyses_completed
ON contract_analyses(analysis_status, analyzed_at DESC)
WHERE analysis_status = 'completed';

-- Verify indexes were created
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'contract_analyses'
AND indexname LIKE 'idx_contract_analyses_%';

-- ✅ You should see 2 new indexes in the results

-- Add column comments for documentation
COMMENT ON COLUMN contract_analyses.analysis_status IS 'Status of analysis: completed, failed, or pending';
COMMENT ON COLUMN contract_analyses.error_message IS 'Error message if analysis failed';

SELECT '✅ Migration complete! Indexes created and documented.' as status;
