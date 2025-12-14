-- ============================================
-- STEP 2: RUN MIGRATION (With Transaction Safety)
-- Run this AFTER creating backup
-- ============================================

-- Start transaction (all or nothing!)
BEGIN;

-- Show current state before migration
SELECT 'BEFORE MIGRATION' as status;
SELECT COUNT(*) as total_rows FROM contract_analyses;

-- Add new columns
ALTER TABLE contract_analyses
ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'completed';

ALTER TABLE contract_analyses
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Set all existing rows to 'completed' status
UPDATE contract_analyses
SET analysis_status = 'completed'
WHERE analysis_status IS NULL;

-- VERIFICATION: Check if migration worked correctly
SELECT 'AFTER MIGRATION' as status;

SELECT
  COUNT(*) as total_rows,
  COUNT(CASE WHEN analysis_status = 'completed' THEN 1 END) as completed_count,
  COUNT(CASE WHEN analysis_status IS NULL THEN 1 END) as null_status_count,
  COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as has_error_count
FROM contract_analyses;

-- Expected results:
-- total_rows: Should match pre-migration count
-- completed_count: Should equal total_rows
-- null_status_count: Should be 0
-- has_error_count: Should be 0 (no errors yet)

SELECT
  'Verification Query' as info,
  'Check the results above. If they look correct, run COMMIT; below' as instruction,
  'If something looks wrong, run ROLLBACK; instead' as warning;

-- ============================================
-- DECISION POINT:
-- If verification looks good → Run: COMMIT;
-- If anything wrong → Run: ROLLBACK;
-- ============================================

-- Uncomment ONE of these lines:
-- COMMIT;    -- ✅ Use this if verification passed
-- ROLLBACK;  -- ❌ Use this if something wrong
