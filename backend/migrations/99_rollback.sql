-- ============================================
-- ROLLBACK SCRIPT
-- Use this if migration failed or you need to revert changes
-- ============================================

-- WARNING: This will remove the migration changes
-- Make sure you want to do this!

BEGIN;

SELECT 'Starting rollback...' as status;

-- Option 1: Remove columns (keeps existing data, just removes new columns)
-- Use this if migration completed but you want to revert
ALTER TABLE contract_analyses
DROP COLUMN IF EXISTS analysis_status CASCADE;

ALTER TABLE contract_analyses
DROP COLUMN IF EXISTS error_message CASCADE;

-- Remove indexes
DROP INDEX IF EXISTS idx_contract_analyses_status;
DROP INDEX IF EXISTS idx_contract_analyses_completed;

-- Verify rollback
SELECT
  COUNT(*) as total_rows,
  COUNT(column_name) as has_analysis_status
FROM contract_analyses
LEFT JOIN information_schema.columns ON column_name = 'analysis_status'
  AND table_name = 'contract_analyses';

-- Expected: total_rows > 0, has_analysis_status = 0

SELECT 'Rollback verification complete' as status;
SELECT 'If counts look correct, run COMMIT; to finalize rollback' as instruction;
SELECT 'Original data is preserved, only new columns removed' as note;

-- COMMIT;  -- Uncomment to finalize rollback

-- ============================================
-- Option 2: FULL RESTORE FROM BACKUP TABLE
-- Use this if data was corrupted during migration
-- ============================================

-- Uncomment below to restore from backup table:

-- BEGIN;

-- -- Drop current table
-- DROP TABLE IF EXISTS contract_analyses CASCADE;

-- -- Rename backup to original
-- ALTER TABLE contract_analyses_backup_20251214
-- RENAME TO contract_analyses;

-- -- Verify restoration
-- SELECT COUNT(*) as restored_rows FROM contract_analyses;

-- -- COMMIT;  -- Uncomment to finalize restore
