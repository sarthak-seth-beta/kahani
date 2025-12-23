# Batch Processing & Concurrency Tuning Guide

## Current Setup

- **Batch Limit**: 30 messages per scheduler run
- **Parallel Processing**: 5 concurrent messages
- **Scheduler Interval**: Every 5 minutes

## Understanding the Parameters

### Batch Limit

**What it does:** Maximum number of messages processed per scheduler run

**Current:** `limit = 30`

**Code:**

```typescript
const trials = await storage.getScheduledQuestionsDue(30);
```

### Parallel Processing Limit

**What it does:** Maximum number of messages processed simultaneously

**Current:** `pLimit(5)` = 5 concurrent

**Code:**

```typescript
const limit = pLimit(5); // Max 5 concurrent messages
```

## Performance with Different Message Volumes

### Scenario 1: 0 Messages (No Backlog)

**What happens:**

```typescript
const trials = await storage.getScheduledQuestionsDue(30); // Returns []
// trials.length = 0
// No processing, exits immediately
```

**Performance:**

- Query time: ~50-100ms (just checks, no results)
- Processing time: 0ms
- Total: ~100ms
- Resource usage: Minimal

**Verdict:** ✅ Efficient - No waste

---

### Scenario 2: 1-5 Messages (Small Volume)

**What happens:**

```typescript
const trials = await storage.getScheduledQuestionsDue(30); // Returns 1-5 items
// All messages processed in parallel (since ≤ 5)
```

**Performance breakdown:**

| Messages | Concurrent Used | Batches | Time  | Efficiency |
| -------- | --------------- | ------- | ----- | ---------- |
| 1        | 1               | 1       | ~2.5s | ✅ Good    |
| 2        | 2               | 1       | ~2.5s | ✅ Good    |
| 3        | 3               | 1       | ~2.5s | ✅ Good    |
| 4        | 4               | 1       | ~2.5s | ✅ Good    |
| 5        | 5               | 1       | ~2.5s | ✅ Good    |

**Key points:**

- ✅ All messages process in parallel (within the 5 limit)
- ✅ Single batch: ~2.5 seconds total
- ✅ No wasted capacity (all 5 concurrent slots used if 5 messages)
- ✅ Batch limit of 30 doesn't matter (only 1-5 messages)

**Verdict:** ✅ Efficient - All messages process in parallel

---

### Scenario 3: 10-30 Messages (Medium Volume)

**What happens:**

```typescript
const trials = await storage.getScheduledQuestionsDue(30); // Returns 10-30 items
// Processed in batches of 5
```

**Performance:**

- 10 messages: 10 ÷ 5 = 2 batches = ~5 seconds
- 20 messages: 20 ÷ 5 = 4 batches = ~10 seconds
- 30 messages: 30 ÷ 5 = 6 batches = ~15 seconds

**Verdict:** ✅ Efficient - Handles medium volumes well

---

### Scenario 4: 50+ Messages (Large Volume)

**What happens:**

```typescript
// Run 1: Gets first 30 messages
const trials = await storage.getScheduledQuestionsDue(30); // Returns 30 items
// Run 2: Gets next 20 messages
const trials = await storage.getScheduledQuestionsDue(30); // Returns 20 items
```

**Performance:**

- **Run 1 (11:50):** Process 30 messages
  - 30 ÷ 5 = 6 batches
  - 6 batches × 2.5s = ~15 seconds ✅
- **Run 2 (11:55):** Process remaining 20 messages
  - 20 ÷ 5 = 4 batches
  - 4 batches × 2.5s = ~10 seconds ✅

**Total time:** ~25 seconds across 2 runs

**Verdict:** ✅ Efficient - Processes in multiple runs

---

## Tuning Scenarios

### Scenario A: Increase Batch Limit (30 → 50)

```typescript
const trials = await storage.getScheduledQuestionsDue(50); // Increased
const limit = pLimit(5); // Same
```

**Impact:**

- ✅ Processes more messages per run
- ✅ Fewer scheduler runs needed
- ⚠️ Longer processing time per run
- ⚠️ More memory usage

**50 messages, 5 concurrent:**

- 50 ÷ 5 = 10 batches
- 10 batches × 2.5s = ~25 seconds per run

**Pros:**

- Handles larger backlogs faster
- Fewer runs needed

**Cons:**

- Takes longer per run (25s vs 15s)
- If scheduler runs every 5 min, might overlap
- More memory (50 objects in memory)

**Best for:** Large backlogs, less frequent spikes

---

### Scenario B: Decrease Batch Limit (30 → 20)

```typescript
const trials = await storage.getScheduledQuestionsDue(20); // Decreased
const limit = pLimit(5); // Same
```

**Impact:**

- ✅ Faster per run
- ✅ Less memory
- ⚠️ More runs needed for large backlogs

**20 messages, 5 concurrent:**

- 20 ÷ 5 = 4 batches
- 4 batches × 2.5s = ~10 seconds per run

**Pros:**

- Very fast per run (10s)
- Low memory usage
- Less likely to overlap with next run

**Cons:**

- More runs needed for 50 messages (3 runs vs 2)
- More scheduler overhead

**Best for:** Consistent small volumes, faster processing

---

### Scenario C: Increase Parallel Processing (5 → 10)

```typescript
const trials = await storage.getScheduledQuestionsDue(30); // Same
const limit = pLimit(10); // Increased
```

**Impact:**

- ✅ Much faster processing
- ⚠️ More WhatsApp API calls simultaneously
- ⚠️ Higher risk of rate limiting
- ⚠️ More database connections

**30 messages, 10 concurrent:**

- 30 ÷ 10 = 3 batches
- 3 batches × 2.5s = ~7.5 seconds per run

**Pros:**

- Very fast (7.5s vs 15s)
- Handles spikes better

**Cons:**

- **Rate limiting risk** - WhatsApp has limits
- More database connections (10 vs 5)
- Higher memory/CPU usage
- More error handling complexity

**WhatsApp Rate Limits:**

- Typically: 1000 messages/second (varies by tier)
- But: 10 concurrent might trigger throttling
- Error code 131051 = Rate limit exceeded

**Best for:** High volume, if you can handle rate limits

---

### Scenario D: Decrease Parallel Processing (5 → 3)

```typescript
const trials = await storage.getScheduledQuestionsDue(30); // Same
const limit = pLimit(3); // Decreased
```

**Impact:**

- ✅ Safer (less rate limiting risk)
- ✅ Lower resource usage
- ⚠️ Slower processing

**30 messages, 3 concurrent:**

- 30 ÷ 3 = 10 batches
- 10 batches × 2.5s = ~25 seconds per run

**Pros:**

- Very safe (low rate limit risk)
- Low resource usage
- Good for free tier

**Cons:**

- Slower (25s vs 15s)
- Might overlap with next run if > 30 messages

**Best for:** Conservative approach, free tier, avoiding rate limits

---

### Scenario E: Increase Both (30→50, 5→10)

```typescript
const trials = await storage.getScheduledQuestionsDue(50);
const limit = pLimit(10);
```

**Impact:**

- ✅ Very fast processing
- ✅ Handles large backlogs
- ⚠️ High resource usage
- ⚠️ High rate limiting risk

**50 messages, 10 concurrent:**

- 50 ÷ 10 = 5 batches
- 5 batches × 2.5s = ~12.5 seconds per run

**Pros:**

- Fastest option
- Handles 50 messages in one run

**Cons:**

- High risk of rate limiting
- High resource usage
- More complex error handling

**Best for:** High volume, paid tier, robust error handling

---

### Scenario F: Decrease Both (30→20, 5→3)

```typescript
const trials = await storage.getScheduledQuestionsDue(20);
const limit = pLimit(3);
```

**Impact:**

- ✅ Very safe
- ✅ Low resource usage
- ⚠️ Slower processing
- ⚠️ More runs needed

**20 messages, 3 concurrent:**

- 20 ÷ 3 = ~7 batches
- 7 batches × 2.5s = ~17.5 seconds per run

**Pros:**

- Safest option
- Lowest resource usage
- Good for free tier

**Cons:**

- Slower
- 50 messages = 3 runs (vs 2 runs with 30/5)

**Best for:** Free tier, conservative, avoiding any issues

---

## Performance Comparison Table

| Batch  | Concurrent | 0 msgs     | 1-5 msgs  | 30 msgs  | 50 msgs  | Rate Limit Risk | Resource Usage |
| ------ | ---------- | ---------- | --------- | -------- | -------- | --------------- | -------------- |
| 20     | 3          | ~100ms     | ~2.5s     | ~25s     | ~42s     | Very Low        | Very Low       |
| 30     | 3          | ~100ms     | ~2.5s     | ~25s     | ~42s     | Very Low        | Low            |
| **30** | **5**      | **~100ms** | **~2.5s** | **~15s** | **~25s** | **Low**         | **Medium**     |
| 30     | 10         | ~100ms     | ~2.5s     | ~7.5s    | ~12.5s   | Medium          | High           |
| 50     | 5          | ~100ms     | ~2.5s     | ~25s     | ~25s     | Low             | Medium         |
| 50     | 10         | ~100ms     | ~2.5s     | ~12.5s   | ~12.5s   | High            | High           |

---

## Recommendations by Use Case

### Free Tier / Conservative (Recommended Starting Point) ⭐

```typescript
const trials = await storage.getScheduledQuestionsDue(30);
const limit = pLimit(5);
```

**Why:**

- ✅ Handles 0-5 messages efficiently (~2.5s)
- ✅ Handles 50 messages in 2 runs (~25s total)
- ✅ Low rate limit risk
- ✅ Safe resource usage
- ✅ Fast enough (15s per run for 30 messages)

**Performance:**

- 0 messages: ~100ms
- 1-5 messages: ~2.5s (all parallel)
- 30 messages: ~15s
- 50 messages: ~25s across 2 runs

---

### Moderate Volume

```typescript
const trials = await storage.getScheduledQuestionsDue(40);
const limit = pLimit(7);
```

**Why:**

- ✅ Better throughput
- ⚠️ Monitor for rate limits

**Performance:**

- 40 messages: ~14s
- 50 messages: ~18s

---

### High Volume / Paid Tier

```typescript
const trials = await storage.getScheduledQuestionsDue(50);
const limit = pLimit(10);
```

**Why:**

- ✅ Maximum throughput
- ⚠️ Requires robust error handling
- ⚠️ Monitor rate limits closely

**Performance:**

- 50 messages: ~12.5s (single run)

---

### Very Conservative / Testing

```typescript
const trials = await storage.getScheduledQuestionsDue(20);
const limit = pLimit(3);
```

**Why:**

- ✅ Safest option
- ✅ Good for testing
- ⚠️ Slower processing

**Performance:**

- 20 messages: ~17.5s
- 50 messages: ~42s across 3 runs

---

## Key Considerations

### 1. WhatsApp Rate Limits

- **Free tier:** Lower limits
- **Paid tier:** Higher limits (1000 msg/sec)
- **Error 131051:** Rate limit exceeded
- **Solution:** Your code already has retry logic with backoff

**Recommendation:** Start with 5 concurrent, increase gradually if no rate limit errors

---

### 2. Database Connections

- Each concurrent message = 1 DB connection
- Supabase free tier: Limited connections
- **Recommendation:** Keep concurrent ≤ 10

**Connection usage:**

- 5 concurrent = 5 connections (safe)
- 10 concurrent = 10 connections (monitor)
- 20 concurrent = 20 connections (risky for free tier)

---

### 3. Memory Usage

- Batch limit = messages in memory
- Higher batch = more memory
- **Recommendation:** 20-50 is fine for most cases

**Memory usage:**

- 30 messages: ~30 objects (minimal)
- 50 messages: ~50 objects (still fine)
- 100 messages: ~100 objects (monitor)

---

### 4. Scheduler Overlap

- If processing takes > 5 minutes, next run is skipped
- **Current (30/5):** ~15s = Safe ✅
- **High (50/10):** ~12.5s = Safe ✅
- **Very High (100/20):** Might overlap ⚠️

**Rule of thumb:** Keep processing time < 1 minute per run

---

### 5. Error Handling

- More concurrent = more potential errors
- Your retry logic handles this
- **Recommendation:** Monitor error rates

---

## Dynamic Tuning Strategy (Optional)

You could make it adaptive based on backlog size:

```typescript
// Count messages without limit first
const dueCount = await db
  .select({ count: sql<number>`count(*)` })
  .from(freeTrials)
  .where(
    and(
      eq(freeTrials.conversationState, "in_progress"),
      isNotNull(freeTrials.nextQuestionScheduledFor),
      lte(freeTrials.nextQuestionScheduledFor, new Date()),
    ),
  );

let batchLimit = 30;
let concurrentLimit = 5;

if (dueCount > 100) {
  batchLimit = 50;
  concurrentLimit = 10;
} else if (dueCount > 50) {
  batchLimit = 40;
  concurrentLimit = 7;
} else if (dueCount < 10) {
  batchLimit = 20;
  concurrentLimit = 3;
}

// Use dynamic limits
const trials = await storage.getScheduledQuestionsDue(batchLimit);
const limit = pLimit(concurrentLimit);
```

**Pros:**

- ✅ Adapts to workload
- ✅ Optimizes for different scenarios

**Cons:**

- ⚠️ More complex
- ⚠️ Extra query to count

**Recommendation:** Start with fixed limits, add dynamic tuning if needed

---

## Monitoring & Optimization

### What to Monitor

1. **Processing Time**
   - Should be < 1 minute per run
   - If > 5 minutes, reduce batch/concurrent
   - Log: `console.log('Processing took:', duration, 'ms')`

2. **Rate Limit Errors**
   - Check logs for error 131051
   - If frequent, reduce concurrent
   - Log: `console.error('Rate limit error:', error)`

3. **Backlog Size**
   - If growing, increase batch limit
   - If shrinking, decrease (save resources)
   - Log: `console.log('Messages due:', count)`

4. **Memory Usage**
   - Monitor on Render dashboard
   - If high, reduce batch limit
   - Watch for memory leaks

5. **Database Connections**
   - Monitor Supabase dashboard
   - If maxing out, reduce concurrent
   - Free tier: ~60 connections max

---

## Optimization Tips

1. **Start conservative:** 30 batch, 5 concurrent
2. **Monitor for 1 week** - Check logs, metrics
3. **Gradually increase** if no issues
4. **Watch for rate limits** - Back off if seen
5. **Adjust based on patterns** - Spikes vs steady

---

## Real-World Scenarios

### Typical Day (0-5 messages per run)

- Most runs: 0-2 messages
- Occasional: 3-5 messages
- Rare: 10+ messages

**With 30/5:**

- 0-2 messages: ~2.5s ✅
- 3-5 messages: ~2.5s (all parallel) ✅
- 10+ messages: Multiple batches, still fast ✅

**Efficiency:** 95%+ of runs process in < 3 seconds

---

### Spike Day (50+ messages)

- Multiple runs needed
- 30/5 handles efficiently
- Processes in 2-3 runs

**With 30/5:**

- Run 1: 30 messages in ~15s ✅
- Run 2: 20 messages in ~10s ✅
- Total: ~25s across 2 runs ✅

---

## Summary Table: 30/5 Configuration

| Messages | Time   | Batches | Efficiency | Notes                         |
| -------- | ------ | ------- | ---------- | ----------------------------- |
| 0        | ~100ms | 0       | ✅ Perfect | Query only, no processing     |
| 1        | ~2.5s  | 1       | ✅ Perfect | Single message                |
| 2        | ~2.5s  | 1       | ✅ Perfect | Both parallel                 |
| 3        | ~2.5s  | 1       | ✅ Perfect | All parallel                  |
| 4        | ~2.5s  | 1       | ✅ Perfect | All parallel                  |
| 5        | ~2.5s  | 1       | ✅ Perfect | All parallel, max concurrency |
| 10       | ~5s    | 2       | ✅ Good    | 2 batches                     |
| 20       | ~10s   | 4       | ✅ Good    | 4 batches                     |
| 30       | ~15s   | 6       | ✅ Good    | 6 batches, max batch          |
| 50       | ~25s   | 10      | ✅ Good    | 2 runs (30 + 20)              |

---

## Final Recommendation

**For your current use case (5-min scheduler, moderate volume):**

```typescript
// Optimal starting point
const trials = await storage.getScheduledQuestionsDue(30);
const limit = pLimit(5);
```

**Why:**

- ✅ Handles 0-5 messages efficiently (~2.5s)
- ✅ Handles 50 messages in 2 runs (~25s total)
- ✅ Low rate limit risk
- ✅ Safe resource usage
- ✅ Fast enough (15s per run for 30 messages)

**Adjust if:**

- **Frequent backlogs > 50:** Increase batch to 40-50
- **Rate limit errors:** Decrease concurrent to 3-4
- **Very small volumes:** Decrease batch to 20 (optional)
- **Need faster processing:** Increase concurrent to 7-10 (monitor closely)

---

## Implementation Example

```typescript
// server/storage.ts
async getScheduledQuestionsDue(limit: number = 30): Promise<FreeTrialRow[]> {
  const now = new Date();
  const trials = await db
    .select()
    .from(freeTrials)
    .where(
      and(
        eq(freeTrials.conversationState, "in_progress"),
        isNotNull(freeTrials.nextQuestionScheduledFor),
        lte(freeTrials.nextQuestionScheduledFor, now),
      ),
    )
    .limit(limit); // Process max 30 per run
  return trials;
}

// server/scheduler.ts
import pLimit from 'p-limit';

const limit = pLimit(5); // Max 5 concurrent messages

export async function sendScheduledQuestions(): Promise<void> {
  const trials = await storage.getScheduledQuestionsDue(30); // Max 30 per run

  console.log(`Found ${trials.length} trials with questions due`);

  // Process in parallel with concurrency limit
  await Promise.all(
    trials.map(trial =>
      limit(async () => {
        // Your existing message sending logic
        // ...
      })
    )
  );
}
```

---

## Conclusion

**30/5 is optimal for:**

- ✅ Small volumes (0-5 messages): Fast and efficient
- ✅ Medium volumes (10-30 messages): Handles efficiently
- ✅ Large volumes (50+ messages): Processes in multiple runs
- ✅ All scenarios: Balanced performance and safety

**No changes needed for typical use cases!**
