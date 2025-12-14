-- ============================================
-- STEP 1: CREATE BACKUP
-- Run this FIRST before any migration
-- ============================================

-- Create backup table with all current data
CREATE TABLE contract_analyses_backup_20251214 AS
SELECT * FROM contract_analyses;

-- Verify backup was created successfully
SELECT
  'Original Table' as table_name,
  COUNT(*) as row_count
FROM contract_analyses
UNION ALL
SELECT
  'Backup Table' as table_name,
  COUNT(*) as row_count
FROM contract_analyses_backup_20251214;

-- ✅ If both counts match, backup is successful!
-- Save these numbers before proceeding to migration.

-- Additional verification: Check sample data
SELECT
  package_id,
  network,
  risk_score,
  risk_level,
  analyzed_at
FROM contract_analyses_backup_20251214
ORDER BY analyzed_at DESC
LIMIT 5;

-- ✅ If you can see data, backup is good!
