# HERO Admin Daily Minimal Redesign

Date: 2026-04-25
Scope: desktop admin routes only (`/dashboard/*`)
Status: approved design, pending implementation plan

## Goal

Redesign the desktop admin experience into a dense, clean, daily-use workspace. Admin users should open a page and immediately see the table, filters, CRUD actions, import/export, and detail preview without scrolling through decorative dashboard surfaces.

The redesign must preserve HERO's operational identity from `documentation/Design.md`, but reduce visual weight. The final direction is Admin Daily Minimal: table-first, compact shell, consistent CRUD dialogs, right-side detail drawers, compact tabs, and universal table controls.

## Non-Goals

- Do not redesign `/mobile/*`.
- Do not redesign auth/public/offline pages in this pass.
- Do not change database schema or data access behavior for visual work unless a later implementation plan explicitly requires it.
- Do not replace business logic. Refactor UI surfaces around existing workflows.

## Design Principles

- Table-first over dashboard-first for admin workflows.
- Dense but readable: compact spacing, consistent row height, predictable toolbar order.
- Minimal visual energy: use whitespace, subtle surface contrast, and ghost outlines instead of heavy gradients, borders, or nested cards.
- One primary workspace per tab.
- CRUD happens in modal/dialog layers. Detail and review happen in right-side drawers.
- All page-level tables must share search, contextual filtering, sorting, pagination, import, export, and icon-led actions.

## Shell Layout

The dashboard shell becomes compact.

- Sidebar width changes from `18rem` to about `15.5rem`.
- Sidebar items target `36px` to `40px` height.
- Sidebar grouping stays, but spacing and headers become smaller.
- Header becomes `48px` to `56px` high.
- Header keeps only global context and utility actions such as theme, notification, and sidebar trigger.
- Long global subtitle is removed from the sticky header and belongs in page shell when needed.
- Page content padding targets `16px` on desktop and `20px` on wider screens.
- Page title row is compact with title, short description, optional badge/KPI chips, and right-aligned page actions.

The first viewport should show the page title and the beginning of the primary table or tabbed workspace.

## Visual System

Use the existing HERO tokens, but calm their application.

- Global admin background should be plain `surface` or very subtle `surface_container_low`.
- Reduce atmospheric radial backgrounds on desktop admin.
- Cards/modules use `surface_container_lowest`, radius `8px`, and soft ghost outline or very light shadow.
- Avoid nested cards except for repeated record cards, dialog interiors, or drawer sections.
- Use primary gradient only for the most important command action.
- Keep text in `on_surface`/foreground colors, not hard-coded slate.
- Replace hard-coded blue/green/yellow badge colors with token-aware status variants.

## Universal Admin Table Standard

Every page-level admin data table must follow the same shell and toolbar pattern.

Toolbar order:

```text
Search | Context filters | Sort/Columns/Menu | Import | Excel | Primary action
```

Required table features:

- Search for quick text filtering.
- Contextual filters when relevant:
  - status
  - department
  - section
  - category
  - site/location
  - priority
  - user/assignee
  - date range only when the dataset has meaningful date/time context
- Header sorting with ascending/descending state.
- Pagination for all page-level tables.
- Page size options: `10`, `20`, `50`, `100`.
- Import button.
- Export button labeled `Excel`.
- Row actions as icons.
- Extra row actions in a dropdown menu.
- Active filter summary with clear/reset behavior.
- Empty state and no-result state handled separately.

Bulk selection is optional and should only appear when the workflow needs it, such as mass approval, activation/deactivation, or import cleanup.

Column management is optional and should only appear for wide or complex tables.

## Import Mapping Flow

All page-level admin tables need a standard import pattern. The import may initially be wired as a shared shell with page-specific handlers added incrementally.

Flow:

```text
Import
-> Upload Excel/CSV
-> Preview first rows
-> Map source columns to HERO fields
-> Validate required fields and row errors
-> Confirm import
-> Show success/error report
```

Import dialog states:

- Upload: select or drop file.
- Preview: show file name, row count, and sample rows.
- Mapping: choose HERO field for each source column.
- Validation: show missing required fields, duplicate keys, and invalid values.
- Result: show imported count, skipped count, and downloadable error report if available.

## Table Visual Detail

- Toolbar controls target `34px` to `36px` height.
- Search width targets `220px` to `260px` on desktop.
- Table header uses `surface_container_low`, small uppercase labels, and sticky behavior where helpful.
- Row height targets `44px` to `52px`.
- Cell padding targets `10px` to `12px`.
- Separators use ghost color only.
- Hover uses a calm tonal shift.
- Status badges use compact `6px` radius and token-based colors.
- Dates, numbers, and counts use `tabular-nums`.
- Row action buttons are `32px` icon buttons with tooltips or accessible labels.

## CRUD Dialogs

Create and update workflows use dialogs by default.

Dialog sizing:

- Simple form: about `520px`.
- Medium form: about `680px`.
- Complex form: about `840px`.

Dialog structure:

```text
Header: title + one-line description
Body: dense fields, grouped by meaning
Footer: cancel/secondary + primary save action
```

Rules:

- Use one column by default.
- Use two columns only for short fields such as code, level, status, time, or sort order.
- Keep validation text small and close to the field.
- Keep footer actions stable and easy to reach.
- Delete confirmation uses alert dialog with clear destructive wording.

## Detail And Review Drawers

Read previews, approval review, and long record details move out of table rows into right-side drawers.

Drawer structure:

```text
Header:
  title, status, key metadata

Body:
  overview facts
  timeline or approval trail
  related records / attachments
  decision form if actionable

Footer:
  primary and secondary actions
```

Width targets:

- Standard detail: `420px` to `520px`.
- Complex approval/detail: about `640px`.

The drawer can include edit actions, but full create/update forms should stay in dialogs unless the record is very simple.

## Tabs

Tabs organize related features without side-by-side list clutter.

- Page-level tabs are compact and horizontal.
- Tabs list height targets `36px` to `40px`.
- Tabs may overflow horizontally for many categories.
- Count badges are small and neutral.
- Related lists/tables become sibling tabs.
- Nested tabs are allowed only when needed, such as category type groups, and should be visually lighter than parent tabs.

## Component Architecture

Implementation should introduce or upgrade these shared components:

- `AdminPageShell`
  - compact title row, optional KPI chips, page actions
- `AdminDataTableShell`
  - search, contextual filters, sort, pagination, import/export slots, summary, empty states
- `AdminTableToolbar`
  - consistent toolbar layout
- `AdminTableFilter`
  - reusable filter controls for status, department, section, category, site, priority, date
- `AdminImportDialog`
  - upload, preview, mapping, validation, result
- `AdminDetailDrawer`
  - reusable right-side preview/review detail
- `AdminCrudDialog`
  - reusable create/edit shell
- `AdminTabs`
  - compact tab list with count badge support

Prefer upgrading existing components such as `MinimalTableShell`, `AdminTableCard`, and `AdminPageShell` where possible instead of creating duplicate primitives.

## Rollout Order

1. Update global desktop admin visual tokens and reduce background visual weight.
2. Compact dashboard layout, header, sidebar, and page shell.
3. Upgrade shared card/table primitives.
4. Implement universal table shell with search, contextual filters, sort, pagination, import, export, and icon actions.
5. Add standard import mapping dialog shell.
6. Add standard CRUD dialog and detail drawer shells.
7. Apply to high-impact admin pages first:
   - Master Data
   - Approval
   - Reports
   - HSE
   - HC
   - Attendance
   - Timesheet
   - Training Records
8. Replace hard-coded colors and legacy border-heavy surfaces on touched pages.

## Page-Specific Notes

### Master Data

Master Data is the first full conversion target because it has many tabs, CRUD forms, and table variants.

- Use compact page shell.
- Keep master categories, sections, departments, positions, sites, shifts, org structures, approval matrices, and route simulation as tabs.
- Convert each list to the universal table shell.
- Move create/update to `AdminCrudDialog`.
- Add import mapping entry point for table-backed master datasets.
- Keep route simulation as focused tool content, not a table import target.

### Approval

Approval is a second target because it currently contains inline details.

- Keep inbox/history tabs.
- Keep table-first layout.
- Replace inline `<details>` review panels with `AdminDetailDrawer`.
- Decision form lives inside drawer footer/body.
- Bulk approve can remain only where group approval is meaningful.

### Reports, HSE, HC, Attendance, Timesheet, Training

These pages should adopt the same table toolbar, contextual filters, import/export, sorting, pagination, and icon action standard. Existing business-specific forms and charts should remain, but they should not push the primary table below decorative cards.

## Verification

Implementation must be verified with:

- `npm run lint`
- `npm run build`
- Browser visual checks on desktop for:
  - `/dashboard`
  - `/dashboard/master-data`
  - `/dashboard/approval`
  - `/dashboard/hse`

Visual checks must confirm:

- Header remains compact.
- Sidebar does not crowd content.
- Toolbar wraps cleanly at common desktop widths.
- Tables are readable and sortable.
- Pagination and page size controls are visible.
- Import and Excel actions are present on page-level tables.
- Row actions are icon-led.
- Detail/review drawer does not widen table rows.
- No hard-coded legacy blue/slate surfaces dominate converted pages.

## Implementation Decisions

- Use typed data/column API for new major conversions, while keeping a compatibility path for existing tables.
- Build the import mapping shell first, then wire handlers incrementally by rollout page.
- Split very large admin components when touching them, especially Master Data.
- Keep DOM-based filtering/export compatibility only for legacy tables not yet converted.
