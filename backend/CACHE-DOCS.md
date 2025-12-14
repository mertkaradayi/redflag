# Cache Control Documentation

## Overview

The analysis system uses intelligent caching to save costs and improve response times:

- **Default**: Results are cached for 24 hours
- **Force Refresh**: Bypass cache with `force: true` parameter
- **Auto-Refresh**: Stale results (>24h old) are automatically re-analyzed

## Using the API

### Normal Analysis (Uses Cache)

```bash
curl -X POST http://localhost:3001/api/llm/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "package_id": "0x1234...",
    "network": "mainnet"
  }'
```

**Response** (if cached):
```json
{
  "success": true,
  "message": "Analysis successful (from cache - mainnet)",
  "cached": true,
  "analyzedAt": "2025-12-13T20:00:00.000Z",
  "safetyCard": { ... }
}
```

### Force Fresh Analysis

```bash
curl -X POST http://localhost:3001/api/llm/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "package_id": "0x1234...",
    "network": "mainnet",
    "force": true
  }'
```

**Response** (fresh analysis):
```json
{
  "success": true,
  "message": "Analysis successful (mainnet)",
  "cached": false,
  "safetyCard": { ... }
}
```

## Frontend Integration

### React/TypeScript Example

```typescript
async function analyzeContract(packageId: string, forceRefresh = false) {
  const response = await fetch('http://localhost:3001/api/llm/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      package_id: packageId,
      network: 'mainnet',
      force: forceRefresh  // Set to true to bypass cache
    })
  });

  const data = await response.json();

  if (data.cached) {
    console.log(`Using cached result from ${data.analyzedAt}`);
  } else {
    console.log('Fresh analysis completed');
  }

  return data.safetyCard;
}

// Use cached result (default)
const result1 = await analyzeContract('0x1234...');

// Force fresh analysis
const result2 = await analyzeContract('0x1234...', true);
```

### Add Refresh Button to UI

```typescript
function AnalysisCard({ packageId }: { packageId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleRefresh = async () => {
    setLoading(true);
    const freshResult = await analyzeContract(packageId, true);  // force=true
    setResult(freshResult);
    setLoading(false);
  };

  return (
    <div>
      <button onClick={handleRefresh} disabled={loading}>
        {loading ? 'Refreshing...' : '🔄 Refresh Analysis'}
      </button>
      {/* Display result */}
    </div>
  );
}
```

## Cache Behavior

| Scenario | Behavior | Cost |
|----------|----------|------|
| First analysis | Runs fresh analysis, saves to cache | ~$0.00013 |
| Re-analysis within 24h | Returns cached result instantly | $0 |
| Re-analysis after 24h | Runs fresh analysis automatically | ~$0.00013 |
| Force refresh anytime | Runs fresh analysis, updates cache | ~$0.00013 |

## Configuration

### Change Cache TTL

Edit `backend/src/index.ts` line 473:

```typescript
// Change 24 to desired hours
const dbResult = await getAnalysisResult(package_id, validatedNetwork, 24);
```

### Disable Cache Completely

Set `force: true` by default in your frontend, or remove the cache check entirely.

## Testing

### Test Cached Response

```bash
# Analyze contract twice
curl -X POST http://localhost:3001/api/llm/analyze \
  -H "Content-Type: application/json" \
  -d '{"package_id": "0x1234...", "network": "mainnet"}'

# Second call should return cached result instantly
curl -X POST http://localhost:3001/api/llm/analyze \
  -H "Content-Type: application/json" \
  -d '{"package_id": "0x1234...", "network": "mainnet"}'
```

### Test Force Refresh

```bash
curl -X POST http://localhost:3001/api/llm/analyze \
  -H "Content-Type: application/json" \
  -d '{"package_id": "0x1234...", "network": "mainnet", "force": true}'
```

## Monitoring

Check backend logs for cache behavior:

```
[LLM] Database hit! Returning stored result for 0x1234...
[LLM] Force parameter set - bypassing cache for 0x1234...
[LLM] Cached result is stale (>24h old) - running fresh analysis
```
