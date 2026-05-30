# Safety Dashboard Split Data Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split Safety into a clean dashboard overview at `/dashboard/safety` and a full form/table/import management page at `/dashboard/safety/data` where every safety dataset has add/edit/delete forms and import support.

**Architecture:** Keep existing query/actions/components, add missing CRUD support for yearly/monthly incident summaries, refactor table markup into a reusable management component, and make `/dashboard/safety` dashboard-only. The data management page uses HERO reusable table standards (`AdminTableCard`, `TableMultiFilter`, `AdminImportDialog`, row actions, scorecards, pagination/export/column visibility via shell).

**Tech Stack:** Next.js App Router, React, TypeScript, Drizzle ORM, existing HERO admin UI components, existing Safety Dashboard database tables.

---

## File Structure

- Modify `app/dashboard/safety/actions.ts` — add CRUD server actions for yearly and monthly incident summaries and revalidate both safety routes.
- Modify `components/safety-dashboard/safety-record-dialogs.tsx` — add add/edit/delete dialogs for all eight datasets, including summary tables, and add reusable create buttons.
- Create `components/safety-dashboard/safety-data-management.tsx` — render all eight table tabs with forms/import enabled.
- Modify `app/dashboard/safety/page.tsx` — remove table tabs; keep KPI/charts and add CTA to `/dashboard/safety/data`.
- Create `app/dashboard/safety/data/page.tsx` — data-management route using `SafetyDataManagement`.
- Modify `lib/hero-admin.ts` — add navigation entry for Safety Data Management.

---

### Task 1: Add Summary CRUD Actions

**Files:**
- Modify: `app/dashboard/safety/actions.ts`

- [ ] **Step 1: Import summary tables**

Add `safetyIncidentSummaryYearly` and `safetyIncidentSummaryMonthly` to the existing import from `@/db/schema/hero`.

- [ ] **Step 2: Revalidate both safety routes**

Change `success()` to call:

```ts
revalidatePath("/dashboard/safety")
revalidatePath("/dashboard/safety/data")
```

- [ ] **Step 3: Add yearly summary action**

Add:

```ts
export async function manageSafetyIncidentSummaryYearlyAction(formData: FormData): Promise<MutationState> {
  try {
    const intent = readString(formData, "intent")
    if (intent === "delete") {
      await db.delete(safetyIncidentSummaryYearly).where(eq(safetyIncidentSummaryYearly.id, readId(formData)))
      return success("Rekap incident tahunan dihapus.")
    }

    const values = {
      year: Number(readNumberString(formData, "year")) || new Date().getFullYear(),
      fatality: Number(readNumberString(formData, "fatality")),
      lostDayInjury: Number(readNumberString(formData, "lostDayInjury")),
      restrictedWorkDayInjury: Number(readNumberString(formData, "restrictedWorkDayInjury")),
      medicalTreatmentCase: Number(readNumberString(formData, "medicalTreatmentCase")),
      firstAid: Number(readNumberString(formData, "firstAid")),
      propertyDamage: Number(readNumberString(formData, "propertyDamage")),
      nearMissReport: Number(readNumberString(formData, "nearMissReport")),
      environmental: Number(readNumberString(formData, "environmental")),
      fatigue: Number(readNumberString(formData, "fatigue")),
      totalEvents: Number(readNumberString(formData, "totalEvents")),
      updatedAt: new Date(),
    }

    if (intent === "update") {
      await db.update(safetyIncidentSummaryYearly).set(values).where(eq(safetyIncidentSummaryYearly.id, readId(formData)))
      return success("Rekap incident tahunan diperbarui.")
    }

    await db.insert(safetyIncidentSummaryYearly).values({ ...values, sourceSheet: "manual" })
    return success("Rekap incident tahunan ditambahkan.")
  } catch (error) {
    return failure(error)
  }
}
```

- [ ] **Step 4: Add monthly summary action**

Add equivalent `manageSafetyIncidentSummaryMonthlyAction` with fields `month`, `fatality`, `lostDayInjury`, `restrictedWorkDayInjury`, `medicalTreatmentCase`, `firstAid`, `propertyDamage`, `nearMissReport`, `environmental`, `totalEvents`.

- [ ] **Step 5: Verify**

Run: `npm run type-check`

Expected: PASS.

---

### Task 2: Add Forms for All Datasets

**Files:**
- Modify: `components/safety-dashboard/safety-record-dialogs.tsx`

- [ ] **Step 1: Add row types for summary tables**

Add `YearlySummaryRow` and `MonthlySummaryRow` types matching DB query rows.

- [ ] **Step 2: Add reusable create trigger pattern**

Export create button components:

```ts
export function CreateIncidentReportButton({ access }: { access: TableRbacAccess }) { ... }
export function CreateYearlySummaryButton({ access }: { access: TableRbacAccess }) { ... }
export function CreateMonthlySummaryButton({ access }: { access: TableRbacAccess }) { ... }
export function CreateCertificationButton({ access }: { access: TableRbacAccess }) { ... }
export function CreatePerformanceButton({ access }: { access: TableRbacAccess }) { ... }
export function CreateManHoursButton({ access }: { access: TableRbacAccess }) { ... }
export function CreateMonthlyManHoursButton({ access }: { access: TableRbacAccess }) { ... }
export function CreateWeeklyActivityButton({ access }: { access: TableRbacAccess }) { ... }
```

Each opens `EnterpriseRecordDialog` in `form` mode and submits `intent=create` to its server action.

- [ ] **Step 3: Add yearly/monthly row actions**

Export `YearlySummaryRowActions` and `MonthlySummaryRowActions` with view/edit/delete using `EnterpriseActionButtons`.

- [ ] **Step 4: Ensure existing row actions support view mode and edit mode**

For existing row actions, view mode remains read-only-like display; edit mode shows submit button; delete mode confirms delete.

- [ ] **Step 5: Verify**

Run: `npm run type-check`

Expected: PASS.

---

### Task 3: Create Safety Data Management Component and Route

**Files:**
- Create: `components/safety-dashboard/safety-data-management.tsx`
- Create: `app/dashboard/safety/data/page.tsx`

- [ ] **Step 1: Move all table tabs into `SafetyDataManagement`**

Create a client/server-compatible component that accepts `data` from `getSafetyDashboardData()` and renders tabs for:

1. Incident Reports
2. Incident Yearly Summary
3. Incident Monthly Summary
4. Certifications
5. Safety Performance
6. Safety Man Hours
7. Monthly Safety Man Hours
8. Weekly Activities

- [ ] **Step 2: Enable form and import on every table**

For every `AdminTableCard`:

- `showImport` must be omitted or `true`.
- `actions` must include the matching create button.
- `access={data.access}`.
- `filters`, `scorecards`, `rowAttributes`, pagination/export/column visibility inherited from `AdminTableCard`/`MinimalTableShell`.

- [ ] **Step 3: Create `/dashboard/safety/data/page.tsx`**

Server page:

```tsx
import { AdminPageShell } from "@/components/admin-page-shell"
import { SafetyDataManagement } from "@/components/safety-dashboard/safety-data-management"
import { getSafetyDashboardData } from "@/lib/safety-dashboard/queries"

export default async function SafetyDataPage() {
  const data = await getSafetyDashboardData()
  return (
    <AdminPageShell eyebrow="Safety Data" title="Safety Data Management" description="Form, import, table, filter, export, dan CRUD semua data safety.">
      <SafetyDataManagement data={data} />
    </AdminPageShell>
  )
}
```

- [ ] **Step 4: Verify**

Run: `npm run type-check`

Expected: PASS.

---

### Task 4: Make Dashboard Overview-Only

**Files:**
- Modify: `app/dashboard/safety/page.tsx`

- [ ] **Step 1: Remove table imports and tab table markup**

Remove `AdminTableCard`, `Tabs`, `TableMultiFilter`, table row action imports, and all table tabs from `/dashboard/safety/page.tsx`.

- [ ] **Step 2: Add CTA to data page**

Add a button/link near top:

```tsx
<Link href="/dashboard/safety/data">Kelola Data Safety</Link>
```

Use existing `Button` styling.

- [ ] **Step 3: Verify**

Run: `npm run type-check`

Expected: PASS.

---

### Task 5: Add Navigation and Verify

**Files:**
- Modify: `lib/hero-admin.ts`

- [ ] **Step 1: Add navigation item**

Under section `HSE`, ensure two items exist:

- `Safety Dashboard` → `/dashboard/safety`, resource `safety_dashboard`, sortOrder `2`
- `Safety Data Management` → `/dashboard/safety/data`, resource `safety_data_management`, sortOrder `3`

- [ ] **Step 2: Run verification**

Run:

```bash
npm run type-check
npm run lint
```

Expected: both PASS.

- [ ] **Step 3: Commit revision**

```bash
git add app/dashboard/safety/actions.ts components/safety-dashboard/safety-record-dialogs.tsx components/safety-dashboard/safety-data-management.tsx app/dashboard/safety/page.tsx app/dashboard/safety/data/page.tsx lib/hero-admin.ts docs/superpowers/plans/2026-05-30-safety-dashboard-split-data-management.md

git commit -m "feat(safety): split dashboard and data management" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

- Spec coverage: The plan splits dashboard and form/table pages, adds forms for all eight datasets, enables import support on every management table, and updates navigation.
- Placeholder scan: No placeholder/TBD remains.
- Type consistency: Route names, action names, table names, and component names are consistent.
