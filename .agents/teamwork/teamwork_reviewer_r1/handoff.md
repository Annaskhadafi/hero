# Handoff Report: Adversarial Review & Fix — Auto-Generate SPL dari Daily Activity Report

## 1. What the prior attempt got wrong
1. **Schema & TypeScript Type Violation in Line Items Insertion**:
   - *Input*: Daily activity task with `photoUrl` or photos.
   - *Expected*: Task metadata saved into standard schema fields compatible with `/dashboard/overtime-requests`.
   - *Actual*: Code attempted to insert `photoUrl` directly into `overtimeCommandLetterItems`, which is not a column on `hero_overtime_command_letter_items`. Resulted in TypeScript compilation error `TS2769: Object literal may only specify known properties, and 'photoUrl' does not exist...` and schema error in PostgreSQL.
   - *Root Cause*: Overtime line items store metadata (`photoUrl`, `photos`, `duration`, `unitNumber`, etc.) serialized in `lineDescription` JSON string (`metaPayload`).
2. **Timezone Timestamp Discrepancy**:
   - *Input*: Work date and planned start time (e.g. 17:00).
   - *Expected*: Planned start time displays as 17:00 in Indonesian local time (`toLocaleTimeString('id-ID')`).
   - *Actual*: Code parsed using UTC `setUTCHours(17)`, storing 17:00 UTC, which shifted by +7/+8 hours to 00:00 (midnight) or 01:00 the following morning.
   - *Root Cause*: Lack of consistent Indonesian timezone offset (`+07:00`) matching `parseSplInputDateTime`.
3. **Missing `overtimeCreditMinutes` on Participant**:
   - *Input*: Generated SPL participant.
   - *Expected*: `overtimeCreditMinutes` populated for timesheet, EWH, and payroll calculation.
   - *Actual*: `overtimeCreditMinutes` was null, leading to 0 credit minutes in timesheets.
   - *Root Cause*: Omitted calculation of duration minutes on `overtimeCommandLetterParticipants`.
4. **Applicant vs Approver Misassignment**:
   - *Input*: PJO viewing Daily Activity monitoring and generating SPL for technician/serviceman.
   - *Expected*: Technician is recorded as applicant (Pemohon / Serviceman, Step 1), and PJO is Step 2 approver.
   - *Actual*: `requestedByEmployeeId` defaulted to `currentEmp` (the PJO), incorrectly marking the PJO as the serviceman needing overtime and routing Step 2 to the regional Operation Manager.
   - *Root Cause*: `requesterEmployeeId = currentEmp?.id || targetEmp.id` instead of `targetEmp.id`.
5. **Cross-Midnight Lexicographical Sorting Bug**:
   - *Input*: Tasks spanning midnight (e.g. 22:00-23:30 and 23:30-01:30).
   - *Expected*: End time 01:30.
   - *Actual*: `ends.sort().reverse()[0]` selected `'23:30'` because `'23:30' > '01:30'` lexicographically.
   - *Root Cause*: Naive string sorting without day-rollover timeline normalization.
6. **Zero Duration Edge Case**:
   - *Input*: `startTime` equals `endTime` (e.g. 17:00 to 17:00).
   - *Expected*: 0 hours.
   - *Actual*: Computed as 24.0 hours because `diffMinutes <= 0` added 24 hours.
   - *Root Cause*: Missing equality boundary check.
7. **E2E Test Session Race Condition**:
   - *Input*: Running `tests/daily-activity-auto-spl.e2e.ts`.
   - *Expected*: Authenticates and navigates to `/dashboard/daily-activity`.
   - *Actual*: Navigating to `/dashboard/daily-activity` without waiting for callback redirect resulted in 307 redirect and 120s timeout on `/sign-in`.
   - *Root Cause*: Missing `targetUrl` parameter in `loginToHero(app, screen, browser, '/dashboard/daily-activity')`.

## 2. What I changed
- **`app/dashboard/daily-activity/actions.ts`**:
  - Fixed line items insertion to serialize full `metaPayload` JSON into `lineDescription` without invalid columns.
  - Standardized Indonesian timezone (`+07:00`) for `workDate`, `plannedStartAt`, and `plannedEndAt`.
  - Populated `overtimeCreditMinutes` on `overtimeCommandLetterParticipants` using calculated duration minutes.
  - Set `requestedByEmployeeId: targetEmp.id` to maintain the correct two-tier approval hierarchy (Serviceman -> Leader/PJO).
  - Added collision-proof loop for `splNumber` generation.
  - Added support for `employeeName` and `isOffDay` in input.
- **`components/daily-activity-create-spl-modal.tsx`**:
  - Implemented timeline minute calculation (`parseTimeToMinutes`, `minutesToTimeString`) with 1440m offset for cross-midnight tasks.
  - Fixed duration computation so `startTime === endTime` yields 0.0 hours.
  - Passed `isOffDay` and `employeeName` to server action.
- **`app/dashboard/daily-activity/client-dashboard.tsx`**:
  - Added active SPL badge (`emp.splNumber`) to the employee row in the main data table.
  - Standardized the detail dialog button with `data-testid="btn-buat-spl-lembur"` and uppercase `BUAT SPL LEMBUR` label.
- **`tests/daily-activity-auto-spl.e2e.ts`**:
  - Updated `loginToHero` invocation with direct callback URL and added robust element locators.
- **`tests/daily-activity-spl-reviewer-adversarial.test.mjs`**:
  - New comprehensive test suite verifying cross-midnight duration, zero duration, timeline extraction, JSON payload serialization, and database column constraints.
- **`Monthly/MONTHLY NOVEMBER 2026 SDS.pptx`**:
  - Updated presentation deck with official Slide #90 embedding 2 screenshots.

## 3. Verification Record
- **Deep Verification (Ran Actual Tests)**:
  - Unit & Adversarial Tests: `node --test tests/daily-activity-auto-spl-generation.test.mjs tests/daily-activity-spl-integration.test.mjs tests/auto-approve-spl-daily-activity.test.mjs tests/daily-activity-spl-reviewer-adversarial.test.mjs` -> **12 tests passed (0 failed)** in 96ms.
  - Real-Browser E2E: `npx e2e run tests/daily-activity-auto-spl.e2e.ts` -> **1 test passed in 45.18s (exit code 0)**, 5 screenshots verified.
  - Monthly Presentation: `python scripts/update-monthly-presentation.py` -> Successfully updated Slide #90 in `Monthly/MONTHLY NOVEMBER 2026 SDS.pptx`.
- **Shallow Verification**:
  - Verified UI layout and color badge contrast against `@/components/templates`.

## 4. Known Issues
- None remaining for this scope. All discovered defects and edge cases have been resolved.

## 5. Remaining Risk & Next Step
- Task is 100% complete and fully verified. Ready for deployment and review.
