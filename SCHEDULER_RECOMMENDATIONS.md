# Scheduler Architecture Recommendations

## Current Issues

- Using `setInterval` which runs in-process
- No persistence if server crashes
- Scheduler runs every 5 minutes (current setup)
- Tasks can overlap if processing takes too long
- Sequential processing of 50+ messages can take 2+ minutes
- No ordering by scheduled time (11:48 messages should go before 11:50 messages)

## Recommended Solutions

### Option 0: Supabase Queues + pg_cron - **BEST FOR SUPABASE USERS** ⭐⭐⭐

**Best for:** Already using Supabase, want to avoid external dependencies

**Pros:**

- ✅ **No external services** - Everything runs in your Supabase database
- ✅ **Native integration** - Uses `pgmq` extension (PostgreSQL Message Queue)
- ✅ **Guaranteed delivery** - Exactly-once message delivery
- ✅ **Built-in monitoring** - Manage queues in Supabase dashboard
- ✅ **No deployment complexity** - No Redis to manage
- ✅ **Cost effective** - Included with Supabase (no additional service)
- ✅ **Database-native** - Leverages PostgreSQL reliability

**Cons:**

- ❌ Requires Supabase (you already have this ✅)
- ❌ Less flexible than Redis for very high throughput
- ❌ Queue operations count against database connections

**Deployment:**

Since you're already using Supabase, this requires **zero additional infrastructure**:

- Enable `pgmq` extension in Supabase dashboard
- **Queue storage runs on Supabase's infrastructure** (in PostgreSQL tables)
- **Queue processing can run on Render** (your Node.js app reads from queue)
- Use `pg_cron` OR your existing scheduler to process queue every 5 minutes

**Important:** The queue **storage** is on Supabase, but the **worker/processor** runs wherever your Node.js app runs (Render, in your case).

**Installation:**

```bash
# No additional npm packages needed!
# Just enable extensions in Supabase
```

**Implementation:**

```sql
-- 1. Enable pgmq extension in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS pgmq;

-- 2. Create a queue
SELECT pgmq.create('whatsapp-messages');

-- 3. Schedule cron job to process queue (runs every 5 minutes)
SELECT cron.schedule(
  'process-scheduled-questions',
  '*/5 * * * *', -- Every 5 minutes
  $$
  -- This will call your Edge Function or HTTP endpoint
  SELECT net.http_post(
    url := 'https://your-app.com/api/cron/process-scheduled',
    headers := '{"Authorization": "Bearer ' || current_setting('app.cron_secret') || '"}'
  ) AS request_id;
  $$
);
```

**In your Node.js code (runs on Render):**

```typescript
// server/scheduler.ts
import { db } from "./db";
import { sql } from "drizzle-orm";

// Send message to queue (queue storage is on Supabase)
export async function scheduleQuestion(trialId: string, scheduledTime: Date) {
  // Store in DB (source of truth)
  await storage.updateFreeTrialDb(trialId, {
    nextQuestionScheduledFor: scheduledTime,
  });

  // Add to Supabase queue (stored in Supabase's PostgreSQL)
  await db.execute(sql`
    SELECT pgmq.send(
      'whatsapp-messages',
      jsonb_build_object(
        'trialId', ${trialId},
        'type', 'question',
        'scheduledFor', ${scheduledTime.toISOString()}
      )
    );
  `);
}

// Process queue (runs on Render, reads from Supabase queue)
export async function processQueue() {
  // Read messages from queue (stored on Supabase infrastructure)
  const messages = await db.execute(sql`
    SELECT * FROM pgmq.read('whatsapp-messages', 20, 30);
    -- Read up to 20 messages, wait 30 seconds for visibility timeout
  `);

  for (const msg of messages) {
    try {
      // Process message (WhatsApp API calls happen from Render)
      await sendScheduledQuestion(msg.trialId);

      // Delete message after successful processing
      await db.execute(sql`
        SELECT pgmq.delete('whatsapp-messages', ${msg.msg_id});
      `);
    } catch (error) {
      // Message will become visible again after timeout
      console.error("Failed to process message:", error);
    }
  }
}

// Your existing scheduler (runs on Render every 5 minutes)
export function startScheduler(): NodeJS.Timeout {
  const intervalId = setInterval(
    () => {
      processQueue().catch(console.error); // Reads from Supabase queue
    },
    5 * 60 * 1000, // Every 5 minutes
  );
  return intervalId;
}
```

**Architecture:**

- **Queue Storage**: Supabase PostgreSQL (on Supabase infrastructure) ✅
- **Queue Processing**: Your Node.js app on Render (reads from Supabase) ✅
- **WhatsApp API Calls**: Made from Render (your app) ✅

---

### Option 1: Queue System (Bull/BullMQ) - **REQUIRES REDIS** ⚠️

**Best for:** Production, reliability, scalability

**Pros:**

- ✅ Persistent jobs (survives server restarts)
- ✅ Built-in retry logic
- ✅ Job prioritization
- ✅ Rate limiting support
- ✅ Can scale workers separately
- ✅ Job status tracking

**Cons:**

- ❌ **Requires Redis** - Additional infrastructure to deploy and manage
- ❌ More complex setup
- ❌ Additional cost (Redis hosting)
- ❌ Deployment complexity (need Redis URL, connection management)

**Deployment Options for Redis:**

1. **Supabase Redis (if available)** - Managed Redis through Supabase
2. **Upstash Redis** - Serverless Redis, good for serverless deployments
3. **Railway/Render Redis** - Managed Redis addon
4. **Self-hosted** - Your own Redis instance (not recommended for production)
5. **Redis Cloud** - Managed Redis service

**Deployment Complexity:**

- Need to provision Redis instance
- Configure Redis URL environment variable
- Handle Redis connection failures
- Monitor Redis health
- Additional cost (~$10-50/month depending on usage)

**Installation:**

```bash
npm install bullmq ioredis
npm install --save-dev @types/ioredis
```

**Implementation:**

```typescript
// server/queue.ts
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";

const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

export const messageQueue = new Queue("whatsapp-messages", { connection });

export const messageWorker = new Worker(
  "whatsapp-messages",
  async (job) => {
    const { trialId, messageType, ...data } = job.data;

    if (messageType === "question") {
      await sendScheduledQuestion(trialId);
    } else if (messageType === "reminder") {
      await sendReminder(trialId);
    }
  },
  { connection },
);

// When scheduling a message:
await messageQueue.add(
  "send-question",
  { trialId, messageType: "question" },
  { delay: 2000 }, // 2 seconds delay
);
```

---

### Option 2: Job Scheduler (node-cron) - **SIMPLE**

**Best for:** Development, simple use cases

**Pros:**

- ✅ Simple to implement
- ✅ No external dependencies
- ✅ Good for fixed schedules

**Cons:**

- ❌ Still in-process (lost on restart)
- ❌ Not ideal for dynamic scheduling
- ❌ No built-in retry logic

**Installation:**

```bash
npm install node-cron
npm install --save-dev @types/node-cron
```

**Implementation:**

```typescript
// server/scheduler.ts
import cron from "node-cron";

// Run every 10 seconds
cron.schedule("*/10 * * * * *", async () => {
  await processScheduledTasks();
});
```

---

### Option 2: Database-Only Approach (Current + Improvements) - **SIMPLE** ⭐

**Keep using database queries, but improve the implementation**

Since you already store `nextQuestionScheduledFor` in the database and scheduler runs every 5 minutes:

1. **Keep database as source of truth** ✅ (you already do this)
2. **Add ordering** - Process messages in scheduled time order
3. **Add batch limiting** - Process max 20-30 messages per run
4. **Add parallel processing** - Process multiple messages concurrently

**Implementation:**

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
    .orderBy(asc(freeTrials.nextQuestionScheduledFor)) // Process oldest first
    .limit(limit); // Process max 30 per run
  return trials;
}

// server/scheduler.ts
import pLimit from 'p-limit';

const limit = pLimit(5); // Max 5 concurrent messages

export async function sendScheduledQuestions(): Promise<void> {
  const trials = await storage.getScheduledQuestionsDue(30); // Max 30 per run

  // Process in parallel with concurrency limit
  await Promise.all(
    trials.map(trial =>
      limit(async () => {
        // ... existing message sending logic
      })
    )
  );
}
```

**Pros:**

- ✅ No additional infrastructure
- ✅ Simple to implement
- ✅ Works with current 5-minute scheduler

**Cons:**

- ❌ Still in-process (lost on restart)
- ❌ Limited scalability
- ❌ No built-in retry logic

---

### Option 4: External Cron (Production)

**Best for:** Production environments (Render, Vercel, etc.)

**Implementation:**

1. Create an endpoint: `POST /api/cron/process-scheduled`
2. Use external cron service to call it:
   - Render Cron Jobs
   - Vercel Cron
   - GitHub Actions
   - AWS EventBridge

```typescript
// server/routes.ts
app.post("/api/cron/process-scheduled", async (req, res) => {
  // Verify cron secret
  if (req.headers["authorization"] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  await processScheduledTasks();
  res.json({ success: true });
});
```

---

## My Recommendation

**For your use case (Scheduler runs every 5 minutes, order doesn't matter):**

### **Use Option 2: Database-Only with Improvements** ⭐⭐⭐ (Simplest)

**Why this is best for you:**

1. ✅ **Order doesn't matter** - You said 11:51 before 11:47 is fine
2. ✅ **Simple** - Just improve your current code
3. ✅ **No new infrastructure** - Works with what you have
4. ✅ **Solves the bottleneck** - Batch limiting + parallel processing
5. ✅ **Quick to implement** - Minimal changes needed

**Migration Path:**

1. Add batch limiting to `getScheduledQuestionsDue()` (max 20-30 per run)
2. Add parallel processing with `p-limit` (5-10 concurrent)
3. Keep your existing scheduler (runs every 5 minutes)
4. That's it! ✅

**When to use Supabase Queues instead:**

Only if you later need:

- Multiple workers (prevent duplicate processing)
- Guaranteed retry logic
- Exactly-once delivery guarantees

But for now, **Option 2 is perfect for your needs!**

**When to use BullMQ/Redis:**

Only if you need:

- Very high throughput (1000+ messages/minute)
- Complex job prioritization
- Separate worker processes
- Advanced rate limiting

For your use case (5-minute intervals, moderate volume), Supabase Queues is the perfect fit.

---

## Quick Fixes for Current Implementation

Even if you don't switch to queues, you should **immediately** fix:

1. **Add ordering** - Process messages by scheduled time
2. **Add batch limiting** - Process max 20-30 per run
3. **Add parallel processing** - Use `p-limit` for concurrency

This will prevent the 50-message bottleneck issue you identified.

---

## Deployment Comparison

### Supabase Queues (Recommended)

**How it works:**

- **Queue storage**: Runs on Supabase's PostgreSQL infrastructure ✅
- **Queue processing**: Runs in your Node.js app (on Render) ✅
- **Works on Render Free**: Yes! ✅ Your app just reads from Supabase queue

**Deployment Steps:**

1. Enable `pgmq` extension in Supabase SQL Editor (one-time)
2. No additional environment variables needed
3. No additional services to provision
4. Your existing Render app processes the queue (reads from Supabase)
5. Works on Render Free tier ✅

**Cost:** $0 (included with Supabase, no additional Render costs)

**Complexity:** ⭐ Low

**Render Free Tier Compatibility:**

- ✅ **Works perfectly** - Your app on Render reads from Supabase queue
- ✅ No Redis needed
- ✅ No additional infrastructure
- ✅ Queue survives Render app restarts (stored in Supabase)

---

### BullMQ + Redis

**Deployment Steps:**

1. Provision Redis instance (Upstash, Railway, Redis Cloud, etc.)
2. Get Redis connection URL
3. Add `REDIS_URL` environment variable
4. Install `bullmq` and `ioredis` packages
5. Configure connection in code
6. Monitor Redis health

**Cost:** ~$10-50/month (depending on provider and usage)

**Complexity:** ⭐⭐⭐ Medium-High

**Platform-Specific Notes:**

- **Replit**: Can use Upstash Redis (serverless) or Railway Redis addon
- **Render**: Has Redis addon available
- **Vercel**: Use Upstash Redis (serverless, good for serverless functions)
- **Railway**: Has Redis addon available

---

## Summary

| Feature                   | Supabase Queues            | BullMQ + Redis        | Database-Only (Improved) |
| ------------------------- | -------------------------- | --------------------- | ------------------------ |
| **Infrastructure**        | None (uses Supabase)       | Redis required        | None                     |
| **Deployment Complexity** | Low                        | Medium-High           | Low                      |
| **Cost**                  | $0                         | $10-50/month          | $0                       |
| **Scalability**           | Good (up to ~1000 msg/min) | Excellent (unlimited) | Limited                  |
| **Reliability**           | High (DB-backed)           | High (Redis-backed)   | Medium (in-process)      |
| **Monitoring**            | Supabase dashboard         | Redis dashboard       | Logs only                |
| **Best For**              | Your use case ✅           | High throughput       | Simple cases             |

**Recommendation:** Start with **Supabase Queues** - it's perfect for your 5-minute scheduler and requires zero additional infrastructure.
