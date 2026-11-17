# Adversarial Review Round 2 - Handoff Report

## 1. What the prior attempt got wrong
1. **Timezone Date Boundary Shift in Daily Activity Dashboard**:
   - *Input*: SPL created for work date `2026-11-12` stored with Indonesian timezone offset `+07:00`.
   - *Expected*: `lib/daily-activity-dashboard.ts` matches SPL with employee session on `2026-11-12`.
   - *Actual*: Naive `new Date(spl.workDate).toISOString().split('T')[0]` converted `2026-11-12T00:00:00+07:00` to UTC `2026-11-11T17:00:00.000Z`, returning date string `2026-11-11`. Because session date `sDateStr` is `2026-11-12`, key lookup failed (`splMeta` was `undefined`, and `splMinutes` evaluated to 0). The SPL badge never appeared on the dashboard.
   - *Root Cause*: Used UTC `toISOString().split('T')[0]` instead of the localized `normalizeDateToYmdString(spl.workDate)`.
2. **Date Shift in `rawWorkDate` on `EmployeeActivityRow`**:
   - *Input*: `firstSession.workDate` passed to `rawWorkDate`.
   - *Expected*: `rawWorkDate` provides the local date string `YYYY-MM-DD`.
   - *Actual*: Line 1820 used `new Date(firstSession.workDate).toISOString()`, causing `components/daily-activity-create-spl-modal.tsx` to pre-fill the modal with the previous day (`2026-11-11`).
   - *Root Cause*: Naive UTC conversion instead of `sDateStr` (which is already formatted using `normalizeDateToYmdString`).
3. **Server Action 24-Hour Duration Bug on Identical Start & End Times**:
   - *Input*: User inputs identical start and end time (e.g. `17:00` to `17:00`).
   - *Expected*: Immediate validation rejection as overtime cannot have zero duration.
   - *Actual*: Boundary condition `if (plannedEndAt <= plannedStartAt)` evaluated to `true`, adding 24 hours (1440 minutes) to duration.
   - *Root Cause*: Non-strict inequality `<=`, combined with missing equality validation.
4. **Task Line 24-Hour Duration Bug on Identical Times**:
   - *Input*: Task with `startedAt: '17:00'` and `endedAt: '17:00'`.
   - *Expected*: Default to safe minimum duration (30 mins).
   - *Actual*: Condition `if (mins <= 0) mins += 24 * 60` added 1440 minutes (24 hours).
   - *Root Cause*: `<=` operator instead of `<`.
5. **Loose `or(...)` in Target Worker Resolution**:
   - *Input*: `employeeDbId` provided, but `employeeName` also passed.
   - *Expected*: Primary key `employeeDbId` strictly prioritised.
   - *Actual*: Query executed `or(eq(id, ...), ilike(name, ...)).limit(1)`. If `name` matched multiple employees, Postgres scan order could return the wrong employee instead of the one specified by `employeeDbId`.
   - *Root Cause*: Flat `or` query without hierarchical precedence.
6. **Missing `assignedEmployeeId` on Line Items**:
   - *Input*: Items inserted into `overtimeCommandLetterItems`.
   - *Expected*: `assignedEmployeeId: targetEmp.id` populated.
   - *Actual*: Field left null, breaking downstream conflict detection in `lib/spl-data.ts`.
   - *Root Cause*: Omitted from insert payload.
7. **Concurrency Sequence Collision**:
   - *Input*: Concurrent submissions for SPL creation.
   - *Expected*: Retry with next sequence number if unique constraint violation occurs.
   - *Actual*: Pre-check select could be raced, failing with unhandled unique constraint error.
   - *Root Cause*: Missing retry loop around insert.
8. **Client Dashboard Missing Optimistic Update**:
   - *Input*: Submitting SPL from Daily Activity detail modal.
   - *Expected*: Table row immediately reflects the new SPL badge.
   - *Actual*: Badge only updated in modal; table row remained un-badged until manual reload.
   - *Root Cause*: Missing `splOverrides` state and `router.refresh()` in `client-dashboard.tsx`.

## 2. What I changed
- `lib/daily-activity-dashboard.ts`:
  - Replaced `new Date(spl.workDate).toISOString().split('T')[0]` with `normalizeDateToYmdString(spl.workDate)`.
  - Replaced UTC `rawWorkDate` with `sDateStr`.
- `app/dashboard/daily-activity/actions.ts`:
  - Added strict equality rejection: `if (cleanStart === cleanEnd) return { success: false, error: ... }`.
  - Corrected cross-midnight check to strict `<`: `if (plannedEndAt < plannedStartAt)`.
  - Fixed task item duration calculation: `if (mins < 0) mins += 1440; diffMinutes = mins > 0 ? mins : 30`.
  - Populated `assignedEmployeeId: targetEmp.id` on line items.
  - Implemented hierarchical target employee resolution (DbId -> Sn -> Name -> currentEmp).
  - Implemented 5-attempt collision retry loop for `splNumber`.
- `components/daily-activity-create-spl-modal.tsx`:
  - Added client-side guard rejecting `startTime === endTime`.
- `app/dashboard/daily-activity/client-dashboard.tsx`:
  - Added `splOverrides` state and connected table row SPL badge.
  - Added `router.refresh()` and `setSplOverrides` on `onSuccess`.
- `tests/daily-activity-spl-reviewer-adversarial.test.mjs`:
  - Added 3 new adversarial test suites covering timezone date consistency, equal start/end edge cases, and server validation checks.
- `Monthly/MONTHLY NOVEMBER 2026 SDS.pptx`:
  - Updated presentation with Slide #91.

## 3. Verification Record
- **Deep Verification (ran actual tests):**
  - Node Unit & Contract Suite: `node --test tests/daily-activity-auto-spl-generation.test.mjs tests/daily-activity-spl-integration.test.mjs tests/auto-approve-spl-daily-activity.test.mjs tests/daily-activity-spl-reviewer-adversarial.test.mjs` -> **14 tests passed (0 failed)**.
  - Real-Browser E2E Execution: `npx e2e run tests/daily-activity-auto-spl.e2e.ts` -> **1 test passed in 30.5s (exit code 0)** with 5 screenshots captured.
  - TypeScript Typecheck: `npm run type-check` -> **0 errors in modified files**.
  - Monthly Presentation Automation: `python scripts/update-monthly-presentation.py` -> Successfully updated Slide #91 in `Monthly/MONTHLY NOVEMBER 2026 SDS.pptx`.
- **Shallow Verification (manual only):**
  - Inspected button accessibility, badge styling, and dialog viewport compatibility.
- **Unverified aspects:**
  - Real external SMTP dispatch over corporate firewall (mocked/logged in dev environment).

## 4. Known Issues
- None remaining. All 8 defects identified during adversarial review have been corrected and verified.

## 5. Remaining risk & next step
- Implementation is complete, hardened, and verified with all automated and real-browser suites. Ready for final commit and push.
