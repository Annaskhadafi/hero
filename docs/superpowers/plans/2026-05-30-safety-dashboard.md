# Safety Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/dashboard/safety` as a full MVP Safety Dashboard, import `SAFETY DASHBOARD V2.xlsx` once into typed database tables, and provide dashboard charts, KPI cards, reusable HERO tables, filters, export, and CRUD dialogs.

**Architecture:** Add typed Drizzle tables to `db/schema/hero.ts`, centralize import parsing and dashboard aggregations in focused `lib/safety-dashboard/*` modules, and render a dedicated App Router page at `app/dashboard/safety/page.tsx`. Client-only charts and CRUD dialogs live under `components/safety-dashboard/`, while server actions in `app/dashboard/safety/actions.ts` mutate records and revalidate the safety page.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM, PostgreSQL, `xlsx`, Recharts, existing HERO components (`AdminPageShell`, `AdminTableCard`, `MinimalTableShell`, `TableMultiFilter`, `EnterpriseRecordDialog`, `EnterpriseFormGrid`, `EnterpriseActionButtons`).

---

## File Structure

- Modify `db/schema/hero.ts` — add eight safety tables.
- Create migration with `npm run db:generate` — Drizzle SQL for safety tables.
- Modify `package.json` — add `db:import:safety-dashboard`.
- Create `lib/safety-dashboard/types.ts` — shared row types, category constants, workbook sheet names.
- Create `lib/safety-dashboard/parsing.ts` — parse Excel dates, numbers, text, URLs, and status.
- Create `lib/safety-dashboard/importer.ts` — workbook-to-table mapping and import orchestration.
- Create `lib/safety-dashboard/queries.ts` — server queries and KPI/chart aggregations.
- Create `scripts/import-safety-dashboard.ts` — CLI entry for one-time workbook import.
- Create `app/dashboard/safety/actions.ts` — CRUD server actions.
- Create `app/dashboard/safety/page.tsx` — server page layout, dashboard, and tabs.
- Create `components/safety-dashboard/safety-dashboard-charts.tsx` — client Recharts charts.
- Create `components/safety-dashboard/safety-record-dialogs.tsx` — CRUD dialogs and row actions.
- Modify navigation seed/config if needed so `/dashboard/safety` is reachable.
- Create/update tests under `tests/safety-dashboard-parsing.test.ts` and `tests/safety-dashboard-importer.test.ts`.

---

### Task 1: Add Safety Database Schema

**Files:**
- Modify: `db/schema/hero.ts`
- Generated: `drizzle/<next>_*.sql`

- [ ] **Step 1: Add safety table exports to `db/schema/hero.ts`**

Add these tables near the existing HSE tables, using imported `serial`, `text`, `integer`, `decimal`, `date`, and `timestamp`:

```ts
export const safetyIncidentSummaryYearly = pgTable('hero_safety_incident_summary_yearly', {
  id: serial('id').primaryKey(),
  year: integer('year').notNull(),
  fatality: integer('fatality').notNull().default(0),
  lostDayInjury: integer('lost_day_injury').notNull().default(0),
  restrictedWorkDayInjury: integer('restricted_work_day_injury').notNull().default(0),
  medicalTreatmentCase: integer('medical_treatment_case').notNull().default(0),
  firstAid: integer('first_aid').notNull().default(0),
  propertyDamage: integer('property_damage').notNull().default(0),
  nearMissReport: integer('near_miss_report').notNull().default(0),
  environmental: integer('environmental').notNull().default(0),
  fatigue: integer('fatigue').notNull().default(0),
  totalEvents: integer('total_events').notNull().default(0),
  sourceSheet: text('source_sheet').notNull().default('manual'),
  sourceRowNumber: integer('source_row_number'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const safetyIncidentSummaryMonthly = pgTable('hero_safety_incident_summary_monthly', {
  id: serial('id').primaryKey(),
  month: date('month').notNull(),
  fatality: integer('fatality').notNull().default(0),
  lostDayInjury: integer('lost_day_injury').notNull().default(0),
  restrictedWorkDayInjury: integer('restricted_work_day_injury').notNull().default(0),
  medicalTreatmentCase: integer('medical_treatment_case').notNull().default(0),
  firstAid: integer('first_aid').notNull().default(0),
  propertyDamage: integer('property_damage').notNull().default(0),
  nearMissReport: integer('near_miss_report').notNull().default(0),
  environmental: integer('environmental').notNull().default(0),
  totalEvents: integer('total_events').notNull().default(0),
  sourceSheet: text('source_sheet').notNull().default('manual'),
  sourceRowNumber: integer('source_row_number'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const safetyIncidentReports = pgTable('hero_safety_incident_reports', {
  id: serial('id').primaryKey(),
  workerName: text('worker_name').notNull().default(''),
  department: text('department').notNull().default(''),
  incidentDescription: text('incident_description').notNull(),
  propertyDamage: text('property_damage').notNull().default(''),
  location: text('location').notNull().default(''),
  category: text('category').notNull().default(''),
  incidentDate: date('incident_date'),
  notes: text('notes').notNull().default(''),
  status: text('status').notNull().default('open'),
  sourceSheet: text('source_sheet').notNull().default('manual'),
  sourceRowNumber: integer('source_row_number'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const safetyCertifications = pgTable('hero_safety_certifications', {
  id: serial('id').primaryKey(),
  equipmentName: text('equipment_name').notNull(),
  picDepartment: text('pic_department').notNull().default(''),
  workArea: text('work_area').notNull().default(''),
  equipmentClassification: text('equipment_classification').notNull().default(''),
  certifier: text('certifier').notNull().default(''),
  certificationDate: date('certification_date'),
  nextCertificationDate: date('next_certification_date'),
  status: text('status').notNull().default('UNKNOWN'),
  regulation: text('regulation').notNull().default(''),
  remarks: text('remarks').notNull().default(''),
  workLocation: text('work_location').notNull().default(''),
  sourceSheet: text('source_sheet').notNull().default('manual'),
  sourceRowNumber: integer('source_row_number'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const safetyPerformanceMetrics = pgTable('hero_safety_performance_metrics', {
  id: serial('id').primaryKey(),
  year: integer('year').notNull(),
  periodLabel: text('period_label').notNull(),
  employeeCount: integer('employee_count').notNull().default(0),
  safeManHoursUpToYear: decimal('safe_man_hours_up_to_year', { precision: 14, scale: 2 }).notNull().default('0'),
  fatalityThreshold: decimal('fatality_threshold', { precision: 10, scale: 2 }).notNull().default('0'),
  fatalityActual: decimal('fatality_actual', { precision: 10, scale: 2 }).notNull().default('0'),
  ltiThreshold: decimal('lti_threshold', { precision: 10, scale: 2 }).notNull().default('0'),
  ltiActual: decimal('lti_actual', { precision: 10, scale: 2 }).notNull().default('0'),
  propertyDamageThreshold: decimal('property_damage_threshold', { precision: 10, scale: 2 }).notNull().default('0'),
  propertyDamageActual: decimal('property_damage_actual', { precision: 10, scale: 2 }).notNull().default('0'),
  sourceSheet: text('source_sheet').notNull().default('manual'),
  sourceRowNumber: integer('source_row_number'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const safetyManHours = pgTable('hero_safety_man_hours', {
  id: serial('id').primaryKey(),
  workLocation: text('work_location').notNull(),
  employeeCount: integer('employee_count').notNull().default(0),
  safetyManHours: decimal('safety_man_hours', { precision: 14, scale: 2 }).notNull().default('0'),
  safeTarget: decimal('safe_target', { precision: 14, scale: 2 }).notNull().default('0'),
  averageWeeklyRevenue: decimal('average_weekly_revenue', { precision: 14, scale: 2 }),
  sourceSheet: text('source_sheet').notNull().default('manual'),
  sourceRowNumber: integer('source_row_number'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const safetyMonthlyManHours = pgTable('hero_safety_monthly_man_hours', {
  id: serial('id').primaryKey(),
  workLocation: text('work_location').notNull(),
  employeeCount: integer('employee_count').notNull().default(0),
  month: date('month').notNull(),
  safetyManHours: decimal('safety_man_hours', { precision: 14, scale: 2 }).notNull().default('0'),
  sourceSheet: text('source_sheet').notNull().default('manual'),
  sourceRowNumber: integer('source_row_number'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const safetyWeeklyActivities = pgTable('hero_safety_weekly_activities', {
  id: serial('id').primaryKey(),
  activity: text('activity').notNull(),
  activityDate: date('activity_date'),
  pic: text('pic').notNull().default(''),
  category: text('category').notNull().default(''),
  imageUrl: text('image_url').notNull().default(''),
  evidenceUrl: text('evidence_url').notNull().default(''),
  sourceSheet: text('source_sheet').notNull().default('manual'),
  sourceRowNumber: integer('source_row_number'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

- [ ] **Step 2: Generate migration**

Run: `npm run db:generate`

Expected: Drizzle creates a new SQL migration under `drizzle/` and updates `drizzle/meta/`.

- [ ] **Step 3: Commit schema and migration**

```bash
git add db/schema/hero.ts drizzle

git commit -m "feat(safety): add dashboard database tables" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Build Workbook Parsing and Importer

**Files:**
- Create: `lib/safety-dashboard/types.ts`
- Create: `lib/safety-dashboard/parsing.ts`
- Create: `lib/safety-dashboard/importer.ts`
- Create: `scripts/import-safety-dashboard.ts`
- Modify: `package.json`
- Test: `tests/safety-dashboard-parsing.test.ts`

- [ ] **Step 1: Add parsing tests**

Create `tests/safety-dashboard-parsing.test.ts`:

```ts
import { normalizeSafetyNumber, parseSafetyDate, normalizeSafetyStatus } from '@/lib/safety-dashboard/parsing'

describe('safety dashboard parsing', () => {
  it('parses workbook numbers with Indonesian and Excel separators', () => {
    expect(normalizeSafetyNumber('1,34')).toBe(1.34)
    expect(normalizeSafetyNumber('2,982,657.00')).toBe(2982657)
    expect(normalizeSafetyNumber('3,760')).toBe(3760)
    expect(normalizeSafetyNumber(null)).toBeNull()
  })

  it('parses workbook dates', () => {
    expect(parseSafetyDate('01-08-2025')?.toISOString().slice(0, 10)).toBe('2025-01-08')
    expect(parseSafetyDate('15-Sep-25')?.toISOString().slice(0, 10)).toBe('2025-09-15')
    expect(parseSafetyDate('2026-01-01')?.toISOString().slice(0, 10)).toBe('2026-01-01')
  })

  it('normalizes certification status', () => {
    expect(normalizeSafetyStatus('aktif')).toBe('AKTIF')
    expect(normalizeSafetyStatus('expired')).toBe('EXPIRED')
    expect(normalizeSafetyStatus('')).toBe('UNKNOWN')
  })
})
```

- [ ] **Step 2: Implement `parsing.ts`**

Create `lib/safety-dashboard/parsing.ts` with exported `normalizeSafetyNumber`, `parseSafetyDate`, `toDateOnly`, `normalizeSafetyText`, `normalizeSafetyStatus`, and `isValidHttpUrl`.

- [ ] **Step 3: Run parsing test**

Run: `npm test -- --runInBand tests/safety-dashboard-parsing.test.ts`

Expected: PASS.

- [ ] **Step 4: Implement importer**

Create `lib/safety-dashboard/importer.ts` that uses `xlsx`, imports table exports from `@/db/schema/hero`, deletes rows whose `sourceSheet` is one of the workbook sheet names, maps each sheet row to typed table inserts, and returns a summary object `{ sheet, read, inserted, skipped, errors }[]`.

- [ ] **Step 5: Add CLI script**

Create `scripts/import-safety-dashboard.ts`:

```ts
import { importSafetyDashboardWorkbook } from '@/lib/safety-dashboard/importer'

async function main() {
  const workbookPath = process.argv[2] ?? 'SAFETY DASHBOARD V2.xlsx'
  const summary = await importSafetyDashboardWorkbook(workbookPath)
  console.table(summary)
}

main().catch((error) => {
  console.error('[safety-import] failed', error)
  process.exit(1)
})
```

- [ ] **Step 6: Add npm script**

In `package.json`, add:

```json
"db:import:safety-dashboard": "tsx scripts/import-safety-dashboard.ts"
```

- [ ] **Step 7: Commit importer**

```bash
git add lib/safety-dashboard scripts/import-safety-dashboard.ts tests/safety-dashboard-parsing.test.ts package.json

git commit -m "feat(safety): import dashboard workbook" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Add Safety Queries and Aggregations

**Files:**
- Create: `lib/safety-dashboard/queries.ts`
- Test: `tests/safety-dashboard-aggregations.test.ts`

- [ ] **Step 1: Create aggregation tests**

Test pure helpers for totals and category chart rows. Use sample arrays matching the query return type and assert total incident YTD, expired certification count, and monthly trend output.

- [ ] **Step 2: Implement query module**

Export `getSafetyDashboardData()` from `lib/safety-dashboard/queries.ts`. It should select all safety tables, sort detail records by dates, and build:

```ts
{
  yearlySummaries,
  monthlySummaries,
  incidentReports,
  certifications,
  performanceMetrics,
  manHours,
  monthlyManHours,
  weeklyActivities,
  kpis,
  charts,
  filterOptions,
  access
}
```

- [ ] **Step 3: Commit queries**

```bash
git add lib/safety-dashboard/queries.ts tests/safety-dashboard-aggregations.test.ts

git commit -m "feat(safety): add dashboard aggregations" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Add CRUD Server Actions

**Files:**
- Create: `app/dashboard/safety/actions.ts`

- [ ] **Step 1: Implement form helpers**

Add helpers `readString`, `readNumberString`, `readDateValue`, and `requireString` in `actions.ts`.

- [ ] **Step 2: Implement incident, certification, activity, performance, and manhours actions**

Export server actions named:

```ts
export async function manageSafetyIncidentReportAction(formData: FormData) {}
export async function manageSafetyCertificationAction(formData: FormData) {}
export async function manageSafetyWeeklyActivityAction(formData: FormData) {}
export async function manageSafetyPerformanceAction(formData: FormData) {}
export async function manageSafetyManHoursAction(formData: FormData) {}
export async function manageSafetyMonthlyManHoursAction(formData: FormData) {}
```

Each action supports `intent=create`, `intent=update`, and `intent=delete`, updates `updatedAt`, uses `sourceSheet='manual'` for new rows, and calls `revalidatePath('/dashboard/safety')`.

- [ ] **Step 3: Commit actions**

```bash
git add app/dashboard/safety/actions.ts

git commit -m "feat(safety): add CRUD server actions" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Add Safety Dashboard UI Components

**Files:**
- Create: `components/safety-dashboard/safety-dashboard-charts.tsx`
- Create: `components/safety-dashboard/safety-record-dialogs.tsx`

- [ ] **Step 1: Implement chart component**

Create client component `SafetyDashboardCharts` using Recharts `ResponsiveContainer`, `BarChart`, `LineChart`, `PieChart`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, `Bar`, `Line`, `Pie`, and `Cell`. Props are chart arrays from `getSafetyDashboardData()`.

- [ ] **Step 2: Implement record dialogs and row actions**

Create form components using `EnterpriseRecordDialog`, `EnterpriseFormGrid`, `EnterpriseActionButtons`, `Input`, `Textarea`, and `Button`. Export row action components for incident reports, certifications, weekly activities, performance, manhours, and monthly manhours.

- [ ] **Step 3: Commit components**

```bash
git add components/safety-dashboard

git commit -m "feat(safety): add dashboard UI components" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Build `/dashboard/safety` Page

**Files:**
- Create: `app/dashboard/safety/page.tsx`

- [ ] **Step 1: Implement server page**

Use `AdminPageShell`, `EnterpriseScorecards` or `AdminMetricGrid`, `SafetyDashboardCharts`, `Tabs`, `AdminTableCard`, `TableMultiFilter`, `TableFilterPresets`, and row action components. Create tabs: Incident Reports, Incident Summary, Certifications, Safety Performance, Man Hours, Weekly Activities.

- [ ] **Step 2: Ensure table standards**

Each table must pass `dateFilter`, `filters`, `scorecards` where relevant, `columnOptions`, `access`, and `rowAttributes` for filters/date filtering. Ensure evidence URLs are clickable links.

- [ ] **Step 3: Commit page**

```bash
git add app/dashboard/safety/page.tsx

git commit -m "feat(safety): add dashboard page" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Add Navigation Entry

**Files:**
- Inspect and modify the existing navigation seed/config source used by `/dashboard/layout.tsx`.

- [ ] **Step 1: Locate navigation source**

Run a code search for `/dashboard/hse` and add a neighboring item for `/dashboard/safety` with title `Safety Dashboard` and an appropriate icon.

- [ ] **Step 2: Commit navigation**

```bash
git add <modified-navigation-files>

git commit -m "feat(safety): add dashboard navigation" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Verify Import and App

**Files:**
- No new files unless fixing issues found during verification.

- [ ] **Step 1: Apply migrations**

Run: `npm run db:migrate`

Expected: migration applies successfully.

- [ ] **Step 2: Import workbook**

Run: `npm run db:import:safety-dashboard`

Expected: summary table shows inserted rows for all workbook sheets.

- [ ] **Step 3: Typecheck and lint**

Run:

```bash
npm run type-check
npm run lint
```

Expected: both pass.

- [ ] **Step 4: Manual route check**

Run app with `npm run dev`, open `/dashboard/safety`, and verify KPI cards, charts, tabs, filters, pagination, Excel export, and CRUD dialogs.

- [ ] **Step 5: Final commit if fixes were needed**

```bash
git add <fixed-files>

git commit -m "fix(safety): stabilize dashboard verification" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

- Spec coverage: The plan covers database tables, one-time workbook import, typed parsing, safety dashboard route, KPI/charts, six tabs, HERO reusable table/form standards, CRUD dialogs, RBAC access props, navigation, and verification.
- Scope: Scheduled Google Sheets sync, PDF/email automation, offline mode, and complex approval workflows remain explicitly outside this MVP.
- Placeholder scan: No `TBD`, `TODO`, or undefined open-ended tasks remain. The only adaptive step is navigation source discovery because this project has dynamic navigation configuration; it is bounded by the exact `/dashboard/hse` search and commit instruction.
- Type consistency: Table names, action names, page route, and import script names match across tasks.
