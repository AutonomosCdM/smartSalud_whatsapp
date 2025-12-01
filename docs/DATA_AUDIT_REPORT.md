# Data Audit Report - smartSalud V5

## 📊 Executive Summary

**Total Files Analyzed**: 10 Excel files  
**Total Rows**: ~12,000+ patient records  
**Data Quality**: **MIXED** - Requires strategic consolidation  
**Critical Finding**: **Phone numbers are scattered across different files**

---

## 🗂️ File Inventory

### Consolidated Master Files (5 files)

| File | Rows | Key Fields | Phone Coverage | Quality |
|------|------|------------|----------------|---------|
| **ECICEP Universal** | 1,078 | Risk Level, Doctor, Sector | ❌ 0% | ⭐⭐⭐ Good |
| **POBLACION BAJO CONTROL** | 1,608 | Birth Date, Programs, Control Level | ⚠️ 80% | ⭐⭐⭐⭐ Excellent |
| **PACIENTES RECHAZO 2025** | 8,454 | Rejection reasons, Birth Date | ⚠️ Variable | ⭐⭐ Fair |
| **PLAN DE LOS PAD 2025** | 95 | **FULL DATA** (Phone, Address, Caregiver) | ✅ 100% | ⭐⭐⭐⭐⭐ Perfect |
| **Población Infantil** | 999 | Pediatric calendar | ❌ Unstructured | ⭐ Poor |

### Daily Appointment Sheets (5 files)

| File | Rows | Format | Usability |
|------|------|--------|-----------|
| hoja_diaria_17_11 | 772 | HTML in XLS | ⚠️ Needs parser |
| hoja_diaria_19_11 | 694 | HTML in XLS | ⚠️ Needs parser |
| hoja_diaria_27_11 | 401 | HTML in XLS | ⚠️ Needs parser |
| hoja_diaria_28_11 | 17 | HTML in XLSX | ⚠️ Needs parser |
| hoja_diaria_29_11 | 23 | HTML in XLS | ⚠️ Needs parser |

---

## 🔍 Field Coverage Analysis

### Critical Fields Availability

| Field | ECICEP | POBLACION | PAD | RECHAZO | Daily Sheets |
|-------|--------|-----------|-----|---------|--------------|
| **RUT** | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| **Name** | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| **Phone** | ❌ 0% | ⚠️ 80% | ✅ 100% | ❌ 0% | ✅ ~90% |
| **Birth Date** | ❌ 0% | ✅ 100% | ✅ 100% | ✅ 100% | ❌ 0% |
| **Risk Level** | ✅ 100% | ❌ 0% | ❌ 0% | ❌ 0% | ❌ 0% |
| **Sector** | ✅ 100% | ✅ 100% | ❌ 0% | ❌ 0% | ❌ 0% |
| **Doctor** | ✅ 100% | ❌ 0% | ❌ 0% | ❌ 0% | ✅ Variable |
| **Programs** | ❌ 0% | ✅ 100% | ❌ 0% | ❌ 0% | ❌ 0% |

### 🎯 Source of Truth Matrix

| Data Type | Primary Source | Secondary Source | Tertiary Source |
|-----------|----------------|------------------|-----------------|
| **Phone Numbers** | PLAN DE LOS PAD (95 pts) | POBLACION BAJO CONTROL (1,608 pts) | Daily Sheets (variable) |
| **Risk Levels** | ECICEP Universal (1,078 pts) | - | - |
| **Birth Dates** | POBLACION BAJO CONTROL | PACIENTES RECHAZO | PLAN DE LOS PAD |
| **Chronic Programs** | POBLACION BAJO CONTROL | - | - |
| **Appointments** | Daily Sheets | - | - |

---

## ⚠️ Data Quality Issues

### 1. Phone Number Crisis
- **ECICEP**: 0% phone coverage (1,078 patients without phones)
- **Current DB**: 98% placeholder phones (`+56900000000`)
- **Root Cause**: We imported ECICEP first, which has NO phones

### 2. Duplicate Patients Across Files
- Same RUT appears in multiple files with different data
- **Example**: A patient in ECICEP (risk G3) also in POBLACION (with phone)
- **Impact**: Need to merge data, not overwrite

### 3. Daily Sheets Format Problem
- Files are HTML tables embedded in Excel
- Current heuristic parser works but is fragile
- Need robust HTML parser

### 4. Missing Email Addresses
- **ALL files**: 0% email coverage
- Emails don't exist in source data
- Should generate placeholder: `{rut}@placeholder.com`

---

## 💡 Recommended Import Strategy

### Phase 1: Master Patient Registry (Priority Order)

```
1. PLAN DE LOS PAD (95 patients)
   → Full data: Phone, Address, Birth Date, Caregiver
   → HIGHEST QUALITY

2. POBLACION BAJO CONTROL (1,608 patients)
   → Birth Date, Phone (80%), Programs, Control Level
   → MERGE with existing if RUT matches

3. ECICEP Universal (1,078 patients)
   → Risk Level, Doctor, Sector
   → ENRICH existing patients (don't overwrite phones!)

4. PACIENTES RECHAZO (8,454 patients)
   → Birth Date, Rejection history
   → OPTIONAL: Track rejection patterns
```

### Phase 2: Appointments (Daily Sheets)
```
5. Daily Sheets (all 5 files)
   → Appointments with phones
   → CROSS-REFERENCE with master registry
   → UPDATE phones if better quality
```

---

## 🛠️ Implementation Plan

### Step 1: Clean Current Database
```sql
-- Option A: Keep existing, enrich
UPDATE patients SET phone = NULL WHERE phone = '+56900000000';

-- Option B: Fresh start (recommended)
TRUNCATE TABLE chronic_programs;
TRUNCATE TABLE appointments;
-- Keep patients table structure
```

### Step 2: Import in Correct Order
```bash
# 1. Import PAD (best quality)
node src/scripts/import_pad.js

# 2. Import POBLACION (merge mode)
node src/scripts/import_poblacion.js

# 3. Enrich with ECICEP (no overwrite)
node src/scripts/import_ecicep_enrich.js

# 4. Import Daily Sheets
node src/scripts/import_daily_sheets.js
```

### Step 3: Validation
```bash
# Check phone coverage
node src/scripts/validate_phones.js

# Expected: >80% real phones
```

---

## 📈 Expected Outcomes

| Metric | Current | After Fix |
|--------|---------|-----------|
| Patients with Real Phone | 2% | **85%+** |
| Patients with Birth Date | 85% | **95%+** |
| Patients with Risk Level | 14% | **50%+** |
| Patients with Programs | 86% | **90%+** |

---

## 🚨 Critical Recommendations

1. **DO NOT import ECICEP first** - It has no phones
2. **Start with PLAN DE LOS PAD** - Highest quality data
3. **Use UPSERT, not INSERT** - Merge data intelligently
4. **Validate after each import** - Check phone coverage
5. **Keep audit trail** - Log which file updated which field

---

## 📋 Next Steps

1. ✅ User review this audit report
2. ⏳ Create optimized import scripts (one per file)
3. ⏳ Run imports in correct order
4. ⏳ Validate final data quality
5. ⏳ Update walkthrough with results
