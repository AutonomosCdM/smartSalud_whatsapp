# TDD Test Results - Prisma Schema

**Date**: 2025-11-18
**Status**: ✅ RED PHASE (Tests failing as expected)
**Next**: Valtteri implements schema migration

---

## Test Execution Summary

**Command**: `npm test -- src/tests/prisma/schema.test.ts`

**Result**: ALL 27 TESTS FAILING (Expected - TDD Red Phase)

**Root Cause**: Database `smartsalud_test` does not exist yet

---

## Test Coverage

### ✅ Tests Written (27 total)

#### Patient Model (8 tests)
- ✕ Reject invalid RUT format
- ✕ Accept valid Chilean RUT format
- ✕ Validate RUT check digit correctly
- ✕ Insert patient with valid RUT
- ✕ Reject duplicate RUT (UNIQUE constraint)
- ✕ Reject invalid phone format
- ✕ Accept valid Chilean phone format (E.164)
- ✕ Format phone to E.164

#### Appointment Model (5 tests)
- ✕ Create appointment with AGENDADO status by default
- ✕ Allow appointment with past date (Prisma limitation)
- ✕ Create appointment with all reminder flags false
- ✕ Cascade delete appointments when patient is deleted
- ✕ Allow rescheduling (self-reference)

#### ReminderLog Model (4 tests)
- ✕ Prevent duplicate reminders (UNIQUE constraint)
- ✕ Allow different reminder types for same appointment
- ✕ Track response received and response text
- ✕ Cascade delete reminders when appointment is deleted

#### Conversation Model (4 tests)
- ✕ Create conversation with WAITING_RUT step by default
- ✕ Store conversation data as JSONB
- ✕ Allow conversation without patient (anonymous)
- ✕ SET NULL on patient delete

#### DailyMetric Model (3 tests)
- ✕ Use date as primary key
- ✕ Calculate rates as Decimal
- ✕ Reject duplicate date (PK constraint)

#### AppointmentStateChange Model (3 tests)
- ✕ Track state change from AGENDADO to CONFIRMADO
- ✕ Allow NULL fromStatus (initial state)
- ✕ Cascade delete state changes when appointment is deleted

---

## Files Created

### 1. Prisma Schema ✅
**File**: `/Users/autonomos_dev/Projects/smartSalud_V5/backend/prisma/schema.prisma`

**Features**:
- 5 core models (Patient, Appointment, ReminderLog, Conversation, DailyMetric)
- 1 audit model (AppointmentStateChange)
- 3 enums (AppointmentStatus, ReminderType, ConversationStep)
- All fields use `@db.Timestamptz` for timezone support
- UNIQUE constraints defined
- CASCADE and SET NULL behaviors configured
- Self-referential relationship for appointment rescheduling

**Fix Applied**:
- Changed `Date` type to `DateTime @db.Date` (Prisma doesn't have Date type)
- Removed `@@index([date])` from DailyMetric (DateTime @id already indexed)

### 2. Validation Utilities ✅
**File**: `/Users/autonomos_dev/Projects/smartSalud_V5/backend/src/utils/validation.ts`

**Exports**:
- `rutSchema` - Zod schema for Chilean RUT validation
- `phoneSchema` - Zod schema for E.164 phone validation
- `emailSchema` - Zod schema for email (optional)
- `patientSchema` - Complete patient validation
- `appointmentSchema` - Complete appointment validation
- `validateRutCheckDigit()` - RUT verification digit calculator
- `formatPhoneE164()` - Phone number formatter

**Why Zod?**:
Prisma doesn't support CHECK constraints natively. Validation must happen at application layer.

### 3. Test Suite ✅
**File**: `/Users/autonomos_dev/Projects/smartSalud_V5/backend/src/tests/prisma/schema.test.ts`

**Features**:
- Uses test database (`smartsalud_test`)
- Cleans database before each test
- Tests all CRUD operations
- Tests constraints (UNIQUE, CASCADE, SET NULL)
- Tests Zod validation schemas
- Tests data type handling (JSONB, Decimal, Timestamptz)

### 4. Jest Configuration ✅
**Files**:
- `/Users/autonomos_dev/Projects/smartSalud_V5/backend/jest.config.js`
- `/Users/autonomos_dev/Projects/smartSalud_V5/backend/src/tests/setup.ts`

**Configuration**:
- TypeScript support via ts-jest
- 10-second timeout for DB operations
- Coverage reporting enabled
- Test environment variables set

### 5. Environment Template ✅
**File**: `/Users/autonomos_dev/Projects/smartSalud_V5/backend/.env.example`

**Variables**:
- DATABASE_URL (PostgreSQL connection string)
- NODE_ENV
- PORT
- Twilio credentials
- Groq API key
- ElevenLabs API key
- Redis URL

---

## Expected Error (TDD Red Phase)

```
PrismaClientInitializationError:
User `user` was denied access on the database `smartsalud_test.public`
```

**This is CORRECT behavior** - Database doesn't exist yet.

---

## Next Steps for Valtteri

### 1. Create Test Database
```bash
# Create PostgreSQL test database
createdb smartsalud_test

# Or via psql
psql -U postgres -c "CREATE DATABASE smartsalud_test;"
```

### 2. Create .env File
```bash
cd /Users/autonomos_dev/Projects/smartSalud_V5/backend
cp .env.example .env

# Edit .env with real credentials
DATABASE_URL="postgresql://user:password@localhost:5432/smartsalud_dev"
```

### 3. Run Migration
```bash
npx prisma migrate dev --name init
```

This will:
- Create all tables in dev database
- Generate SQL migration files
- Apply schema to database

### 4. Run Tests Again
```bash
npm test -- src/tests/prisma/schema.test.ts
```

**Expected**: All 27 tests should PASS (TDD Green phase)

### 5. Verify Schema
```bash
npx prisma studio
```

Open browser to inspect database structure.

---

## TDD Checklist

- ✅ RED: Tests written and failing (current state)
- ⬜ GREEN: Implementation created, tests pass (Valtteri's job)
- ⬜ REFACTOR: Code cleanup while tests stay green (Valtteri's job)

---

## Schema Validation Notes

### ❌ NOT Validated by Prisma
- RUT format (regex pattern)
- Phone format (E.164)
- Appointment date > created_at (CHECK constraint)

**Solution**: Zod validation at API layer before Prisma operations.

### ✅ Validated by Prisma
- UNIQUE constraints (RUT, reminder per appointment)
- Foreign key constraints
- CASCADE deletes
- SET NULL behavior
- Data types (UUID, Timestamptz, JSONB, Decimal)

---

## Test Database Design

**Strategy**: Separate test database to avoid polluting dev data.

**Connection**:
```typescript
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL?.replace(/\/[^/]+$/, '/smartsalud_test'),
});
```

**Cleanup**: `beforeEach` hook deletes all records to ensure test isolation.

---

*Version: 1.0*
*Created: 2025-11-18*
*Author: Alonso (TDD)*
