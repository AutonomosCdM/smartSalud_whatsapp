# Metrics Dashboard - TDD Implementation Guide

**Status**: 🔴 RED PHASE - Tests written, awaiting implementation
**Created by**: Alonso (TDD Veteran)
**For**: Valtteri (Code Master)

---

## 📋 Test Suite Overview

**4 test files created** covering complete metrics backend:

1. ✅ `MetricsService.test.ts` (70 tests) - Business logic layer
2. ✅ `MetricsCalculator.test.ts` (38 tests) - Pure calculation functions
3. ✅ `MetricsRepository.test.ts` (31 tests) - Database queries (Prisma)
4. ✅ `metrics.test.ts` (28 tests) - API routes (Express)

**Total**: 167 test cases covering all MVP requirements

---

## 🎯 Implementation Order (Follow TDD)

### Phase 1: Pure Logic (No Dependencies)
**Start here** - easiest to make tests pass:

```bash
# 1. MetricsCalculator - Pure functions, no external deps
backend/src/utils/MetricsCalculator.ts
```

**Tests expect**:
```typescript
class MetricsCalculator {
  calculateKPIs(stats: AppointmentStats): KPIs
  calculateTrend(current: number, previous: number): Trend
  calculatePercentage(part: number, total: number): number
  calculateDailyNoShowRate(dayData: DayData): number
  calculateAverageReminders(total: number, appointments: number): number
  calculateReminderResponseRate(sent: number, responded: number): number
}
```

**Key logic**:
- Division by zero → return 0
- Round to 2 decimal places
- Handle null/undefined as 0

---

### Phase 2: Database Layer (Prisma)
```bash
# 2. MetricsRepository - Prisma queries
backend/src/repositories/MetricsRepository.ts
```

**Tests expect**:
```typescript
class MetricsRepository {
  constructor(prisma: PrismaClient)

  getAppointmentStats(dateRange?: DateRange): Promise<AppointmentStats>
  getDailyTrends(options?: { days: number }): Promise<DailyTrend[]>
  getStatusDistribution(dateRange?: DateRange): Promise<StatusCount[]>
  getReminderStats(dateRange?: DateRange): Promise<ReminderStats>
}
```

**Key queries**:
- Use `aggregate()` for stats
- Use `groupBy()` for trends/distribution
- Date filtering: `appointmentDate >= startDate AND <= endDate`
- Default trends: last 14 days

---

### Phase 3: Service Layer (Business Logic)
```bash
# 3. MetricsService - Orchestrates repository + calculator + cache
backend/src/services/MetricsService.ts
```

**Tests expect**:
```typescript
class MetricsService {
  constructor(
    repository: MetricsRepository,
    calculator: MetricsCalculator,
    cache: CacheService
  )

  getKPIs(dateRange?: DateRange): Promise<KPIs>
  getTrends(options?: { days: number }): Promise<DailyTrend[]>
  getDistribution(dateRange?: DateRange): Promise<StatusDistribution[]>
  getRemindersStats(dateRange?: DateRange): Promise<ReminderStats>
}
```

**Key behavior**:
- Check cache first (`cache.get()`)
- If miss, call repository → calculator
- Store result (`cache.set(key, value, 300)`) - 5 min TTL
- Handle errors gracefully (catch → rethrow with context)

---

### Phase 4: API Routes (Express)
```bash
# 4. Metrics routes - HTTP endpoints
backend/src/routes/metrics.ts
```

**Tests expect**:
```typescript
const router = express.Router();

router.get('/kpis', async (req, res) => {
  // Parse query params: startDate, endDate
  // Call metricsService.getKPIs()
  // Return 200 + JSON
  // Handle errors → 500 + JSON error
});

router.get('/trends', async (req, res) => {
  // Parse query param: days (default 14)
  // Validate: days > 0
  // Call metricsService.getTrends()
});

router.get('/distribution', async (req, res) => {
  // Parse query params: startDate, endDate
  // Call metricsService.getDistribution()
});

router.get('/reminders', async (req, res) => {
  // Call metricsService.getRemindersStats()
});

export { router as metricsRouter };
```

**Key requirements**:
- Rate limiting: 100 req/min per IP
- CORS: Allow `http://localhost:3000`
- Error format: `{ error: "message" }`
- Production: Hide error details
- Development: Expose full errors

---

## 📦 Dependencies to Install

```bash
cd backend
npm install --save-dev jest-mock-extended
```

---

## 🔧 Run Tests (Verify RED Phase)

```bash
cd backend

# Run all metrics tests (should FAIL)
npm test -- --testPathPattern=__tests__

# Run specific test file
npm test -- MetricsCalculator.test.ts
npm test -- MetricsService.test.ts
npm test -- MetricsRepository.test.ts
npm test -- metrics.test.ts

# Watch mode (for TDD loop)
npm test -- --watch MetricsCalculator.test.ts
```

**Expected**: All tests FAIL with "not implemented" or "module not found"

---

## 🧪 TDD Loop (Red → Green → Refactor)

### Example: MetricsCalculator.calculateKPIs

**1. RED** (already done):
```typescript
// Test exists, fails
it('should calculate no-show rate correctly', () => {
  const result = calculator.calculateKPIs(stats);
  expect(result.noShowRate).toBe(12.0); // FAILS
});
```

**2. GREEN** (your job):
```typescript
// Simplest implementation to pass
class MetricsCalculator {
  calculateKPIs(stats: AppointmentStats): KPIs {
    const total = stats.total;
    if (total === 0) return this.emptyKPIs();

    return {
      noShowRate: this.round((stats.noShows / total) * 100),
      confirmationRate: this.round((stats.confirmed / total) * 100),
      cancellationRate: this.round((stats.cancelled / total) * 100),
      rescheduleRate: this.round((stats.rescheduled / total) * 100),
      totalAppointments: total,
    };
  }

  private round(num: number): number {
    return Math.round(num * 100) / 100;
  }

  private emptyKPIs(): KPIs {
    return {
      noShowRate: 0,
      confirmationRate: 0,
      cancellationRate: 0,
      rescheduleRate: 0,
      totalAppointments: 0,
    };
  }
}
```

**3. REFACTOR**:
- Extract `round()` helper ✅
- Extract `emptyKPIs()` ✅
- Tests still GREEN ✅

---

## 📊 Test Coverage Goals

**Minimum acceptable**:
- MetricsCalculator: 95%+ (pure logic)
- MetricsRepository: 80%+ (DB queries)
- MetricsService: 85%+ (business logic)
- Routes: 75%+ (HTTP layer)

**Check coverage**:
```bash
npm test -- --coverage --testPathPattern=__tests__
```

---

## 🚨 Edge Cases Covered

Tests already handle:
- ✅ Division by zero
- ✅ Empty datasets (0 appointments)
- ✅ Null/undefined values
- ✅ Negative numbers (invalid but shouldn't crash)
- ✅ Very large numbers (1M+ appointments)
- ✅ Decimal results (rounding)
- ✅ Database errors (connection timeout, query failure)
- ✅ Cache failures (fallback to DB)
- ✅ Invalid query params (400 errors)
- ✅ Rate limiting (429 errors)

**You don't need to write these tests** - just make them pass.

---

## 📁 File Structure (Create These)

```
backend/src/
├── utils/
│   ├── MetricsCalculator.ts          ← START HERE
│   └── __tests__/
│       └── MetricsCalculator.test.ts  ✅ EXISTS
├── repositories/
│   ├── MetricsRepository.ts           ← PHASE 2
│   └── __tests__/
│       └── MetricsRepository.test.ts  ✅ EXISTS
├── services/
│   ├── MetricsService.ts              ← PHASE 3
│   ├── CacheService.ts                (may need to create)
│   └── __tests__/
│       └── MetricsService.test.ts     ✅ EXISTS
└── routes/
    ├── metrics.ts                     ← PHASE 4
    └── __tests__/
        └── metrics.test.ts            ✅ EXISTS
```

---

## 🎬 Example TDD Session

**Session: Implement MetricsCalculator (30 min)**

```bash
# 1. Start watch mode
npm test -- --watch MetricsCalculator.test.ts

# 2. Create file
touch backend/src/utils/MetricsCalculator.ts

# 3. Write minimal class
export class MetricsCalculator {
  calculateKPIs(stats: any) {
    return { noShowRate: 0 }; // MINIMAL
  }
}

# 4. See 1 test pass, 37 fail
# 5. Implement next method
# 6. Repeat until all GREEN
# 7. Refactor (extract helpers, improve names)
# 8. All tests still GREEN → DONE
```

**Estimated time per file**:
- MetricsCalculator: 30-45 min
- MetricsRepository: 60-90 min (Prisma queries)
- MetricsService: 45-60 min
- Routes: 30-45 min

**Total**: 3-4 hours of focused TDD implementation

---

## 🐛 Debugging Failed Tests

**Test fails with "module not found"**:
```bash
# Install missing dependency
npm install --save-dev jest-mock-extended
```

**Test fails with Prisma type error**:
```typescript
// Mock Prisma properly
import { mockDeep } from 'jest-mock-extended';
const prismaMock = mockDeep<PrismaClient>();
```

**Test fails with date comparison**:
```typescript
// Format dates consistently
const dateStr = date.toISOString().split('T')[0]; // "2025-11-15"
```

**Test fails with decimal precision**:
```typescript
// Use toBeCloseTo() for floats
expect(result.noShowRate).toBeCloseTo(12.41, 2); // 2 decimal places
```

---

## ✅ Definition of Done

**Before calling adrian-newey for verification**:

1. All 167 tests pass ✅
2. Coverage ≥ 80% for all modules ✅
3. No TypeScript errors ✅
4. No ESLint warnings ✅
5. All TODOs removed from code ✅
6. Edge cases handled (division by zero, etc.) ✅
7. Error messages are clear ✅
8. Code is refactored (no duplication) ✅

---

## 📞 Support

**Questions during implementation?**
- Check test file for expected behavior
- Run single test: `npm test -- -t "should calculate no-show rate"`
- Read error message carefully (tests are self-documenting)

**Stuck on a test?**
- Comment it out temporarily (but uncomment before merge!)
- Move to next test, come back later
- Ask alonso for clarification

---

**Trust the tests. They know what they want.**

— Alonso
