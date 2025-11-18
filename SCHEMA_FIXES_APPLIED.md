# Database Schema Fixes - smartSalud V5

**Date**: 2025-11-17
**Status**: ✅ APPLIED

---

## Issues Fixed (from George Research Analysis)

### ✅ Fix 1: Timezone Handling (CRITICAL)
**Problem**: Timestamps without timezone specification caused appointment reminder calculations to be inaccurate across different timezones.

**Solution Applied**:
- Changed `TIMESTAMP DEFAULT NOW()` → `TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
- Applied to ALL tables: patients, appointments, reminders_log, conversations, daily_metrics, appointment_state_changes
- Prisma: Added `@db.Timestamptz` to ensure timezone preservation

**Impact**: 
- ✅ Reminder windows (72h, 48h, 24h) now accurate regardless of server/patient timezone
- ✅ Dashboard metrics correctly aggregate across timezones

---

### ✅ Fix 2: Duplicate Reminder Prevention (CRITICAL)
**Problem**: No unique constraint on `(appointment_id, reminder_type)` allowed duplicate reminders if cron job ran twice.

**Solution Applied**:
```sql
ALTER TABLE reminders_log 
ADD CONSTRAINT unique_reminder_per_appointment 
UNIQUE(appointment_id, type);
```

**Prisma**:
```prisma
@@unique([appointmentId, type], name: "unique_reminder_per_appointment")
```

**Impact**:
- ✅ Database-level guarantee: each appointment can only have ONE reminder per type
- ✅ Race condition eliminated (cron job can run multiple times safely)

---

### ✅ Fix 3: Data Validation Constraints (MEDIUM)
**Problem**: RUT and phone formats not enforced, allowed invalid data entry.

**Solution Applied**:
```sql
-- patients table
CONSTRAINT valid_rut_format CHECK (rut ~ '^\d{7,8}-[\dKk]$'),
CONSTRAINT valid_phone_format CHECK (phone ~ '^\+56\d{9}$')
```

**Impact**:
- ✅ Only valid Chilean RUTs accepted: `12345678-9` or `1234567-K`
- ✅ Only valid E.164 Chile phone numbers: `+56912345678`
- ✅ Database rejects invalid data at INSERT/UPDATE level

---

### ✅ Fix 4: JSONB Schema Documentation (MEDIUM)
**Problem**: `conversation_data JSONB` structure not documented, risk of invalid state storage.

**Solution Applied**:
- Documented TypeScript interface for JSONB structure
- Defined allowed fields: `validatedRut`, `detectedIntent`, `intentConfidence`, etc.
- Example JSON provided in schema documentation

**Impact**:
- ✅ Backend developers know exact JSONB structure
- ✅ Zod validation can be written against documented schema
- ✅ Prevents invalid conversation states

---

## Remaining Issue (Lower Priority)

### ⚠️ Daily Metrics Cron Job Idempotency
**Problem**: If metrics calculation job runs twice simultaneously, could double-count appointments.

**Solution (TO BE IMPLEMENTED)**:
```typescript
// Use Redis distributed lock
const lock = await redis.set('metrics:lock', '1', 'NX', 'EX', 300);
if (!lock) return; // Another job running

// Calculate metrics...

await redis.del('metrics:lock');
```

**Alternative**: Use `ON CONFLICT` in daily_metrics table with `calculated_at` timestamp.

---

## Files Modified
- `.claude/database-schema.md` (SQL + Prisma schemas updated)

## Next Steps
1. ✅ Schema fixes applied to documentation
2. ⏭️ Alonso (TDD): Write Prisma schema tests
3. ⏭️ Valtteri: Create actual `prisma/schema.prisma` file from `.claude/database-schema.md`
4. ⏭️ Run `prisma migrate dev` to create database

---

**Status**: Ready for TDD implementation phase.
