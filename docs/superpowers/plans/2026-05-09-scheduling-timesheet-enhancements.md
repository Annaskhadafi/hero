# Scheduling Timesheet Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Scheduling Timesheet production-ready with persisted Attendance Real, reliable overtime calculation, import validation, conflict markers, compact bulk editing, and smaller component boundaries.

**Architecture:** Keep existing page route, move Attendance Real logic into focused utility/module components, persist manual/import overrides in a dedicated Drizzle table, and compute overtime through a shared pure utility. UI remains client-side but receives DB-backed records and saved overrides from server options.

**Tech Stack:** Next.js App Router, React, Drizzle/PostgreSQL, xlsx, shadcn UI components, TypeScript.

---

### Task 1: Persistence
- [x] Add `timesheetAttendanceRealOverrides` table keyed by `site_id`, `period`, `employee_id`, `day`.
- [x] Add save action to upsert manual/import overrides.
- [x] Load overrides into `getSchedulingTimesheetOptions()`.

### Task 2: Calculation Utility
- [x] Move status normalization, time parsing, attendance hours, and overtime math into pure helpers.
- [x] Use helpers for Attendance Real and Overtime tab.

### Task 3: UX Enhancements
- [x] Add compact bulk toolbar with custom apply flow.
- [x] Add import preview and validation summary.
- [x] Add conflict indicator for schedule OFF vs attendance present.
- [x] Add save/dirty/last-saved workflow.
- [x] Add export source metadata.

### Task 4: Component Boundaries
- [x] Extract Attendance Real tab into a focused component.
- [x] Keep parent workspace responsible for shared filters and tab state.

### Task 5: Verification
- [x] Run `npm run type-check`.
- [x] Verify route returns HTTP 200.
- [x] Run graph updates.
- [x] Check DB push/migration status.
