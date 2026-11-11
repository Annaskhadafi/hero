# Progress: Adversarial Review & Fix — Auto-Generate SPL dari Daily Activity Report

## 1. Adversarial Findings & Root Causes
- **Bug 1 (Fatal Type & Schema Violation)**: `app/dashboard/daily-activity/actions.ts` tried to insert `photoUrl` directly into `overtimeCommandLetterItems`, which is not a column on `hero_overtime_command_letter_items` and caused a TypeScript build error / potential PostgreSQL runtime schema failure. Fixed by serializing item metadata (`photoUrl`, `photos`, `duration`, `unitNumber`, etc.) into `lineDescription` as JSON (`metaPayload`), matching `overtime-requests` standards.
- **Bug 2 (Timezone Inconsistency)**: `parsedWorkDate` and `plannedStartAt`/`plannedEndAt` used UTC `setUTCHours` without Indonesian timezone offset (`+07:00`), causing local times to shift by +7/+8 hours when formatted in `id-ID` locale. Fixed to parse with explicit `+07:00` offset and accurate date advancement for cross-midnight tasks.
- **Bug 3 (Missing Overtime Credit Minutes)**: `overtimeCommandLetterParticipants` lacked `overtimeCreditMinutes`, resulting in 0 credit minutes in timesheet and analytics. Fixed by calculating exact duration minutes and saving to participant.
- **Bug 4 (Applicant / Approver Misrouting)**: `requestedByEmployeeId` defaulted to `currentEmp` (e.g. PJO), mistakenly treating the supervisor as the overtime worker and routing Step 2 away from PJO to Regional Manager. Fixed to set `requestedByEmployeeId: targetEmp.id` (worker), preserving serviceman (Step 1) and PJO (Step 2).
- **Bug 5 (SPL Number Collision Risk)**: Sequential number generation did not check uniqueness against existing documents. Fixed with a collision check loop.
- **Bug 6 (Cross-Midnight Extraction Bug)**: Lexicographical sorting `ends.sort().reverse()` picked `'23:30'` over `'01:30'`. Fixed by calculating timeline minutes relative to shift start (+1440 for next-day hours).
- **Bug 7 (Zero Duration on Same-Time)**: `17:00` to `17:00` triggered `diffMinutes <= 0 -> +24h = 24 Jam`. Fixed to return 0 when start equals end.
- **Bug 8 (Table UI Integration)**: Missing active SPL badge in Daily Activity table. Added `emp.splNumber` badge beside employee name in the main table.
- **Bug 9 (E2E Test Session Race)**: `tests/daily-activity-auto-spl.e2e.ts` opened `/sign-in` without `callbackUrl`, causing 307 redirect and test timeout. Fixed with `loginToHero(app, screen, browser, '/dashboard/daily-activity')`.

## 2. Verification Summary
- **Unit & Contract Tests**: Ran `node --test tests/daily-activity-auto-spl-generation.test.mjs tests/daily-activity-spl-integration.test.mjs tests/auto-approve-spl-daily-activity.test.mjs tests/daily-activity-spl-reviewer-adversarial.test.mjs` -> **12/12 passed (0 failed)**.
- **Real-Browser E2E**: Ran `npx e2e run tests/daily-activity-auto-spl.e2e.ts` -> **1/1 passed in 45.18s**, capturing all 5 screenshots (`001` through `005`).
- **Monthly Presentation**: Updated `Monthly/MONTHLY NOVEMBER 2026 SDS.pptx` with Slide #90.
