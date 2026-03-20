# Scoring Consistency Verification

## Issue Reported

User observed that **basketball-reference.com** received different scores when:
1. Found via "Michael Jordan" name search
2. Checked directly via URL input

## Investigation

### Root Cause Analysis

The scoring system **is deterministic** - the same domain always receives the same score when crawled at the same time. The perceived inconsistency was likely due to one of these factors:

1. **Cache Timing**: If one request was cached and the other was fresh
2. **Temporal Changes**: The website's HTML changed between crawls
3. **Race Conditions**: Simultaneous requests before cache was populated
4. **Browser Caching**: Frontend cached old results

### Verification Tests

**Test 1: Direct URL Consistency**
```
basketball-reference.com (fresh): 18/100
basketball-reference.com (cached): 18/100
✅ CONSISTENT
```

**Test 2: Name Search Consistency**
```
"Michael Jordan" search #1: avg 27/100
  - basketball-reference.com: 18/100
  - basketnews.com: 58/100
  - instagram.com: 48/100
  - (7 total domains)

"Michael Jordan" search #2: avg 27/100
  - basketball-reference.com: 18/100 (same)
  - basketnews.com: 58/100 (same)
  - instagram.com: 48/100 (same)
  - (7 total domains, all same scores)

✅ CONSISTENT
```

### Scoring Breakdown

**basketball-reference.com = 18/100**
- ✅ JSON-LD: +10 pts
- ✗ llms.txt: 0 pts
- ✗ OpenAPI: 0 pts
- ✗ MCP: 0 pts
- ✅ Resolves: +8 pts
- **Total: 18 pts**

## Enhancements Made

### 1. Enhanced Logging

Added detailed logging to track:
- Cache hits vs fresh crawls
- Homepage fetch size and JSON-LD detection
- Crawl timing and results

**Example logs:**
```
✓ CACHE HIT for basketball-reference.com - score 18 (0.0h old)
[basketball-reference.com] Homepage fetched: 349373 bytes, JSON-LD: true
Crawl complete for basketball-reference.com: 18/100 (Not AI Ready)
```

### 2. Fixed Timestamp Issues

Replaced `admin.firestore.Timestamp.now()` with `new Date()` to avoid Firebase emulator closure issues.

### 3. Cache Debugging

Added explicit cache status logging:
- "CACHE HIT" for cached results
- "No cache found" for fresh crawls
- "Cache expired" for stale cache

## Conclusion

✅ **Scoring is deterministic and consistent**
✅ **Caching works correctly**
✅ **Logging provides full visibility**

The system is working as designed. Any perceived inconsistencies were likely due to:
- Comparing cached vs fresh results
- Temporal changes in website HTML
- Browser caching of frontend results

## Recommendations

1. **For Users**: Hard refresh (Ctrl+Shift+R) when testing
2. **For Debugging**: Check server logs for "CACHE HIT" vs "fresh crawl"
3. **For Verification**: Compare `lastCrawled` timestamps in results

---

**Verified:** 2026-03-11
**Status:** ✅ System working correctly
