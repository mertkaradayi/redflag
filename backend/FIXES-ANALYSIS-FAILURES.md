# Analysis Failure Fixes - Complete Solution

## Problems Identified

### 🔴 Problem 1: LLM Returns Markdown-Wrapped JSON
The model was returning:
```
```json
{
  "technical_findings": []
}
```
```

Instead of raw JSON, breaking the parser.

### 🔴 Problem 2: Failed Analyses Pollute Database
- Failed analyses were saved as "moderate risk" cards
- Showed up as "analyzed" in UI
- Prevented re-analysis (cache blocked)
- Misleading to users

---

## Solutions Implemented

### ✅ Fix 1: Markdown Stripping
**File**: `backend/src/lib/langchain-analyzer.ts`

Added preprocessing to strip markdown code blocks before parsing:

```typescript
function stripMarkdownJson(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*\n?/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*\n?/, '');
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\n?```\s*$/, '');
  }
  return cleaned.trim();
}
```

Applied to all 3 agents (Analyzer, Scorer, Reporter).

### ✅ Fix 2: Analysis Status Tracking
**Files**:
- `backend/src/lib/supabase.ts`
- `backend/migrations/add_analysis_status.sql`

Added two new columns to `contract_analyses` table:
- `analysis_status` (TEXT): 'completed', 'failed', or 'pending'
- `error_message` (TEXT): Error details for failed analyses

### ✅ Fix 3: Stop Saving Fake Cards
**File**: `backend/src/lib/llm-analyzer.ts`

**Before** (BAD):
```typescript
} catch (error) {
  // Return fallback card (WRONG!)
  return {
    summary: "Analysis incomplete...",
    risk_score: 50,  // Fake moderate risk
    risk_level: 'moderate',
    // ...
  };
}
```

**After** (GOOD):
```typescript
} catch (error) {
  // Save as FAILED status
  await saveAnalysisResult(packageId, network, failedCard, 'failed', errorMsg);

  // Re-throw error so caller knows it failed
  throw error;
}
```

### ✅ Fix 4: Filter Failed Analyses from UI
**File**: `backend/src/lib/supabase.ts`

Updated query functions to exclude failed analyses:

```typescript
// getRecentAnalyses - excludes failed by default
if (!includeFailed) {
  query = query.eq('analysis_status', 'completed');
}

// getRiskLevelCounts - only counts completed analyses
query = query.eq('analysis_status', 'completed');
```

### ✅ Fix 5: Graceful Error Handling
**Files**:
- `backend/src/index.ts` (API endpoint)
- `backend/src/workers/sui-monitor.ts` (Background monitor)

API now returns proper error responses:

```typescript
try {
  const result = await runFullAnalysisChain(...);
  return res.status(200).json({ success: true, safetyCard: result });

} catch (analysisError) {
  return res.status(400).json({
    success: false,
    error: errorMsg,
    statusSaved: 'failed'  // Saved in DB as failed
  });
}
```

Background monitor continues processing other contracts even if one fails.

---

## How to Apply Fixes

### Step 1: Run Database Migration

**Option A: Supabase Dashboard** (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy contents of `backend/migrations/add_analysis_status.sql`
4. Run the SQL
5. Verify columns were added

**Option B: Command Line**
```bash
# Using supabase CLI
supabase db reset
# Or run migration directly
psql $DATABASE_URL < backend/migrations/add_analysis_status.sql
```

### Step 2: Restart Backend
```bash
# Stop your dev server (Ctrl+C)
npm run dev
```

### Step 3: Clear Failed Analyses (Optional)
If you have old "moderate risk" failed analyses in your database:

```sql
-- Delete all failed analyses with fake moderate risk scores
DELETE FROM contract_analyses
WHERE risk_score = 50
AND summary LIKE '%Analysis incomplete%';

-- Or mark them as failed
UPDATE contract_analyses
SET analysis_status = 'failed',
    error_message = 'Legacy failed analysis'
WHERE risk_score = 50
AND summary LIKE '%Analysis incomplete%';
```

---

## How It Works Now

### Successful Analysis Flow
```
1. Analyze contract
2. All 3 agents succeed
3. Save with status='completed'
4. Return to user
5. Show in UI ✅
```

### Failed Analysis Flow
```
1. Analyze contract
2. Agent fails (markdown JSON, API error, etc.)
3. Save minimal card with status='failed' + error_message
4. Throw error to caller
5. DON'T show in UI ❌
6. Can retry later (not cached as "analyzed")
```

---

## Testing

### Test Markdown Stripping
This contract was failing with markdown JSON:
```bash
curl -X POST http://localhost:3001/api/llm/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "package_id": "0x690f5b1256bea719bc01800d50609621bd2084d24a720431200c2e98843888eb",
    "network": "testnet",
    "force": true
  }'
```

Should now succeed!

### Test Failed Analysis Handling
```bash
# Analyze a contract that might fail
curl -X POST http://localhost:3001/api/llm/analyze \
  -H "Content-Type": application/json" \
  -d '{
    "package_id": "0x110764d360f55e6e27df1ca3a65b3f78de9493a43a2229549fb6d42c6684039c",
    "network": "mainnet",
    "force": true
  }'
```

If it fails:
- Response status: 400
- Response includes: `statusSaved: 'failed'`
- Database record has `analysis_status = 'failed'`
- NOT shown in deployed contracts page

### Verify Failed Analyses are Excluded
```bash
# Get recent analyses (should exclude failed)
curl http://localhost:3001/api/llm/recent-analyses

# Check database
psql $DATABASE_URL -c "SELECT analysis_status, COUNT(*) FROM contract_analyses GROUP BY analysis_status;"
```

Expected output:
```
 analysis_status | count
-----------------+-------
 completed       |   123
 failed          |     5
```

Only "completed" analyses show in UI!

---

## Benefits

### Before Fixes:
- ❌ Markdown JSON crashes parser
- ❌ Failed analyses saved as "moderate risk"
- ❌ Failed analyses block re-analysis (cached)
- ❌ Failed analyses pollute UI
- ❌ Misleading to users

### After Fixes:
- ✅ Markdown JSON automatically stripped
- ✅ Failed analyses saved as 'failed' status
- ✅ Failed analyses can be retried
- ✅ Failed analyses hidden from UI
- ✅ Clear error messages for debugging
- ✅ Background monitor doesn't crash

---

## Monitoring Failed Analyses

### Query Failed Analyses
```sql
SELECT
  package_id,
  network,
  error_message,
  analyzed_at
FROM contract_analyses
WHERE analysis_status = 'failed'
ORDER BY analyzed_at DESC
LIMIT 10;
```

### Retry Failed Analyses
```typescript
// In your admin panel or script
const failedAnalyses = await getRecentAnalyses({
  includeFailed: true,
  // ... filter to only failed
});

for (const failed of failedAnalyses) {
  // Retry with force=true
  await retryAnalysis(failed.package_id, failed.network);
}
```

---

## Future Enhancements

1. **Retry Logic**: Automatic retry with exponential backoff
2. **Admin Panel**: View and retry failed analyses
3. **Alerts**: Notify when failure rate exceeds threshold
4. **Analytics**: Track failure reasons and patterns

---

## Summary

All issues fixed! The system now:
1. ✅ Handles markdown-wrapped JSON
2. ✅ Saves failed analyses properly
3. ✅ Excludes failed analyses from UI
4. ✅ Allows retry of failed analyses
5. ✅ Provides clear error messages

**No more fake "moderate risk" cards polluting your database!** 🎉
