# Database Backup & Rollback Plan

## Pre-Migration Checklist

- [ ] Backup current database
- [ ] Verify backup is complete
- [ ] Test migration on backup/copy first
- [ ] Document current row counts
- [ ] Save rollback script

---

## Step 1: Backup Existing Database

### Option A: Supabase Dashboard (Recommended - Easiest)

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Go to "Database" → "Backups"
   - Click "Create Backup"
   - Name it: `pre-analysis-status-migration-2025-12-14`
   - Wait for completion

2. **Verify Backup**
   - Check backup appears in list
   - Note the timestamp
   - Download backup file (optional)

### Option B: SQL Export via Dashboard

1. **Go to SQL Editor**
2. **Run this to export `contract_analyses` table:**

```sql
-- Export table structure and data
COPY (
  SELECT * FROM contract_analyses
  ORDER BY analyzed_at DESC
) TO '/tmp/contract_analyses_backup_2025_12_14.csv'
WITH (FORMAT CSV, HEADER TRUE);
```

3. **Or use pg_dump if you have CLI access:**

```bash
# Export entire database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Export only contract_analyses table
pg_dump $DATABASE_URL -t contract_analyses > contract_analyses_backup.sql
```

### Option C: Manual Backup (Safest - Create Copy Table)

Run this in Supabase SQL Editor:

```sql
-- Create backup table with all existing data
CREATE TABLE contract_analyses_backup_20251214 AS
SELECT * FROM contract_analyses;

-- Verify backup
SELECT COUNT(*) as total_rows FROM contract_analyses;
SELECT COUNT(*) as backup_rows FROM contract_analyses_backup_20251214;

-- Should match!
```

---

## Step 2: Document Current State

### Pre-Migration Verification Queries

Run these BEFORE migration and save the results:

```sql
-- 1. Total row count
SELECT COUNT(*) as total_analyses FROM contract_analyses;

-- 2. Count by network
SELECT network, COUNT(*) as count
FROM contract_analyses
GROUP BY network;

-- 3. Count by risk level
SELECT risk_level, COUNT(*) as count
FROM contract_analyses
GROUP BY risk_level
ORDER BY count DESC;

-- 4. Recent analyses (last 10)
SELECT
  package_id,
  network,
  risk_score,
  risk_level,
  analyzed_at
FROM contract_analyses
ORDER BY analyzed_at DESC
LIMIT 10;

-- 5. Check for NULL values
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN summary IS NULL THEN 1 END) as null_summary,
  COUNT(CASE WHEN risk_score IS NULL THEN 1 END) as null_risk_score
FROM contract_analyses;
```

**Save these results!** You'll compare them after migration.

---

## Step 3: Test Migration (On Backup First!)

### Create Test Environment

```sql
-- 1. Create test table (copy of real table)
CREATE TABLE contract_analyses_test AS
SELECT * FROM contract_analyses
LIMIT 100; -- Test with 100 rows first

-- 2. Run migration on TEST table
ALTER TABLE contract_analyses_test
ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'completed';

ALTER TABLE contract_analyses_test
ADD COLUMN IF NOT EXISTS error_message TEXT;

UPDATE contract_analyses_test
SET analysis_status = 'completed'
WHERE analysis_status IS NULL;

-- 3. Verify test results
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN analysis_status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN analysis_status IS NULL THEN 1 END) as null_status
FROM contract_analyses_test;

-- 4. If good, drop test table
DROP TABLE contract_analyses_test;
```

---

## Step 4: Run Migration (With Safety Checks)

```sql
-- TRANSACTION: All or nothing!
BEGIN;

-- 1. Add columns
ALTER TABLE contract_analyses
ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'completed';

ALTER TABLE contract_analyses
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 2. Set existing rows to 'completed'
UPDATE contract_analyses
SET analysis_status = 'completed'
WHERE analysis_status IS NULL;

-- 3. VERIFY before committing
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN analysis_status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN analysis_status IS NULL THEN 1 END) as null_status,
  COUNT(CASE WHEN analysis_status NOT IN ('completed', 'failed', 'pending') THEN 1 END) as invalid_status
FROM contract_analyses;

-- 4. If verification looks good, COMMIT
-- If anything wrong, ROLLBACK
COMMIT; -- or ROLLBACK;
```

### Post-Migration Verification

```sql
-- 1. Check columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'contract_analyses'
AND column_name IN ('analysis_status', 'error_message');

-- 2. Verify all rows have status
SELECT analysis_status, COUNT(*) as count
FROM contract_analyses
GROUP BY analysis_status;

-- Expected: All rows should be 'completed'

-- 3. Compare counts (should match pre-migration)
SELECT COUNT(*) FROM contract_analyses;
```

---

## Step 5: Create Indexes (After Verification)

```sql
-- Only run if migration succeeded
CREATE INDEX IF NOT EXISTS idx_contract_analyses_status
ON contract_analyses(analysis_status);

CREATE INDEX IF NOT EXISTS idx_contract_analyses_completed
ON contract_analyses(analysis_status, analyzed_at DESC)
WHERE analysis_status = 'completed';
```

---

## Rollback Plan

### If Migration Fails or Issues Found

#### Option 1: Rollback via Transaction
If you used `BEGIN/COMMIT` and haven't committed yet:

```sql
ROLLBACK;
```

#### Option 2: Remove Added Columns

```sql
-- Remove the new columns (data preserved)
ALTER TABLE contract_analyses
DROP COLUMN IF EXISTS analysis_status;

ALTER TABLE contract_analyses
DROP COLUMN IF EXISTS error_message;

-- Drop indexes
DROP INDEX IF EXISTS idx_contract_analyses_status;
DROP INDEX IF EXISTS idx_contract_analyses_completed;

-- Verify rollback
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'contract_analyses';
```

#### Option 3: Restore from Backup Table

```sql
-- If you created backup table
BEGIN;

-- 1. Drop current table
DROP TABLE contract_analyses;

-- 2. Rename backup to original
ALTER TABLE contract_analyses_backup_20251214
RENAME TO contract_analyses;

-- 3. Verify
SELECT COUNT(*) FROM contract_analyses;

COMMIT;
```

#### Option 4: Restore from Supabase Backup

1. Go to Supabase Dashboard → Database → Backups
2. Find your pre-migration backup
3. Click "Restore"
4. Confirm restoration

**⚠️ WARNING**: This restores ENTIRE database to backup point, losing any data created after backup!

#### Option 5: Restore from pg_dump file

```bash
# If you have backup SQL file
psql $DATABASE_URL < backup_20251214.sql

# Or restore specific table
psql $DATABASE_URL < contract_analyses_backup.sql
```

---

## Safety Checklist Before Migration

- [ ] **Backup created** (Supabase dashboard or SQL dump)
- [ ] **Backup verified** (can see it in backups list)
- [ ] **Current state documented** (ran verification queries, saved results)
- [ ] **Test migration run** (on test table or copy)
- [ ] **Rollback plan ready** (know how to revert)
- [ ] **Off-peak time** (few users active)
- [ ] **No background jobs running** (stop Sui monitor temporarily)

---

## Migration Execution Plan

### Timeline (Total: ~10-15 minutes)

1. **Pre-Migration** (5 min)
   - [ ] Create backup
   - [ ] Run verification queries
   - [ ] Stop background monitor
   - [ ] Save current row counts

2. **Migration** (2-3 min)
   - [ ] Run migration SQL in transaction
   - [ ] Verify results
   - [ ] Commit if good, rollback if issues

3. **Post-Migration** (3-5 min)
   - [ ] Create indexes
   - [ ] Run verification queries
   - [ ] Compare counts with pre-migration
   - [ ] Restart backend
   - [ ] Test API endpoint

4. **Verification** (5 min)
   - [ ] Analyze one contract (should work)
   - [ ] Check deployed contracts page (should load)
   - [ ] Verify no errors in logs

### Commands to Run in Order

```bash
# 1. Stop backend (to prevent writes during migration)
# Press Ctrl+C in your terminal

# 2. Go to Supabase Dashboard → SQL Editor

# 3. Create backup table
# (Run backup SQL from Option C above)

# 4. Run pre-migration verification queries
# (Save the results)

# 5. Run migration SQL
# (Use the transaction version from Step 4)

# 6. Run post-migration verification
# (Compare with saved pre-migration results)

# 7. Create indexes
# (Run index creation SQL)

# 8. Restart backend
npm run dev

# 9. Test analysis
curl -X POST http://localhost:3001/api/llm/analyze \
  -H "Content-Type: application/json" \
  -d '{"package_id": "0x...", "network": "mainnet"}'
```

---

## What Can Go Wrong & Solutions

### Issue 1: Migration Fails Midway
**Solution**: Use ROLLBACK if in transaction, or restore from backup

### Issue 2: Columns Added but Data Corrupted
**Solution**: Drop columns and restore from backup table

### Issue 3: Indexes Slow Down Queries
**Solution**: Drop problematic index, queries will still work (just slower)

### Issue 4: Application Crashes After Migration
**Solution**:
1. Check if columns exist (verification query)
2. Restart backend
3. If still issues, rollback migration

### Issue 5: Lost Data During Restore
**Solution**: This is why we have MULTIPLE backups!
- Supabase auto-backup (point-in-time restore)
- Manual backup table
- SQL dump file

---

## Testing After Migration

### Test 1: Existing Analyses Still Work
```sql
SELECT * FROM contract_analyses
WHERE analysis_status = 'completed'
LIMIT 10;
```
Should return data!

### Test 2: New Analyses Work
```bash
# Analyze a contract
curl -X POST http://localhost:3001/api/llm/analyze \
  -H "Content-Type: application/json" \
  -d '{"package_id": "0xTEST...", "network": "testnet", "force": true}'
```

### Test 3: Failed Analyses Handled Correctly
Look for the contract that was failing:
```
0x690f5b1256bea719bc01800d50609621bd2084d24a720431200c2e98843888eb
```

Should either:
- Succeed (markdown stripped worked!)
- Fail gracefully (saved as status='failed', not shown in UI)

### Test 4: UI Still Loads
```bash
curl http://localhost:3001/api/llm/recent-analyses
```
Should return only completed analyses!

---

## Recovery Time Objective (RTO)

- **Rollback via Transaction**: < 1 minute
- **Rollback via Column Drop**: < 2 minutes
- **Restore from Backup Table**: < 5 minutes
- **Restore from Supabase Backup**: 5-15 minutes
- **Restore from SQL Dump**: 10-30 minutes (depends on size)

**You have multiple safety nets!** 🛡️

---

## Final Pre-Flight Checklist

Before running migration, confirm:

- [ ] I have created a backup (Supabase + backup table)
- [ ] I have saved pre-migration verification results
- [ ] I understand how to rollback
- [ ] Backend is stopped (no writes during migration)
- [ ] I'm ready to test after migration
- [ ] I have 15-30 minutes of uninterrupted time

**Ready to proceed?** Follow the "Migration Execution Plan" above step by step! 🚀
