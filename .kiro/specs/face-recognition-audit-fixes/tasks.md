# Implementation Plan: Face Recognition Audit Fixes

## Overview

Security hardening, reliability improvements, and UX polish for the HERO face recognition attendance system. Changes span: shared auth utility extraction, photo storage implementation, replay detection, GPS flagging, overnight shift handling, registration 409 pattern, and client-side UX enhancements. All code is TypeScript (Next.js App Router).

## Tasks

- [ ] 1. Shared Auth & Photo Storage (Critical - Parallel)
  - [ ] 1.1 Create shared auth helper `lib/mobile-auth.ts`
    - Implement `authenticateMobileRequest(request, requestEmployeeId?)` function returning `AuthResult` discriminated union
    - Check Bearer token first against `process.env.MOBILE_API_KEY`; if match → return `{ authenticated: true, type: 'api-key' }`
    - If no valid Bearer, attempt Better Auth session via `auth.api.getSession({ headers })`
    - On valid session → lookup employee by email in `employees` table (active only)
    - If no employee found → return `{ authenticated: false, status: 403, code: 'FORBIDDEN' }`
    - If `requestEmployeeId` provided and mismatches resolved employee → return `{ authenticated: false, status: 403, code: 'EMPLOYEE_MISMATCH' }`
    - If neither auth method succeeds → return `{ authenticated: false, status: 401, code: 'UNAUTHORIZED' }`
    - Remove all `if (!apiKey) return true` dev bypass patterns
    - Export `AuthResult` type for consumers
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [ ] 1.2 Implement photo storage in `face-attendance/route.ts`
    - Create `savePhoto(photo: File, clientRequestId: string)` helper function
    - Ensure `public/uploads/face-attendance/` directory exists via `mkdir({ recursive: true })`
    - Generate filename: `{clientRequestId}-{Date.now()}.{jpg|png}` based on MIME type
    - Write file buffer to disk using `fs/promises.writeFile`
    - Return relative URL `/uploads/face-attendance/{filename}`
    - Store returned URL in `attendanceRecords.photoUrl` field
    - On write failure, return HTTP 500 with code `STORAGE_ERROR`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 2. API Route Updates (Critical - Depends on Task 1)
  - [ ] 2.1 Update `face-verification/route.ts` — shared auth + replay detection + GPS flag
    - Replace inline `validateAuth` with `authenticateMobileRequest` from `lib/mobile-auth.ts`
    - Handle `AuthResult` — if `authenticated: false`, return appropriate status/code from result
    - Add replay detection: if `cosineSimilarity === 1.0`, return HTTP 422 with code `REPLAY_DETECTED` before creating attendance record
    - Add GPS flag: if `lat === 0 && lng === 0`, set `locationNote` to `[gps-unavailable] face-recognition` instead of plain `face-recognition`
    - _Requirements: 1.2, 1.3, 2.4, 3.3, 3.4, 6.1, 9.1, 9.2, 9.3_

  - [ ] 2.2 Update `face-attendance/route.ts` — shared auth + photo storage + GPS flag
    - Replace inline `validateAuth` with `authenticateMobileRequest` from `lib/mobile-auth.ts`
    - Handle `AuthResult` — if `authenticated: false`, return appropriate status/code from result
    - Integrate `savePhoto` function for uploaded photo files
    - Add GPS flag: if `lat === 0 && lng === 0`, set `locationNote` to `[gps-unavailable] photo-fallback` instead of plain `photo-fallback`
    - _Requirements: 1.2, 1.3, 2.4, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 6.2_

  - [ ] 2.3 Update `face-registration/route.ts` — shared auth + 409 pattern
    - Replace inline `validateAuth` with `authenticateMobileRequest` from `lib/mobile-auth.ts`
    - Handle `AuthResult` — if `authenticated: false`, return appropriate status/code from result
    - Add `faceRegisteredAt` to the employee SELECT query
    - If `employee.faceRegisteredAt` is non-null and `body.force !== true`, return HTTP 409 with code `ALREADY_REGISTERED` and include `faceRegisteredAt` ISO string
    - If `body.force === true`, proceed with overwrite as normal
    - _Requirements: 1.2, 1.3, 2.4, 3.3, 3.4, 8.1, 8.2, 8.3_

- [ ] 3. Checkpoint - Critical auth & API fixes complete
  - Ensure all three API routes compile and use the shared auth helper correctly. Ensure replay detection, photo storage, GPS flag, and 409 pattern are wired. Ask the user if questions arise.

- [ ] 4. Sync Engine & AbortController (Moderate)
  - [ ] 4.1 Update sync engine for overnight shifts + GPS flag propagation
    - In `lib/timesheet/face-attendance-sync.ts`, after initial check-out query returns empty:
    - If check-ins exist but no check-outs for the day, query next calendar day 00:00–06:00 for same employee+site
    - If overnight check-out found, use its time as clock-out for original day
    - Remove `missing-check-out` flag if overnight check-out resolves it
    - Add GPS flag propagation: scan `locationNote` for `[gps-unavailable]` substring; if found, push `'gps-unavailable'` into `validationFlags` array for the timesheet override
    - _Requirements: 6.3, 7.1, 7.2, 7.3_

  - [ ] 4.2 Update `photo-fallback.tsx` with AbortController
    - Create `AbortController` instance on mount, store in `useRef`
    - Pass `signal` to all `fetch` calls within the component
    - On unmount, call `controller.abort()` in cleanup function
    - Catch `AbortError` in fetch error handler and suppress (do not call `onError`)
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 5. Checkpoint - Sync engine & abort handling complete
  - Ensure overnight shift logic and GPS propagation work. Ensure AbortController cleanup fires on unmount. Ask the user if questions arise.

- [ ] 6. Client-Side UX Enhancements (Minor - Parallel)
  - [ ] 6.1 Update `page.tsx` — haptic, offline detection, employeeId guard, cn import fix
    - Add `import { cn } from '@/lib/utils'` to fix missing import
    - Add `employeeId` guard in `useEffect`: if `searchParams.get('employeeId')` is missing or `=== '0'`, set error message "Employee ID tidak ditemukan. Pastikan Anda sudah login." and disable buttons
    - Add offline detection: before initiating capture flow, check `navigator.onLine`; if false, set error "Tidak ada koneksi internet. Periksa jaringan Anda dan coba lagi." and return early
    - Add haptic feedback: after successful face capture, call `navigator.vibrate?.(200)` with optional chaining to avoid errors on unsupported devices
    - _Requirements: 10.1, 10.2, 11.1, 11.2, 12.1, 12.2, 14.1, 14.2_

  - [ ] 6.2 Update `register/page.tsx` — handle 409 with confirmation dialog
    - Catch HTTP 409 response from face-registration API
    - Parse `faceRegisteredAt` from error response body
    - Show confirmation dialog: "Wajah sudah terdaftar pada {date}. Apakah Anda ingin mendaftar ulang?"
    - On confirm, re-submit registration request with `force: true` in body
    - On cancel, dismiss dialog and return to idle state
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 6.3 Update `photo-fallback.tsx` — flash effect
    - Add `showFlash` state (`useState(false)`)
    - On photo capture, set `showFlash = true` then `setTimeout(() => setShowFlash(false), 150)`
    - Render white overlay `div` with `opacity: showFlash ? 1 : 0` and `pointer-events: none`, positioned absolute over the camera preview
    - Flash must appear before showing captured image preview
    - _Requirements: 13.1, 13.2_

- [ ] 7. Final Checkpoint - TypeScript compilation check
  - Run `npx tsc --noEmit` to verify all modified files compile without errors. Ensure no import-related TypeScript errors for `cn`, `authenticateMobileRequest`, or any new exports. Ask the user if questions arise.

## Notes

- All code is TypeScript (Next.js App Router with React)
- No database migrations required — all changes use existing columns
- `locationNote` field carries `[gps-unavailable]` prefix as structured metadata
- Photo storage uses filesystem at `public/uploads/face-attendance/`
- Bearer token auth takes precedence over session auth
- `computeWorkMinutes` already handles midnight wraparound — no change needed
- Overnight query window: next day 00:00–06:00
- Replay detection threshold: exact `1.0` cosine similarity
- Tasks marked with `*` are optional — none in this plan (all implementation-only)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 2, "tasks": ["4.1", "4.2"] },
    { "id": 3, "tasks": ["6.1", "6.2", "6.3"] }
  ]
}
```
