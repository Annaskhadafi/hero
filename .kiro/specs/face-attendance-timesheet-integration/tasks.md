# Implementation Plan: Face Attendance Timesheet Integration

## Overview

Integrate face-based attendance (facial recognition check-in/check-out) with the Scheduling Timesheet Attendance tab. Implementation is split into three phases: database & core logic, API endpoint, and UI components. Each phase builds incrementally on the previous one.

## Tasks

- [x] 1. Database schema & core sync logic
  - [x] 1.1 Add `confidenceScore` and `deviceType` columns to `attendanceRecords` schema
    - Add `confidenceScore: decimal('confidence_score', { precision: 4, scale: 3 })` nullable column to `attendanceRecords` in `db/schema/hero.ts`
    - Add `deviceType: text('device_type')` nullable column to `attendanceRecords` in `db/schema/hero.ts`
    - Run `drizzle-kit generate` to create the migration, then push to database
    - _Requirements: 1.1, 1.4, 2.1_

  - [x] 1.2 Create sync engine (`lib/timesheet/face-attendance-sync.ts`)
    - Implement `isCheckOutEvent(eventType: string): boolean` — returns true if eventType contains 'out', 'pulang', or 'checkout' (case-insensitive)
    - Implement `derivePeriodAndDay(eventTime: Date): { period: string; day: number }` — extracts YYYY-MM period and day number
    - Implement `formatTimeHHMM(date: Date): string` — formats a Date to HH:mm (24-hour)
    - Implement `computeWorkMinutes(clockIn: string, clockOut: string): number | null` — computes positive minute difference, handles overnight (clockOut < clockIn adds 1440)
    - Implement `syncFaceAttendanceToTimesheet(employeeId, siteId, eventDate)` — queries attendanceRecords for employee+site+day, partitions into check-ins/check-outs, computes earliest check-in and latest check-out, sets validationFlags (`missing-check-in` or `missing-check-out`), upserts into `timesheetAttendanceRealOverrides` with `source: 'attendance'`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 1.3 Create conflict resolver (`lib/timesheet/attendance-conflict-resolver.ts`)
    - Define `SOURCE_PRIORITY` map: `{ attendance: 3, excel: 2, manual: 1 }`
    - Implement `resolveAttendanceConflict(overrides)` — given multiple override records for same employee+day, returns `{ winner, hasConflict, allSources }` based on priority
    - Implement `shouldOverwrite(existingSource, incomingSource): boolean` — returns true if incoming source has equal or higher priority than existing
    - _Requirements: 5.1, 5.2, 5.4, 5.8_

  - [ ]\* 1.4 Write unit tests for sync engine helper functions
    - Test `isCheckOutEvent` with 'checked-out', 'pulang', 'checkout', 'checked-in', 'Clock Out', etc.
    - Test `derivePeriodAndDay` with various dates including month boundaries
    - Test `formatTimeHHMM` with midnight, noon, edge times
    - Test `computeWorkMinutes` with normal shifts, overnight shifts, same time
    - _Requirements: 3.2, 3.3, 6.2, 6.4_

  - [ ]\* 1.5 Write unit tests for conflict resolver
    - Test single source (no conflict)
    - Test attendance vs excel (attendance wins)
    - Test attendance vs manual (attendance wins)
    - Test excel vs manual (excel wins)
    - Test all three sources present (attendance wins)
    - _Requirements: 5.1, 5.2, 5.4_

- [x] 2. Checkpoint - Ensure core logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Face attendance API endpoint
  - [x] 3.1 Create API route (`app/api/mobile/face-attendance/route.ts`)
    - Implement POST handler with FormData parsing (employeeId, siteId, eventType, photo, latitude, longitude, confidenceScore, deviceType, clientRequestId)
    - Implement input validation: required fields check, type coercion, range validation (lat -90..90, lng -180..180, confidence 0..1, eventType in allowed values, photo JPEG/PNG max 5MB)
    - Implement authentication via bearer token / API key in Authorization header (follow existing mobile API auth pattern)
    - Implement employee existence + active status check (return 404 if not found/inactive)
    - Implement confidence threshold check (default 0.7, return 422 if below)
    - Implement clientRequestId idempotency: check if record with same clientRequestId exists, return existing record with `alreadyExisted: true` if so
    - Store record in `attendanceRecords` with confidenceScore, deviceType, photoUrl, GPS coordinates
    - After successful storage, call `syncFaceAttendanceToTimesheet(employeeId, siteId, eventDate)` inline
    - Return 201 with created record on success
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [ ]\* 3.2 Write unit tests for API validation logic
    - Test missing required fields → 400
    - Test invalid confidence score → 400
    - Test confidence below threshold → 422
    - Test invalid GPS coordinates → 400
    - Test invalid eventType → 400
    - Test photo too large → 400
    - Test missing auth → 401
    - Test employee not found → 404
    - Test duplicate clientRequestId → 200 with alreadyExisted
    - Test valid submission → 201
    - _Requirements: 1.5, 1.6, 2.4, 2.5, 2.6, 2.8, 2.9_

- [x] 4. Checkpoint - Ensure API tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. UI components
  - [x] 5.1 Create source indicator component (`components/timesheet/attendance-source-indicator.tsx`)
    - Create `AttendanceSourceIndicator` component accepting `source`, `confidenceScore?`, `timestamp?` props
    - Render face icon (e.g. `ScanFace` from lucide-react) for `attendance` source
    - Render spreadsheet icon (e.g. `FileSpreadsheet`) for `excel` source
    - Render pencil icon (e.g. `Pencil`) for `manual` source
    - Implement tooltip on hover showing: source label, timestamp formatted as `yyyy-MM-dd HH:mm`, and confidence score as percentage (only for `attendance` source when available)
    - Handle multiple sources: show indicator for most recent source, tooltip lists all sources in reverse chronological order
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 5.2 Create summary bar component (`components/timesheet/attendance-summary-bar.tsx`)
    - Create `AttendanceSummaryBar` component accepting `faceDays`, `excelDays`, `manualDays`, `totalFilledDays`, `facePercentage` props
    - Display count badges for each source type (face, excel, manual)
    - Display face recognition percentage (e.g. "Face: 75.3%")
    - Show all zeros when no data exists
    - _Requirements: 7.1, 7.2, 7.4_

  - [x] 5.3 Integrate source indicators and summary bar into Attendance tab
    - In `components/scheduling-timesheet-workspace.tsx` (or the relevant Attendance tab sub-component), compute summary stats from loaded override records: count days by source, calculate face percentage
    - Render `AttendanceSummaryBar` above the attendance grid
    - Render `AttendanceSourceIndicator` in each attendance cell that has data, passing the source, confidence score, and timestamp
    - Highlight employee rows with zero face attendance records using a distinct background color
    - Ensure summary bar recalculates when site or period selection changes
    - _Requirements: 3.1, 3.6, 3.7, 4.1, 7.1, 7.2, 7.3, 7.5_

  - [ ]\* 5.4 Write unit tests for UI components
    - Test `AttendanceSourceIndicator` renders correct icon per source type
    - Test tooltip content with and without confidence score
    - Test `AttendanceSummaryBar` displays correct counts and percentage
    - Test summary bar shows zeros when no data
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.8, 7.4_

- [x] 6. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The sync engine runs inline (not async) after each face attendance submission for MVP simplicity
- Conflict resolution uses hardcoded priority (attendance > excel > manual); configurable priority is deferred
- The existing `source: 'attendance'` enum value in `timesheetAttendanceRealOverrides` is reused — no migration needed for that table
- Property-based tests (fast-check) are omitted from this task list per user request; they can be added later following the design document's testing strategy

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "1.5", "3.1"] },
    { "id": 3, "tasks": ["3.2"] },
    { "id": 4, "tasks": ["5.1", "5.2"] },
    { "id": 5, "tasks": ["5.3"] },
    { "id": 6, "tasks": ["5.4"] }
  ]
}
```
