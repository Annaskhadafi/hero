# Safety Dashboard Design

Date: 2026-05-30
Status: Approved for implementation planning
Source PRD: `PRD_Safety_Dashboard_v1.0.md`
Source workbook: `SAFETY DASHBOARD V2.xlsx`

## Goal

Implement a full MVP Safety Dashboard in HERO that migrates the existing Google Sheets workbook into the application database once, then manages safety data fully inside HERO. The implementation is Excel-first and PRD-aligned: it preserves the real workbook datasets while introducing CRUD forms, dashboard KPIs, filters, exports, and extensible PRD form patterns.

## Scope

Create a new dedicated module at `/dashboard/safety`, separate from the existing `/dashboard/hse` emergency/mobile HSE module. The module covers:

- Safety overview dashboard with KPI cards and charts.
- Incident detail management.
- Incident monthly and yearly summary.
- Safety certification monitoring.
- Safety performance threshold-vs-actual metrics.
- Safety man hours cumulative and monthly trend.
- Weekly safety activities with evidence links.
- One-time Excel import from `SAFETY DASHBOARD V2.xlsx` into database tables.
- Table search, filters, pagination, Excel export, import UI, scorecards, column visibility, and RBAC-aware row actions using HERO reusable table/form components.

Out of first implementation scope:

- Scheduled sync back to Google Sheets.
- Automated PDF/email reporting.
- Offline mode.
- Complex approval workflows for corrective actions.

These can be added after the full MVP is stable.

## Architecture

The module uses the existing Next.js App Router, Drizzle ORM, server actions, and reusable HERO admin UI components.

Data flow:

1. `SAFETY DASHBOARD V2.xlsx` is exported from the existing Google Sheet.
2. `scripts/import-safety-dashboard.ts` reads and validates workbook sheets.
3. The importer replaces prior workbook-imported safety rows in typed safety tables.
4. `/dashboard/safety` queries database data server-side.
5. Client UI renders KPI cards, charts, and tabs.
6. CRUD dialogs submit server actions to insert/update/delete records.
7. Server actions revalidate `/dashboard/safety`.

The existing `/dashboard/hse` module remains independent to avoid disrupting current mobile/emergency HSE flows.

## Database Model and Workbook Mapping

Each workbook sheet maps to a typed database table.

| Workbook sheet | Database table | Purpose |
|---|---|---|
| `INCIDENT RECORD` | `safety_incident_summary_yearly` | Yearly incident counts by category |
| `Incedent Record` | `safety_incident_summary_monthly` | Monthly incident counts by category |
| `Detail Incident Report` | `safety_incident_reports` | Individual incident records |
| `Sertifikasi Safety` | `safety_certifications` | Equipment certification and expiry monitoring |
| `Safety Performance 2025` | `safety_performance_metrics` | Site performance, thresholds, actuals, safe manhours |
| `Safety Man Hours` | `safety_man_hours` | Cumulative safe manhours per work location |
| `Fix Month Safety man` | `safety_monthly_man_hours` | Monthly safe manhours per work location |
| ` Weekly Report` | `safety_weekly_activities` | Weekly safety activities, PIC, category, evidence links |

All tables include:

- `id`
- business fields from the workbook
- `sourceSheet`
- `sourceRowNumber`
- `createdAt`
- `updatedAt`

Rows created through the application use `sourceSheet = "manual"` or a null import marker so workbook rows and manual rows can be distinguished.

## Import Behavior

The importer is a one-time migration tool, not a recurring sync. It will be exposed through an npm script such as:

```bash
npm run db:import:safety-dashboard
```

Importer behavior:

- Reads `SAFETY DASHBOARD V2.xlsx` from the repository root unless a path argument is provided.
- Validates required sheet names and header columns.
- Parses Indonesian and spreadsheet date formats, including examples like `01-08-2025`, `15-Sep-25`, and `2026-01-01`.
- Parses numeric strings with comma/period separators, including examples like `1,34`, `2,982,657.00`, and `3,760`.
- Replaces prior rows imported from the workbook for safety tables before inserting the new rows.
- Preserves manual rows when possible by deleting only rows whose `sourceSheet` matches workbook sheet names.
- Logs rows read, inserted, skipped, and skip reasons per sheet.
- Fails with a clear message when a required sheet/header is missing.

## UI Design

Route: `/dashboard/safety`

The top-level page contains:

- Eyebrow: `Safety Dashboard`
- Title: `Safety Dashboard`
- Description: monitoring KPI K3, incidents, certifications, manhours, performance, and weekly activity.
- Global filters where practical: year, site/location, status, category.
- KPI cards for:
  - Total Incident YTD
  - Fatality
  - LTI
  - Medical Treatment Case
  - First Aid
  - Property Damage
  - Near Miss
  - Safe Man Hours
  - Certification Expired
  - Weekly Activities this month

Charts use `recharts` and include:

- Incident trend by month.
- Safety manhours by location.
- Certification status active vs expired.
- Weekly activities by category.
- Safety performance threshold vs actual by site.

The detail area is tabbed:

1. `Incident Reports`
   - Uses `AdminTableCard` or `MinimalTableShell`.
   - Filters: category, location, department, date.
   - Row actions: view, edit, delete.

2. `Incident Summary`
   - Shows yearly and monthly summaries.
   - Supports year/category filtering.

3. `Certifications`
   - Shows equipment, PIC department/section, area, classifier, certifier, certification date, next certification date, status, regulation, remarks, work location.
   - Expired rows are visually highlighted.

4. `Safety Performance`
   - Shows employee count, safe manhours, threshold and actual values per site.

5. `Man Hours`
   - Shows cumulative and monthly manhours tables and trend charts.

6. `Weekly Activities`
   - Shows activity, date, PIC, category, image/evidence link.
   - Evidence URLs remain clickable.

## HERO UI Standards

The implementation must follow `CLAUDE.md` table/form requirements:

- Use `MinimalTableShell` or `AdminTableCard` for all tables.
- Use `TableMultiFilter` for multi-select filters.
- Use `AdminImportDialog` or equivalent import entry point for Excel/CSV import UI.
- Use `EnterpriseScorecards` via table scorecards when metrics are relevant.
- Use `EnterpriseActionButtons` or existing action row patterns for view/edit/delete with RBAC gating.
- Use `EnterpriseColumnVisibility` where users need visible-column control.
- Use `EnterpriseRecordDialog` and `EnterpriseFormGrid` for create/edit/view/delete popups.
- Provide horizontal and vertical scrolling, search, filters, Excel export, pagination, scorecards, RBAC, and column visibility.

## CRUD and Forms

All create/edit/view/delete interactions open in dialogs. No table-driven workflow should require a dedicated page in the MVP.

Primary editable entities:

- Safety incident report.
- Safety certification.
- Weekly safety activity.
- Safety performance metric.
- Safety manhours records.

Incident forms align workbook fields with PRD fields where available:

- Worker name.
- Department.
- Incident description.
- Property damage.
- Location.
- Category.
- Incident date.
- Notes/corrective description.

Future PRD-specific observation, inspection, and training forms should be added as separate tabs or typed entities after this MVP, not by overloading the workbook tables beyond recognition.

## RBAC

Use the same HERO access conventions as existing admin modules.

- Super Admin, Safety Officer, and Site Admin can import, create, edit, and delete.
- Supervisor and Manager can view dashboard/tables in this MVP.
- Viewer is read-only.
- Employee/User submit-only forms are excluded from this MVP and will be implemented in a separate PRD-specific phase.

The UI hides or disables edit/delete/import actions when access does not allow them.

## Validation and Error Handling

Importer validation:

- Missing required sheet/header: fail fast with clear message.
- Invalid required date: skip row and log reason.
- Empty optional numeric value: store null or zero based on metric semantics.
- Unknown incident category: preserve as text but mark/import log for review.
- Invalid URL evidence: preserve text if useful, but UI only renders clickable links for valid URLs.

Application validation:

- Required text/date/category fields must be present before save.
- Numeric fields must be finite numbers.
- Certification status should be recomputed from next certification date when status is absent.
- Delete should require confirmation.

Runtime error states:

- Empty datasets render empty states, not crashes.
- Empty charts render zero/empty chart states.
- Failed server actions return user-readable errors.

## Testing and Verification

Minimum verification before completion:

```bash
npm run type-check
npm run lint
npm run db:import:safety-dashboard
```

Manual checks:

- Open `/dashboard/safety`.
- Confirm KPI cards render.
- Confirm charts render without crashes.
- Confirm each tab displays imported workbook data.
- Confirm search, filters, pagination, column visibility, and Excel export work.
- Confirm CRUD dialogs open and submit for core tables.
- Confirm read-only users cannot see edit/delete/import controls.

## Implementation Notes

Likely files to add or modify:

- `db/schema/hero.ts` for safety tables.
- Drizzle migration generated from schema changes.
- `scripts/import-safety-dashboard.ts`.
- `package.json` for `db:import:safety-dashboard` script.
- `lib/safety-dashboard.ts` or similar for queries, aggregation, and parsing helpers.
- `app/dashboard/safety/page.tsx`.
- `app/dashboard/safety/actions.ts` or server-action module.
- `components/safety-dashboard/*` for client charts, filters, dialogs, and row actions.
- Navigation config components so the new Safety Dashboard is reachable.

## Open Decisions Resolved

- Data approach: one-time import to database, not recurring Google Sheets sync.
- Scope approach: Full MVP structured implementation.
- Dataset approach: Excel-first plus PRD-aligned forms.
- UI approach: dedicated Safety Dashboard module, not extending `/dashboard/hse`.
