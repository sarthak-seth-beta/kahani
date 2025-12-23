# Free Trials Table Index Analysis

## Current Indexes

1. ✅ `id` - Primary key (automatically indexed)
2. ✅ `conversation_state` - Indexed (`free_trials_conversation_state_idx`)
3. ✅ `retry_readiness_at` - Indexed (`free_trials_retry_readiness_at_idx`)
4. ✅ `next_question_scheduled_for` - Indexed (`free_trials_next_question_scheduled_idx`)

## Query Patterns Analysis

### Single Column Queries (Missing Indexes)

#### 1. `customer_phone`

- **Usage**: `getFreeTrialByBuyerPhone()` - WHERE clause
- **Frequency**: High (user lookups)
- **Recommendation**: ⚠️ **SHOULD BE INDEXED**
- **Query**: `WHERE customer_phone = ? ORDER BY created_at LIMIT 1`

#### 2. `storyteller_phone`

- **Usage**:
  - `getFreeTrialByStorytellerPhone()` - WHERE clause
  - `getActiveTrialByStorytellerPhone()` - WHERE + conversation_state
  - `getAllActiveTrialsByStorytellerPhone()` - WHERE + conversation_state
- **Frequency**: Very High (core lookup pattern)
- **Recommendation**: ⚠️ **SHOULD BE INDEXED**
- **Queries**:
  - `WHERE storyteller_phone = ?`
  - `WHERE storyteller_phone = ? AND conversation_state IN (...) ORDER BY created_at`

#### 3. `created_at`

- **Usage**:
  - ORDER BY in multiple queries
  - WHERE clause for date filtering in analytics (`routes.ts`)
- **Frequency**: High
- **Recommendation**: ⚠️ **SHOULD BE INDEXED**
- **Queries**:
  - `ORDER BY created_at ASC`
  - `WHERE created_at BETWEEN ? AND ? GROUP BY DATE(created_at)`

#### 4. `last_question_sent_at`

- **Usage**: `getPendingReminders()` - WHERE clause with conversation_state
- **Frequency**: Medium (scheduled job)
- **Recommendation**: ⚠️ **CONSIDER INDEXING** (especially composite)
- **Query**: `WHERE conversation_state = 'in_progress' AND last_question_sent_at <= ?`

### Composite Query Patterns

#### 1. `(storyteller_phone, conversation_state)`

- **Usage**: Active trial lookups
- **Frequency**: Very High
- **Recommendation**: ⚠️ **SHOULD CREATE COMPOSITE INDEX**
- **Benefit**: Optimizes queries that filter by both columns

#### 2. `(conversation_state, last_question_sent_at)`

- **Usage**: Pending reminders query
- **Frequency**: Medium (scheduled job)
- **Recommendation**: ⚠️ **CONSIDER COMPOSITE INDEX**
- **Benefit**: Optimizes reminder queries

## Recommended Indexes

### High Priority (Add Immediately)

1. **`customer_phone`** - Single column index
   - Used for buyer lookups
   - Query: `getFreeTrialByBuyerPhone()`

2. **`storyteller_phone`** - Single column index
   - Used for storyteller lookups
   - Queries: `getFreeTrialByStorytellerPhone()`, `getActiveTrialByStorytellerPhone()`, `getAllActiveTrialsByStorytellerPhone()`

3. **`created_at`** - Single column index
   - Used for ordering and date filtering
   - Queries: Multiple ORDER BY, analytics date filtering

4. **`(storyteller_phone, conversation_state)`** - Composite index
   - Optimizes active trial lookups
   - Queries: `getActiveTrialByStorytellerPhone()`, `getAllActiveTrialsByStorytellerPhone()`

### Medium Priority (Consider Adding)

5. **`(conversation_state, last_question_sent_at)`** - Composite index
   - Optimizes pending reminders query
   - Query: `getPendingReminders()`

## Index Creation Order

1. `customer_phone` (high impact, simple)
2. `storyteller_phone` (high impact, simple)
3. `created_at` (high impact, simple)
4. `(storyteller_phone, conversation_state)` (high impact, composite)
5. `(conversation_state, last_question_sent_at)` (medium impact, composite)

## Notes

- Single column indexes on `customer_phone` and `storyteller_phone` will help even when used in composite queries
- The composite index on `(storyteller_phone, conversation_state)` can also be used for queries that only filter by `storyteller_phone` (left-prefix rule)
- Consider partial indexes if certain states are queried more frequently
- Monitor query performance after adding indexes to validate improvements
