# Progress: Adversarial Review & Fix — Auto-Generate SPL dari Daily Activity Report

## 1. Adversarial Findings & Root Causes (Round 1 & Round 2)
- **Bug 1 (Fatal Type & Schema Violation)**: `app/dashboard/daily-activity/actions.ts` tried to insert `photoUrl` directly into `overtimeCommandLetterItems`, which is not a column on `hero_overtime_command_letter_items`. Fixed by serializing item metadata into `lineDescription` as JSON (`metaPayload`).
- **Bug 2 (Timezone Inconsistency)**: Stored timestamps lacked explicit Indonesian timezone offset (`+07:00`). Fixed to parse with explicit `+07:00` offset.
- **Bug 3 (Missing Overtime Credit Minutes)**: `overtimeCommandLetterParticipants` lacked `overtimeCreditMinutes`. Fixed by populating credited minutes.
- **Bug 4 (Applicant / Approver Misrouting)**: `requestedByEmployeeId` defaulted to `currentEmp` instead of `targetEmp.id`. Fixed to set `requestedByEmployeeId: targetEmp.id`.
- **Bug 5 (SPL Number Collision Risk)**: Added 5-attempt retry loop on unique constraint 23505.
- **Bug 6 (Cross-Midnight Extraction Bug)**: Lexicographical string sorting failed across midnight. Fixed with timeline minutes (+1440 offset).
- **Bug 7 (Zero Duration on Same-Time in Server & Client)**: Server action added 24h when start equaled end. Fixed with equality validation (`cleanStart === cleanEnd`) and strict `<` check.
- **Bug 8 (Timezone Day-Boundary Shift in Dashboard)**: `lib/daily-activity-dashboard.ts` used `new Date(spl.workDate).toISOString().split('T')[0]`, shifting `2026-11-12T00:00:00+07:00` back to `2026-11-11`, causing SPL badge lookup to fail. Fixed with `normalizeDateToYmdString(spl.workDate)`.
- **Bug 9 (Date Shift in rawWorkDate)**: `EmployeeActivityRow.rawWorkDate` used UTC `toISOString()`. Fixed to use `sDateStr`.
- **Bug 10 (Loose OR Query in Employee Resolution)**: Server action used `or(...)` with `ilike`. Fixed to use hierarchical priority (DbId -> Sn -> Name -> currentEmp).
- **Bug 11 (Missing assignedEmployeeId on Items)**: `overtimeCommandLetterItems` lacked `assignedEmployeeId`, breaking conflict checks. Fixed to populate `assignedEmployeeId: targetEmp.id`.
- **Bug 12 (Table Optimistic Reactivity)**: Missing `splOverrides` state and `router.refresh()` in client dashboard. Fixed to update state immediately and revalidate.

## 2. Verification Summary
- **Unit & Contract Tests**: Ran `node --test tests/daily-activity-auto-spl-generation.test.mjs tests/daily-activity-spl-integration.test.mjs tests/auto-approve-spl-daily-activity.test.mjs tests/daily-activity-spl-reviewer-adversarial.test.mjs` -> **14/14 passed (0 failed)**.
- **Real-Browser E2E**: Ran `npx e2e run tests/daily-activity-auto-spl.e2e.ts` -> **1/1 passed in 30.5s**, capturing all 5 screenshots (`001` through `005`).
- **Monthly Presentation**: Updated `Monthly/MONTHLY NOVEMBER 2026 SDS.pptx` with Slide #91.
