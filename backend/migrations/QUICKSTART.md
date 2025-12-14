# Migration Quick Start Guide

## 🚀 Run Migration in 5 Steps (10 minutes)

### Prerequisites
- [ ] Stop your backend (`Ctrl+C` in terminal)
- [ ] Open Supabase Dashboard → SQL Editor
- [ ] Have these files ready to copy-paste

---

## Step 1: Create Backup (2 min)

1. Open `01_backup.sql`
2. Copy entire contents
3. Paste into Supabase SQL Editor
4. Click "Run"
5. **SAVE THE RESULTS** - write down the row counts

Expected output:
```
table_name       | row_count
-----------------+-----------
Original Table   | 123
Backup Table     | 123
```

✅ **If counts match, proceed to Step 2**
❌ **If counts don't match or error, DON'T proceed - ask for help**

---

## Step 2: Run Migration (3 min)

1. Open `02_migration.sql`
2. Copy entire contents
3. Paste into Supabase SQL Editor
4. Click "Run"
5. **READ THE VERIFICATION RESULTS**

Expected output:
```
total_rows | completed_count | null_status_count | has_error_count
-----------+-----------------+-------------------+----------------
123        | 123             | 0                 | 0
```

### ✅ If Verification Passed:
- All counts look correct
- Run this command: `COMMIT;`

### ❌ If Something Wrong:
- Counts don't match
- Errors appeared
- Run this command: `ROLLBACK;`
- Then run `99_rollback.sql`

---

## Step 3: Create Indexes (1 min)

**ONLY if Step 2 succeeded!**

1. Open `03_create_indexes.sql`
2. Copy entire contents
3. Paste into Supabase SQL Editor
4. Click "Run"

Expected output:
```
✅ Migration complete! Indexes created and documented.
```

---

## Step 4: Restart Backend (1 min)

```bash
# In your terminal
npm run dev
```

Watch for any errors in startup logs.

---

## Step 5: Test Everything (3 min)

### Test 1: API Health Check
```bash
curl http://localhost:3001/health
```

Expected: `{"status": "healthy"}`

### Test 2: Get Recent Analyses
```bash
curl http://localhost:3001/api/llm/recent-analyses
```

Expected: JSON response with analyses (should work same as before)

### Test 3: Analyze a Contract
```bash
curl -X POST http://localhost:3001/api/llm/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "package_id": "0x690f5b1256bea719bc01800d50609621bd2084d24a720431200c2e98843888eb",
    "network": "testnet",
    "force": true
  }'
```

Expected: Either success OR failure with proper error (not fake moderate risk)

### Test 4: Check Database
```sql
-- In Supabase SQL Editor
SELECT analysis_status, COUNT(*) as count
FROM contract_analyses
GROUP BY analysis_status;
```

Expected:
```
analysis_status | count
----------------+-------
completed       | 123    (your original count)
```

---

## ✅ Success Checklist

After all steps, verify:

- [ ] Backup table exists (`contract_analyses_backup_20251214`)
- [ ] Original table has new columns (`analysis_status`, `error_message`)
- [ ] All existing rows have `analysis_status = 'completed'`
- [ ] Indexes created (2 indexes)
- [ ] Backend starts without errors
- [ ] API endpoints work
- [ ] Can analyze contracts

**If all checked ✅ - Migration successful!** 🎉

---

## ❌ If Something Went Wrong

### During Migration (Step 2)
1. Run `ROLLBACK;` immediately
2. Run `99_rollback.sql` to clean up
3. Backend should work as before
4. Ask for help before retrying

### After Migration (Steps 3-5)
1. Open `99_rollback.sql`
2. Follow instructions for full rollback
3. Or restore from backup table:

```sql
BEGIN;
DROP TABLE contract_analyses CASCADE;
ALTER TABLE contract_analyses_backup_20251214 RENAME TO contract_analyses;
COMMIT;
```

---

## Backup Locations

You now have **3 backups**:

1. **Backup Table**: `contract_analyses_backup_20251214` (in same database)
2. **Supabase Auto-Backup**: Dashboard → Database → Backups
3. **Local Backup** (if you ran pg_dump): Backup file on your machine

**Keep the backup table for at least 7 days** before deleting!

---

## File Reference

```
migrations/
├── QUICKSTART.md              ← You are here
├── BACKUP-AND-ROLLBACK.md     ← Detailed guide
├── 01_backup.sql              ← Step 1: Create backup
├── 02_migration.sql           ← Step 2: Run migration
├── 03_create_indexes.sql      ← Step 3: Create indexes
├── 99_rollback.sql            ← Emergency rollback
└── add_analysis_status.sql    ← Original migration (don't use, use 02 instead)
```

---

## Time Estimates

- **Total Time**: 10 minutes
- **Backup**: 2 min
- **Migration**: 3 min
- **Indexes**: 1 min
- **Restart & Test**: 4 min

---

## Need Help?

### Error: "column already exists"
- You may have run migration before
- Check: `SELECT * FROM contract_analyses LIMIT 1;`
- If you see `analysis_status` column, migration already done!

### Error: "backup table already exists"
- Delete old backup: `DROP TABLE contract_analyses_backup_20251214;`
- Re-run Step 1

### Error: "relation does not exist"
- Wrong database selected
- Check you're connected to correct Supabase project

### Database seems corrupted
- **DON'T PANIC**
- Run full restore: `99_rollback.sql` → Option 2
- Or restore from Supabase Dashboard → Backups

---

## Ready? Let's Go! 🚀

1. **Stop backend**
2. **Open Supabase Dashboard**
3. **Run Step 1** (backup)
4. **Run Step 2** (migration)
5. **Run Step 3** (indexes)
6. **Restart backend**
7. **Test everything**

**You got this!** 💪
