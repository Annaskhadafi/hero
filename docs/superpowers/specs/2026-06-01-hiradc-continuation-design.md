# HIRADC Continuation Design

Date: 2026-06-01

## Context

The HIRADC feature was partially implemented before this session. Existing work includes schema additions in `db/schema/hero.ts`, domain helpers in `lib/hiradc/*`, server actions in `app/dashboard/hse/hiradc/actions.ts`, and partial components in `components/hiradc/*`. The continuation will preserve usable Codex work and complete the interrupted feature end-to-end.

`task-manager list-tasks` currently reports no tasks in `documentation/tasks`, so there is no project task ID to start or complete. If a task appears later, the implementation must follow the project workflow: list, start, implement, complete or cancel.

## Goal

Deliver a complete HSE HIRADC module that supports register and entry management, Excel import, filtered table review, export, and print-friendly report views while following HERO table/form standards.

## Architecture

The module will keep clear boundaries:

- Database tables in `db/schema/hero.ts` hold HIRADC registers as document headers and HIRADC entries as activity/hazard/risk rows.
- Domain logic stays in `lib/hiradc/*`:
  - `risk.ts` calculates risk score and level from likelihood and severity.
  - `parsing.ts` and `importer.ts` parse Excel workbook rows and persist imported data.
  - `queries.ts` loads dashboard, filter, access, and report data.
- Server actions stay in `app/dashboard/hse/hiradc/actions.ts` for register CRUD, entry CRUD, deletion, and import.
- The primary route will be `/dashboard/hse/hiradc`.
- Report/print views will use a separate route, preferably `/dashboard/hse/hiradc/report/[registerId]`.

Existing code should be reused unless it conflicts with required HERO standards or fails type/runtime checks.

## Main HIRADC Page

The `/dashboard/hse/hiradc` page will be the operational dashboard for the feature. It will show dynamic scorecards and a table of HIRADC entries.

Scorecards should include:

- Total registers.
- Total entries.
- EXTREME/HIGH risks before control.
- EXTREME/HIGH risks after control.

The table should include the important operational columns:

- Register/document.
- Department.
- Location.
- Activity name.
- Routine type.
- Equipment.
- Hazard category and details.
- Risk consequence.
- Before-control likelihood, severity, score, and level.
- Existing control and legal reference.
- After-control likelihood, severity, score, and level.
- Additional control.

The table must follow project standards from `CLAUDE.md` by using or extending reusable components such as `MinimalTableShell` or `AdminTableCard`, `TableMultiFilter`, `EnterpriseActionButtons`, `EnterpriseColumnVisibility`, and reusable scorecard support where applicable.

## Filters, Search, Pagination, and Column Visibility

The page will support client-side search and filtering from server-loaded HIRADC data. Filters should include:

- Register.
- Department.
- Location.
- Routine type.
- Risk level.

Pagination and page-size controls should follow the selected reusable table shell. Column visibility should be available if it can be integrated with the existing enterprise table kit without fighting the component API.

## CRUD and Dialogs

Register and entry create/edit/view/delete workflows should be RBAC-aware:

- View is allowed when `canView` is true.
- Create/edit actions require `canEdit`.
- Delete actions require `canDelete`.

Entry forms should open in dialogs and use HERO form standards. The current manual HIRADC dialog should be refactored to use `EnterpriseRecordDialog` and `EnterpriseFormGrid`, or a HIRADC wrapper built on top of those components if the generic API needs adaptation.

Delete should use confirmation-style UI and server actions. Unauthorized users should not see or should not be able to trigger restricted actions.

## Excel Import

Import will reuse the existing `importHiradcAction` and `lib/hiradc/importer.ts` implementation where possible. It must support `.xlsx` HIRADC files, including the sample workbook `HIRA_Service_Import_v2_completed.xlsx`.

The UI should follow the `AdminImportDialog` pattern. If the generic mapping preview cannot represent HIRADC's complex worksheet structure cleanly, the HIRADC import dialog may provide a specialized mapping/summary view while still following the shared visual and interaction pattern.

Import options should preserve existing behavior:

- Grouping by department.
- Single register import mode.
- Replace existing data when explicitly selected.

Import feedback should include total rows, successful rows, errors, and register count.

## Export

Export should reuse or refine `components/hiradc/hiradc-export.ts`. Exported files should use clean column labels, include the currently filtered rows, and use a clear filename.

## Report and Print View

A print-friendly report route will display one HIRADC register and its entries. The report should include:

- Document title.
- Document number.
- Department and location.
- Revision.
- Effective date.
- Prepared/reviewed/approved fields.
- HIRADC entry table with before/after risk values.
- Risk level badges or clear text labels.

The first implementation target is browser print readiness. Automatic PDF generation is out of scope unless an existing HSE PDF pattern is already present and easy to reuse.

## Validation and Verification

Before implementation is considered complete:

- Confirm schema fields match query/action/importer usage.
- Confirm required migrations exist or generate the missing Drizzle migration without destructive changes.
- Fix TypeScript errors introduced by the continuation.
- Run the existing HIRADC risk test.
- Run relevant build/type/lint checks available in the project.
- Manually verify that `/dashboard/hse/hiradc` opens, the table renders, dialogs work, import shows a summary, export uses filtered rows, and report pages open for imported registers.

## Out of Scope

- Replacing the whole HSE dashboard.
- Building a full approval workflow for HIRADC documents.
- Automatic PDF generation unless a stable existing project pattern is already available.
- Destructive schema rewrites or data loss operations.

## Open Implementation Notes

- Prefer `MinimalTableShell` if it best supports scorecards, filters, export, pagination, and column visibility for this page.
- Prefer adapting existing `components/hiradc/*` files instead of creating unrelated one-off UI.
- Keep HIRADC-specific parsing and risk logic in `lib/hiradc/*` so UI components remain focused on presentation and interaction.
