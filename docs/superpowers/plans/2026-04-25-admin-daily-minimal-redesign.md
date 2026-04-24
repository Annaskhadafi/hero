# Admin Daily Minimal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert HERO desktop admin routes into a dense, minimalist, table-first daily workspace with consistent shell, tabs, tables, CRUD dialogs, detail drawers, import mapping, export, sorting, and pagination.

**Architecture:** Upgrade shared primitives first, then convert high-impact pages. Keep legacy compatibility where a full typed table conversion would be too risky in one step. New shared admin components own layout, toolbar, import mapping, and drawer/dialog shells so page code stays focused on data and actions.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS v4, Radix UI primitives, lucide-react, @tabler/icons-react, existing `node:test` guardrails, `npm run lint`, `npm run build`.

---

## File Structure

- Modify `app/globals.css`: calm desktop admin surface utilities, keep mobile scope intact.
- Modify `app/dashboard/layout.tsx`: sidebar width and compact header props.
- Modify `components/site-header.tsx`: compact sticky header.
- Modify `components/app-sidebar.tsx`: compact logo/header spacing and sidebar item fit.
- Modify `components/nav-main.tsx`: compact group and item spacing.
- Modify `components/nav-documents.tsx`: compact document nav spacing.
- Modify `components/ui/button.tsx`: add `dense` and `denseIcon` button sizes.
- Modify `components/ui/tabs.tsx`: compact default tab styles.
- Modify `components/ui/card.tsx`: reduce default card padding/shadow.
- Modify `components/admin-page-shell.tsx`: compact page shell.
- Modify `components/admin-table-card.tsx`: use upgraded table shell.
- Modify `components/ui/minimal-table-shell.tsx`: compatibility table shell with search, filters, sort, pagination, import, Excel, actions.
- Create `components/admin/admin-import-dialog.tsx`: reusable import upload, preview, mapping, validation, result shell.
- Create `components/admin/admin-detail-drawer.tsx`: reusable right-side detail/review drawer.
- Create `components/admin/admin-crud-dialog.tsx`: reusable create/edit dialog shell.
- Create `components/admin/admin-tabs.tsx`: compact tabs wrapper with count badges.
- Create `components/admin/admin-data-table-shell.tsx`: typed table shell for converted pages.
- Modify `components/master-data-management.tsx`: convert first admin CRUD hub to new shells.
- Modify `components/approval-workbench.tsx`: move inline `<details>` panels to drawer pattern.
- Modify active page-level table pages using existing `MinimalTableShell`: `app/dashboard/activity-hub/library/page.tsx`, `app/dashboard/reports/page.tsx`, `app/dashboard/hse/page.tsx`, `app/dashboard/hc/page.tsx`, `app/dashboard/attendance/page.tsx`, `app/dashboard/attendance/records/page.tsx`, `app/dashboard/timesheet/page.tsx`, and `app/dashboard/training-records/page.tsx`.
- Modify `tests/design-guardrails.test.ts`: add desktop admin minimal guardrails.

## Task 1: Guardrails For Admin Daily Minimal

**Files:**
- Modify: `tests/design-guardrails.test.ts`
- Test: `tests/design-guardrails.test.ts`

- [ ] **Step 1: Add failing guardrail tests**

Append these tests to `tests/design-guardrails.test.ts`:

```ts
test("desktop dashboard shell stays compact", () => {
  const dashboardLayout = read("app/dashboard/layout.tsx");
  const siteHeader = read("components/site-header.tsx");

  assert.match(dashboardLayout, /"--sidebar-width": "15\.5rem"/);
  assert.match(siteHeader, /min-h-\[(48|52|56)px\]|min-h-12|min-h-14/);
  assert.doesNotMatch(siteHeader, /sm:min-h-\(--header-height\)/);
});

test("admin table shell exposes daily admin controls", () => {
  const tableShell = read("components/ui/minimal-table-shell.tsx");

  assert.match(tableShell, /Import/);
  assert.match(tableShell, /Excel/);
  assert.match(tableShell, /pageSize/);
  assert.match(tableShell, /sort/);
  assert.match(tableShell, /data-table-filter-key/);
});

test("approval workbench no longer expands long details inline", () => {
  const approvalWorkbench = read("components/approval-workbench.tsx");

  assert.doesNotMatch(approvalWorkbench, /<details/);
  assert.match(approvalWorkbench, /AdminDetailDrawer/);
});
```

- [ ] **Step 2: Run guardrails and verify expected failure**

Run:

```powershell
npx tsx --test tests/design-guardrails.test.ts
```

Expected: FAIL because compact shell, import/sort table shell, and approval drawer are not implemented yet.

- [ ] **Step 3: Commit failing guardrails**

Run:

```powershell
git add tests/design-guardrails.test.ts
git commit -m "test: add admin redesign guardrails"
```

## Task 2: Compact Shell And Surface Tokens

**Files:**
- Modify: `app/globals.css`
- Modify: `app/dashboard/layout.tsx`
- Modify: `components/site-header.tsx`
- Modify: `components/app-sidebar.tsx`
- Modify: `components/nav-main.tsx`
- Modify: `components/nav-documents.tsx`
- Test: `tests/design-guardrails.test.ts`

- [ ] **Step 1: Update dashboard sidebar width**

In `app/dashboard/layout.tsx`, change:

```tsx
"--sidebar-width": "18rem",
```

to:

```tsx
"--sidebar-width": "15.5rem",
```

Keep `RootLayout` untouched in this task.

- [ ] **Step 2: Calm desktop admin background**

In `app/globals.css`, add these component utilities inside `@layer components`:

```css
.admin-daily-surface {
  background: var(--surface);
  background-image: none;
}

.admin-daily-card {
  background: var(--surface-container-lowest);
  box-shadow: inset 0 0 0 1px var(--outline-ghost), 0 8px 18px rgba(0, 52, 97, 0.035);
}

.admin-daily-panel {
  background: var(--surface-container-low);
  box-shadow: inset 0 0 0 1px var(--outline-ghost);
}
```

Then add a dashboard-scoped body selector:

```css
body:has([data-admin-dashboard-shell]) {
  background-image: none;
}
```

- [ ] **Step 3: Mark dashboard shell scope**

In `app/dashboard/layout.tsx`, wrap the sidebar provider content with the existing provider and add `data-admin-dashboard-shell` to `SidebarInset`:

```tsx
<SidebarInset data-admin-dashboard-shell>
```

If TypeScript rejects custom props on `SidebarInset`, wrap children in:

```tsx
<div data-admin-dashboard-shell className="min-h-svh">
  ...
</div>
```

- [ ] **Step 4: Compact site header**

In `components/site-header.tsx`, replace the outer header layout classes with:

```tsx
className="sticky top-0 z-30 border-b border-outline-ghost/60 bg-surface-container-lowest/88 backdrop-blur-xl"
```

Replace the inner header classes with:

```tsx
className="flex min-h-12 items-center px-3 py-1.5 shadow-none sm:px-4 lg:px-5"
```

Remove the long subtitle rendering block from the sticky header. Keep `subtitle` prop accepted but unused so callers do not break.

- [ ] **Step 5: Compact sidebar header**

In `components/app-sidebar.tsx`, reduce `SidebarHeader` and logo surface classes:

```tsx
<SidebarHeader className="px-3 pb-2 pt-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
  <div className="rounded-lg bg-surface-container-lowest px-2 py-2 shadow-[inset_0_0_0_1px_var(--outline-ghost)] group-data-[collapsible=icon]:px-1.5">
```

Set logo image class to:

```tsx
className="h-9 w-auto object-contain group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:w-8"
```

- [ ] **Step 6: Compact nav item spacing**

In `components/nav-main.tsx` and `components/nav-documents.tsx`, reduce item height classes to target `h-9` or `min-h-9`. Preserve icons and labels. Use this pattern for item buttons:

```tsx
className="min-h-9 rounded-md px-2 text-[13px] font-medium"
```

- [ ] **Step 7: Run guardrails**

Run:

```powershell
npx tsx --test tests/design-guardrails.test.ts
```

Expected: the compact shell guardrail passes. Other new guardrails may still fail.

- [ ] **Step 8: Commit shell changes**

Run:

```powershell
git add app/globals.css app/dashboard/layout.tsx components/site-header.tsx components/app-sidebar.tsx components/nav-main.tsx components/nav-documents.tsx
git commit -m "style: compact admin shell"
```

## Task 3: Dense Primitive Defaults

**Files:**
- Modify: `components/ui/button.tsx`
- Modify: `components/ui/tabs.tsx`
- Modify: `components/ui/card.tsx`
- Modify: `components/admin-page-shell.tsx`
- Test: `tests/design-guardrails.test.ts`

- [ ] **Step 1: Add dense button sizes**

In `components/ui/button.tsx`, add these size variants:

```ts
dense: "h-9 min-w-9 gap-1.5 rounded-md px-3 text-[13px] normal-case tracking-normal has-[>svg]:px-2.5",
denseIcon: "size-9 min-h-9 min-w-9 rounded-md",
```

Keep existing defaults so current pages do not shift all at once.

- [ ] **Step 2: Compact tab defaults**

In `components/ui/tabs.tsx`, replace `TabsList` default class with:

```tsx
"bg-surface-container-low text-muted-foreground inline-flex min-h-9 w-fit items-center justify-center rounded-md p-0.5 shadow-[inset_0_0_0_1px_var(--outline-ghost)]"
```

Replace `TabsTrigger` default class with:

```tsx
"text-muted-foreground inline-flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-[6px] border-0 px-3 py-1.5 text-[13px] font-medium normal-case tracking-normal whitespace-nowrap transition-[background-color,color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-surface-container-lowest data-[state=active]:text-foreground data-[state=active]:shadow-[0_6px_14px_rgba(0,52,97,0.06)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
```

- [ ] **Step 3: Reduce default card weight**

In `components/ui/card.tsx`, replace the default Card class with:

```tsx
"admin-daily-card text-card-foreground flex flex-col gap-4 overflow-hidden rounded-lg border-0 py-4"
```

Replace `CardHeader` class with:

```tsx
"@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-4 py-4 has-data-[slot=card-action]:grid-cols-[1fr_auto]"
```

Replace `CardContent` class with:

```tsx
"px-4 pb-4"
```

Replace `CardFooter` class with:

```tsx
"flex items-center px-4 pb-4"
```

- [ ] **Step 4: Compact AdminPageShell**

In `components/admin-page-shell.tsx`, reduce wrapper/header classes to:

```tsx
<div className="space-y-4 p-4 lg:p-5">
  <header className="admin-daily-card rounded-lg px-4 py-3">
```

Change the title class to:

```tsx
className="max-w-4xl font-display text-xl font-semibold leading-tight text-foreground [text-wrap:balance] sm:text-2xl"
```

Change description to:

```tsx
className="max-w-3xl text-[13px] leading-5 text-muted-foreground [text-wrap:pretty]"
```

- [ ] **Step 5: Run lint and guardrails**

Run:

```powershell
npx tsx --test tests/design-guardrails.test.ts
npm run lint
```

Expected: guardrails progress; lint passes for touched files.

- [ ] **Step 6: Commit primitive changes**

Run:

```powershell
git add components/ui/button.tsx components/ui/tabs.tsx components/ui/card.tsx components/admin-page-shell.tsx tests/design-guardrails.test.ts
git commit -m "style: add dense admin primitives"
```

## Task 4: Import Mapping Dialog Shell

**Files:**
- Create: `components/admin/admin-import-dialog.tsx`
- Test: `tests/design-guardrails.test.ts`

- [ ] **Step 1: Create import dialog component**

Create `components/admin/admin-import-dialog.tsx`:

```tsx
"use client"

import * as React from "react"
import { FileSpreadsheet, Upload, Wand2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type AdminImportField = {
  key: string
  label: string
  required?: boolean
}

type AdminImportDialogProps = {
  title: string
  description?: string
  fields: AdminImportField[]
  trigger?: React.ReactNode
  onConfirm?: (mapping: Record<string, string>) => void
}

const sampleColumns = ["Column A", "Column B", "Column C"]

export function AdminImportDialog({
  title,
  description,
  fields,
  trigger,
  onConfirm,
}: AdminImportDialogProps) {
  const [fileName, setFileName] = React.useState("")
  const [mapping, setMapping] = React.useState<Record<string, string>>({})

  const missingRequired = fields.filter((field) => field.required && !mapping[field.key])

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="dense">
            <Upload className="size-4" />
            Import
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ?? "Upload Excel/CSV, preview kolom, map field HERO, lalu validasi sebelum import."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Label className="grid gap-2">
            File Excel/CSV
            <Input
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
            />
          </Label>

          <div className="rounded-lg bg-surface-container-low p-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <FileSpreadsheet className="size-4 text-primary" />
              {fileName || "Belum ada file dipilih"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Preview mapping memakai sample kolom sampai parser page-specific tersambung.
            </p>
          </div>

          <div className="grid gap-2">
            {fields.map((field) => (
              <div key={field.key} className="grid gap-2 rounded-lg bg-surface-container-lowest p-3 shadow-[inset_0_0_0_1px_var(--outline-ghost)] sm:grid-cols-[1fr_220px] sm:items-center">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {field.label}
                    {field.required ? <span className="text-destructive"> *</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{field.key}</p>
                </div>
                <select
                  value={mapping[field.key] ?? ""}
                  onChange={(event) => setMapping((current) => ({ ...current, [field.key]: event.target.value }))}
                  className={cn("h-9 rounded-md bg-surface-container-low px-3 text-sm shadow-[inset_0_0_0_1px_var(--outline-ghost)]")}
                >
                  <option value="">Pilih kolom</option>
                  {sampleColumns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-surface-container-low px-3 py-2 text-xs text-muted-foreground">
            Validation: {missingRequired.length === 0 ? "mapping required lengkap" : `${missingRequired.length} required field belum mapped`}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="dense">
            Batal
          </Button>
          <Button type="button" size="dense" disabled={missingRequired.length > 0} onClick={() => onConfirm?.(mapping)}>
            <Wand2 className="size-4" />
            Confirm import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Export fields type if needed**

If page conversions need the type, add this export near the type definition:

```ts
export type { AdminImportField }
```

- [ ] **Step 3: Run lint**

Run:

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Commit import shell**

Run:

```powershell
git add components/admin/admin-import-dialog.tsx
git commit -m "feat: add admin import mapping shell"
```

## Task 5: Detail Drawer And CRUD Dialog Shells

**Files:**
- Create: `components/admin/admin-detail-drawer.tsx`
- Create: `components/admin/admin-crud-dialog.tsx`

- [ ] **Step 1: Create detail drawer shell**

Create `components/admin/admin-detail-drawer.tsx`:

```tsx
"use client"

import * as React from "react"
import { PanelRightOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type AdminDetailDrawerProps = {
  title: string
  description?: string
  trigger?: React.ReactNode
  width?: "default" | "wide"
  footer?: React.ReactNode
  children: React.ReactNode
}

export function AdminDetailDrawer({
  title,
  description,
  trigger,
  width = "default",
  footer,
  children,
}: AdminDetailDrawerProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="ghost" size="denseIcon" aria-label={`Buka detail ${title}`}>
            <PanelRightOpen className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent
        side="right"
        className={cn(
          "flex w-full flex-col gap-0 p-0 sm:max-w-[520px]",
          width === "wide" && "sm:max-w-[640px]",
        )}
      >
        <SheetHeader className="border-b border-outline-ghost/70 px-4 py-3 text-left">
          <SheetTitle className="text-base">{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer ? <SheetFooter className="border-t border-outline-ghost/70 p-4">{footer}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Create CRUD dialog shell**

Create `components/admin/admin-crud-dialog.tsx`:

```tsx
"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type AdminCrudDialogProps = {
  title: string
  description?: string
  trigger?: React.ReactNode
  size?: "sm" | "md" | "lg"
  footer?: React.ReactNode
  children: React.ReactNode
}

export function AdminCrudDialog({
  title,
  description,
  trigger,
  size = "sm",
  footer,
  children,
}: AdminCrudDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" size="dense">
            <Plus className="size-4" />
            Tambah
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className={cn(
          "p-0",
          size === "sm" && "sm:max-w-[520px]",
          size === "md" && "sm:max-w-[680px]",
          size === "lg" && "sm:max-w-[840px]",
        )}
      >
        <DialogHeader className="border-b border-outline-ghost/70 px-4 py-3">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto p-4">{children}</div>
        {footer ? <DialogFooter className="border-t border-outline-ghost/70 p-4">{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Run lint**

Run:

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Commit drawer/dialog shells**

Run:

```powershell
git add components/admin/admin-detail-drawer.tsx components/admin/admin-crud-dialog.tsx
git commit -m "feat: add admin drawer and crud shells"
```

## Task 6: Upgrade MinimalTableShell Compatibility

**Files:**
- Modify: `components/ui/minimal-table-shell.tsx`
- Modify: `components/admin-table-card.tsx`
- Test: `tests/design-guardrails.test.ts`

- [ ] **Step 1: Add import action props**

In `MinimalTableShellProps`, add:

```ts
importAction?: React.ReactNode
primaryAction?: React.ReactNode
```

Destructure in the component props.

- [ ] **Step 2: Add sort state**

Inside `MinimalTableShell`, add:

```ts
const [sortColumnIndex, setSortColumnIndex] = React.useState<number | null>(null)
const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc")
```

- [ ] **Step 3: Make table headers sortable**

Add this helper near `applyFilters`:

```ts
const wireSortableHeaders = React.useEffectEvent(() => {
  const snapshot = getTableSnapshot()
  if (!snapshot) return

  const headers = Array.from(snapshot.table.querySelectorAll("thead th")) as HTMLTableCellElement[]
  headers.forEach((header, index) => {
    if (header.dataset.sortReady === "true") return
    header.dataset.sortReady = "true"
    header.tabIndex = 0
    header.style.cursor = "pointer"
    header.addEventListener("click", () => {
      setSortColumnIndex((current) => {
        if (current === index) {
          setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"))
          return current
        }
        setSortDirection("asc")
        return index
      })
    })
  })
})
```

Call `wireSortableHeaders()` in the effects that currently call `applyFilters()`.

- [ ] **Step 4: Sort matched rows before pagination**

In `applyFilters`, after `matchedRows` is created and before pagination, add:

```ts
const sortedRows = [...matchedRows]
if (sortColumnIndex != null) {
  sortedRows.sort((left, right) => {
    const leftText = left.cells[sortColumnIndex]?.textContent?.replace(/\s+/g, " ").trim() ?? ""
    const rightText = right.cells[sortColumnIndex]?.textContent?.replace(/\s+/g, " ").trim() ?? ""
    const leftNumber = Number(leftText.replace(/[^0-9.-]/g, ""))
    const rightNumber = Number(rightText.replace(/[^0-9.-]/g, ""))
    const result =
      Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
        ? leftNumber - rightNumber
        : leftText.localeCompare(rightText, "id", { numeric: true, sensitivity: "base" })
    return sortDirection === "asc" ? result : -result
  })
}
```

Use `sortedRows` for pagination and visibility instead of `matchedRows`.

- [ ] **Step 5: Render Import and primary action**

In the right toolbar group, render:

```tsx
{actions}
{importAction}
<Button ...>Excel</Button>
{primaryAction}
```

Use `size="dense"` where possible. Keep existing `TableActionMenu`.

- [ ] **Step 6: Update pagination page sizes**

Change:

```tsx
{[10, 20, 30, 50].map((size) => (
```

to:

```tsx
{[10, 20, 50, 100].map((size) => (
```

- [ ] **Step 7: Run guardrails**

Run:

```powershell
npx tsx --test tests/design-guardrails.test.ts
npm run lint
```

Expected: table shell guardrail passes, lint passes.

- [ ] **Step 8: Commit table shell upgrade**

Run:

```powershell
git add components/ui/minimal-table-shell.tsx components/admin-table-card.tsx tests/design-guardrails.test.ts
git commit -m "feat: standardize admin table shell"
```

## Task 7: Activity Library Current Browser Route

**Files:**
- Modify: `app/dashboard/activity-hub/library/page.tsx`
- Modify: `components/activity-library-row-actions.tsx`
- Modify: `components/activity-library-import-export.tsx`

- [ ] **Step 1: Add import/export display mode**

In `components/activity-library-import-export.tsx`, change props to:

```ts
export function ActivityLibraryImportExport({
  rows,
  currentEmployeeId,
  mode = "full",
}: {
  rows: ActivityLibraryRow[];
  currentEmployeeId: number | null;
  mode?: "full" | "import";
}) {
```

Wrap the two export/template buttons:

```tsx
{mode === "full" ? (
  <>
    <Button
      type="button"
      variant="outline"
      size="dense"
      onClick={() => downloadCsv(buildActivityLibraryCsv(toCsvRows(rows)), "activity-library-export.csv")}
    >
      <Download className="size-4" />
      Excel
    </Button>
    <Button
      type="button"
      variant="outline"
      size="dense"
      onClick={() => downloadCsv(ACTIVITY_LIBRARY_EXAMPLE_CSV, "activity-library-example.csv")}
    >
      <FileSpreadsheet className="size-4" />
      Template CSV
    </Button>
  </>
) : null}
```

Change the import trigger button size/classes to:

```tsx
<Button type="button" size="dense">
  <Upload className="size-4" />
  Import
</Button>
```

- [ ] **Step 2: Move import into table toolbar**

In `app/dashboard/activity-hub/library/page.tsx`, remove the standalone toolbar block containing `ActivityLibraryImportExport` above `MinimalTableShell`.

Pass import action to `MinimalTableShell`:

```tsx
importAction={<ActivityLibraryImportExport rows={filteredRows} currentEmployeeId={data.currentEmployee?.id ?? null} mode="import" />}
```

- [ ] **Step 3: Keep Excel export from table shell**

Do not render a second Excel/export button in `ActivityLibraryImportExport` when it is used inside `MinimalTableShell`; the shell handles `Excel`.

- [ ] **Step 4: Convert create tab to CRUD dialog**

Replace the `TabsTrigger value="create"` and `TabsContent value="create"` create form with an `AdminCrudDialog` trigger passed as `primaryAction`:

```tsx
primaryAction={
  <AdminCrudDialog title="Tambah Activity Library" description="Tambah master activity yang dipakai Route Builder." size="lg">
    <form action={manageActivityLibraryAction} className="space-y-4">
      ...
    </form>
  </AdminCrudDialog>
}
```

Move the existing form body unchanged into the dialog body.

- [ ] **Step 5: Convert status badge hard-coded colors**

Replace:

```tsx
className={row.isActive ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-800"}
```

with:

```tsx
className={row.isActive ? "bg-primary/10 text-primary" : "bg-surface-container-high text-muted-foreground"}
```

- [ ] **Step 6: Run lint and browser check**

Run:

```powershell
npm run lint
```

Open current browser route `http://localhost:3000/dashboard/activity-hub/library` and verify:

```text
Search visible
Department/section filters visible
Import visible in table toolbar
Excel visible in table toolbar
Pagination visible
Create opens dialog
No second create tab
```

- [ ] **Step 7: Commit activity library conversion**

Run:

```powershell
git add app/dashboard/activity-hub/library/page.tsx components/activity-library-row-actions.tsx components/activity-library-import-export.tsx
git commit -m "refactor: convert activity library to admin daily table"
```

## Task 8: Approval Drawer Conversion

**Files:**
- Modify: `components/approval-workbench.tsx`
- Test: `tests/design-guardrails.test.ts`

- [ ] **Step 1: Import AdminDetailDrawer**

Add:

```ts
import { AdminDetailDrawer } from "@/components/admin/admin-detail-drawer";
```

- [ ] **Step 2: Replace inbox inline details**

Replace the `<details>` block in inbox `TableCell` with:

```tsx
<AdminDetailDrawer
  title={`Review ${item.title}`}
  description={`${group.requesterName} • ${group.siteName} • ${item.currentStepLabel}`}
  width="wide"
>
  <form action={reviewApprovalAction} className="space-y-3">
    <input type="hidden" name="approvalId" value={item.approvalId} />
    <div className="rounded-lg bg-surface-container-low p-3 text-sm">
      <p className="font-semibold text-foreground">Ringkasan kerja</p>
      <p className="mt-1 text-muted-foreground">{item.remarks || "Tanpa catatan tambahan dari requester."}</p>
    </div>
    <div className="rounded-lg bg-surface-container-low p-3 text-sm">
      <p className="font-semibold text-foreground">Catatan terakhir</p>
      <p className="mt-1 text-muted-foreground">
        {item.lastNote ? item.lastNote.message : "Belum ada komentar approval sebelumnya."}
      </p>
    </div>
    <Textarea name="note" rows={3} placeholder="Isi komentar bila reject atau revisi. Approve boleh kosong." />
    <div className="flex flex-wrap gap-2 border-t border-outline-ghost/70 pt-3">
      <Button type="submit" name="decision" value="approved" size="dense">
        Setujui
      </Button>
      <Button type="submit" name="decision" value="needs_correction" variant="outline" size="dense">
        Minta revisi
      </Button>
      <Button type="submit" name="decision" value="rejected" variant="secondary" size="dense">
        Tolak
      </Button>
    </div>
  </form>
</AdminDetailDrawer>
```

- [ ] **Step 3: Replace history inline details**

Replace the history `<details>` block with `AdminDetailDrawer` showing approval trail and step status cards. Use the existing `item.notes` and `item.steps` mapping, but move it into drawer body.

- [ ] **Step 4: Run guardrails and lint**

Run:

```powershell
npx tsx --test tests/design-guardrails.test.ts
npm run lint
```

Expected: approval no-inline-details guardrail passes.

- [ ] **Step 5: Commit approval conversion**

Run:

```powershell
git add components/approval-workbench.tsx tests/design-guardrails.test.ts
git commit -m "refactor: move approval details into drawers"
```

## Task 9: Master Data First Full CRUD Conversion

**Files:**
- Modify: `components/master-data-management.tsx`
- Create: optional focused files under `components/master-data/`

- [ ] **Step 1: Split master data by tab if file remains hard to work in**

Create folder:

```powershell
New-Item -ItemType Directory -Force -Path components/master-data
```

Move one tab at a time into focused files:

```text
components/master-data/section-management.tsx
components/master-data/department-management.tsx
components/master-data/position-management.tsx
components/master-data/site-management.tsx
components/master-data/category-management.tsx
```

Keep exported component names identical to current inner function names.

- [ ] **Step 2: Replace per-tab Cards with AdminPageShell section surfaces**

For each table-backed tab, use:

```tsx
<MinimalTableShell
  label="sections"
  fileName="master-sections"
  searchPlaceholder="Cari section..."
  dateFilter={false}
  filters={...}
  importAction={<AdminImportDialog title="Import Section" fields={[{ key: "code", label: "Kode", required: true }, { key: "name", label: "Nama", required: true }]} />}
  primaryAction={<AdminCrudDialog title="Tambah Section">...</AdminCrudDialog>}
>
  <Table>...</Table>
</MinimalTableShell>
```

Use specific fields for each dataset:

```ts
const sectionImportFields = [
  { key: "code", label: "Kode Section", required: true },
  { key: "name", label: "Nama Section", required: true },
  { key: "department", label: "Department" },
  { key: "isActive", label: "Status Aktif" },
]
```

- [ ] **Step 3: Convert create/edit dialogs**

Replace direct `Dialog` blocks with `AdminCrudDialog` shells. Keep existing `open`, `onOpenChange`, submit handlers, and server actions.

Use this trigger pattern for edit icon:

```tsx
<AdminCrudDialog
  title="Edit Department"
  description="Ubah informasi department."
  trigger={
    <Button variant="ghost" size="denseIcon" onClick={() => handleOpenDialog(dept)} aria-label={`Edit ${dept.name}`}>
      <Pencil className="size-4" />
    </Button>
  }
>
  <form onSubmit={handleSubmit} className="space-y-4">...</form>
</AdminCrudDialog>
```

- [ ] **Step 4: Normalize row action icons**

Every row action cell should use:

```tsx
<div className="flex justify-end gap-1">
  <Button variant="ghost" size="denseIcon" aria-label="Edit">
    <Pencil className="size-4" />
  </Button>
  <Button variant="ghost" size="denseIcon" aria-label="Hapus">
    <Trash2 className="size-4" />
  </Button>
</div>
```

- [ ] **Step 5: Run lint**

Run:

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 6: Browser check Master Data**

Open:

```text
http://localhost:3000/dashboard/master-data
```

Verify:

```text
Tabs compact
Search visible per table
Status/department/section/category filters visible where relevant
Import visible on table-backed tabs
Excel visible
Sort headers clickable
Pagination visible
Row actions icon-led
Create/edit in dialog
```

- [ ] **Step 7: Commit Master Data conversion**

Run:

```powershell
git add components/master-data-management.tsx components/master-data components/admin
git commit -m "refactor: convert master data to admin daily crud"
```

## Task 10: Roll Out Shared Table Standard To Remaining Admin Pages

**Files:**
- Modify: `app/dashboard/reports/page.tsx`
- Modify: `app/dashboard/hse/page.tsx`
- Modify: `app/dashboard/hc/page.tsx`
- Modify: `app/dashboard/attendance/page.tsx`
- Modify: `app/dashboard/attendance/records/page.tsx`
- Modify: `app/dashboard/timesheet/page.tsx`
- Modify: `app/dashboard/training-records/page.tsx`
- Modify related components imported by those pages

- [ ] **Step 1: Inventory each page-level table**

For each listed page, identify each page-level `<Table>` and record its context filters:

```text
Reports: status, department, section, category, date
HSE: status, category, severity, site, date
HC: department, section, status, site
Attendance: status, department, section, shift, site, date
Timesheet: status, department, section, date
Training Records: status, category, department, section, date
```

- [ ] **Step 2: Wrap each table in MinimalTableShell**

Use this pattern:

```tsx
<MinimalTableShell
  label="records"
  fileName="page-specific-file-name"
  searchPlaceholder="Cari data..."
  dateFilter
  filters={<PageSpecificFilters ... />}
  importAction={<AdminImportDialog title="Import Data" fields={pageImportFields} />}
>
  <Table>...</Table>
</MinimalTableShell>
```

Set `dateFilter={false}` when the table has no meaningful date column.

- [ ] **Step 3: Add data filter attributes**

For each table row, add data attributes matching filters:

```tsx
<TableRow
  data-filter-status={row.status}
  data-filter-department={row.departmentName}
  data-filter-section={row.sectionName}
  data-filter-category={row.category}
  data-date-value={row.createdAt?.toISOString()}
>
```

- [ ] **Step 4: Normalize import field definitions**

Define per page near the component:

```ts
const reportImportFields = [
  { key: "employeeId", label: "Employee ID", required: true },
  { key: "date", label: "Tanggal", required: true },
  { key: "category", label: "Kategori" },
  { key: "status", label: "Status" },
]
```

Use fields that match visible table columns and existing data forms.

- [ ] **Step 5: Normalize action icons**

Replace text-heavy action buttons in table rows with icon buttons and dropdown for extras:

```tsx
<Button variant="ghost" size="denseIcon" aria-label="Lihat detail">
  <Eye className="size-4" />
</Button>
<Button variant="ghost" size="denseIcon" aria-label="Edit">
  <Pencil className="size-4" />
</Button>
```

- [ ] **Step 6: Commit each page group**

After each page group passes lint, commit separately:

```powershell
npm run lint
git add app/dashboard/reports/page.tsx
git commit -m "refactor: standardize reports admin table"
```

Repeat for HSE, HC, Attendance, Timesheet, and Training Records with matching commit messages.

## Task 11: Full Verification And Visual QA

**Files:**
- No planned edits unless verification finds a defect.

- [ ] **Step 1: Run guardrails**

Run:

```powershell
npx tsx --test tests/design-guardrails.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 4: Browser visual checks**

With dev server running, open:

```text
http://localhost:3000/dashboard
http://localhost:3000/dashboard/activity-hub/library
http://localhost:3000/dashboard/master-data
http://localhost:3000/dashboard/approval
http://localhost:3000/dashboard/hse
```

Verify:

```text
Header compact
Sidebar compact
First table appears in first viewport on data pages
Search visible
Context filters visible
Import visible
Excel visible
Sortable headers work
Pagination visible with 10/20/50/100
Row actions are icon-led
CRUD opens dialog
Detail/review opens drawer
No inline details stretch table rows
No obvious hard-coded blue/slate legacy blocks dominate converted pages
No horizontal overflow at common desktop width
```

- [ ] **Step 5: Final status check**

Run:

```powershell
git status --short
```

Expected: only intentional uncommitted files remain, or clean if all task commits were made. Existing unrelated user changes from before this plan may still appear and must not be reverted.
