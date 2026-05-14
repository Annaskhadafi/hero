# Design Document: Face Recognition Audit Fixes

## Overview

This design covers security hardening, reliability improvements, and UX polish for the HERO face recognition attendance system. Changes are scoped to: shared auth utility, photo storage, sync engine overnight handling, replay detection, registration 409 pattern, GPS flagging, and client-side UX enhancements.

## Architecture

The changes touch three layers:

1. **Shared Library** (`lib/mobile-auth.ts`) — Centralized dual-auth helper replacing per-route `validateAuth` functions
2. **API Routes** (`app/api/mobile/face-*`) — Consume the shared auth helper; add replay detection, GPS flagging, photo storage, registration 409
3. **Sync Engine** (`lib/timesheet/face-attendance-sync.ts`) — Overnight shift query expansion, GPS flag propagation
4. **Client Components** — AbortController, haptic feedback, offline detection, employeeId guard, photo flash

## Components & Interfaces

### 1. Shared Auth Helper — `lib/mobile-auth.ts`

```typescript
export type AuthResult =
  | { authenticated: true; type: 'api-key' }
  | { authenticated: true; type: 'session'; employeeId: number; email: string }
  | { authenticated: false; status: 401 | 403; code: string; message: string }

/**
 * Dual auth: checks Bearer token first, falls back to session cookie.
 * No dev mode bypass — always requires valid credentials.
 *
 * For session auth, resolves employee by email and validates ownership
 * against the provided requestEmployeeId.
 */
export async function authenticateMobileRequest(
  request: NextRequest,
  requestEmployeeId?: number
): Promise<AuthResult>
```

**Logic flow:**

1. Read `Authorization` header
2. If Bearer token present and matches `process.env.MOBILE_API_KEY` → return `{ authenticated: true, type: 'api-key' }`
3. If no valid Bearer token, attempt Better Auth session via `auth.api.getSession({ headers })`
4. If session valid → lookup employee by `session.user.email` in `employees` table (active only)
5. If no employee found → return `{ authenticated: false, status: 403, code: 'FORBIDDEN', message: 'No employee record for this account.' }`
6. If `requestEmployeeId` provided and doesn't match resolved employee → return `{ authenticated: false, status: 403, code: 'EMPLOYEE_MISMATCH', message: 'Cannot access another employee record.' }`
7. Return `{ authenticated: true, type: 'session', employeeId, email }`
8. If neither auth method succeeds → return `{ authenticated: false, status: 401, code: 'UNAUTHORIZED', message: 'Missing or invalid authentication.' }`

**Key decisions:**

- Bearer token takes precedence (checked first)
- No `if (!apiKey) return true` — removed entirely
- API key auth trusts provided employeeId (no ownership check)
- Session auth enforces ownership via email→employee lookup

### 2. Photo Storage — in `face-attendance/route.ts`

```typescript
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'face-attendance')

async function savePhoto(photo: File, clientRequestId: string): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true })
  const ext = photo.type === 'image/png' ? 'png' : 'jpg'
  const timestamp = Date.now()
  const filename = `${clientRequestId}-${timestamp}.${ext}`
  const filepath = path.join(UPLOAD_DIR, filename)
  const buffer = Buffer.from(await photo.arrayBuffer())
  await writeFile(filepath, buffer)
  return `/uploads/face-attendance/${filename}`
}
```

Returns relative URL stored in `attendanceRecords.photoUrl`. On failure, route returns 500 `STORAGE_ERROR`.

### 3. Registration 409 Pattern — in `face-registration/route.ts`

After employee lookup, before storing embedding:

```typescript
// Check existing registration
const employee = employeeResults[0]
if (employee.faceRegisteredAt && !body.force) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'ALREADY_REGISTERED',
        message: 'Face already registered. Use force=true to overwrite.',
        faceRegisteredAt: employee.faceRegisteredAt.toISOString(),
      },
    },
    { status: 409 }
  )
}
```

Schema change: select `faceRegisteredAt` in the employee query.

### 4. Replay Detection — in `face-verification/route.ts`

After computing cosine similarity, before threshold check:

```typescript
if (similarity === 1.0) {
  return errorResponse(
    422,
    'REPLAY_DETECTED',
    'Exact embedding match detected. Live capture required.'
  )
}
```

Rationale: Real face captures always have sensor noise producing similarity < 1.0. Exact 1.0 indicates the stored embedding was replayed verbatim.

### 5. GPS Unavailable Flag

In both `face-verification/route.ts` and `face-attendance/route.ts`, before inserting the attendance record:

```typescript
const validationFlags: string[] = []
if (lat === 0 && lng === 0) {
  validationFlags.push('gps-unavailable')
}
```

The `attendanceRecords` table currently has no `validationFlags` column. Two options:

- **Option A (chosen):** Store flags in the `locationNote` field as a structured prefix, e.g. `"[gps-unavailable] face-recognition"`
- **Option B:** Add a `validationFlags jsonb` column to `attendanceRecords`

**Decision:** Use Option A to avoid a migration. The `locationNote` field already exists as `text`. The sync engine already reads records and builds its own `validationFlags` array for the timesheet override. We'll detect `gps-unavailable` from the locationNote during sync.

Updated sync engine logic:

```typescript
// In syncFaceAttendanceToTimesheet, after partitioning records:
for (const record of records) {
  if (record.locationNote?.includes('gps-unavailable')) {
    if (!validationFlags.includes('gps-unavailable')) {
      validationFlags.push('gps-unavailable')
    }
  }
}
```

### 6. Overnight Shift Handling — in `face-attendance-sync.ts`

When no check-out events found for the current day, extend the query window:

```typescript
// After initial query finds no check-outs for today:
if (checkOuts.length === 0 && checkIns.length > 0) {
  // Query next day 00:00–06:00 for check-out events
  const nextDayStart = new Date(startOfNextDay)
  const nextDayCutoff = new Date(startOfNextDay)
  nextDayCutoff.setHours(6, 0, 0, 0)

  const overnightRecords = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employeeId),
        eq(attendanceRecords.siteId, siteId),
        gte(attendanceRecords.eventTime, nextDayStart),
        lt(attendanceRecords.eventTime, nextDayCutoff)
      )
    )

  const overnightCheckOuts = overnightRecords.filter((r) => isCheckOutEvent(r.eventType))
  if (overnightCheckOuts.length > 0) {
    const latest = overnightCheckOuts.reduce((max, r) => (r.eventTime > max.eventTime ? r : max))
    clockOut = formatTimeHHMM(latest.eventTime)
    // Remove 'missing-check-out' flag if it was added
  }
}
```

The existing `computeWorkMinutes` already handles overnight (adds 1440 when diff < 0), so no change needed there.

### 7. Client-Side Changes

#### AbortController (PhotoFallback)

```typescript
useEffect(() => {
  const controller = new AbortController()
  controllerRef.current = controller
  return () => controller.abort()
}, [])

// In fetch call:
fetch(url, { signal: controllerRef.current.signal }).catch((err) => {
  if (err.name === 'AbortError') return // suppress
  onError?.(err)
})
```

#### Haptic Feedback

```typescript
if (typeof navigator !== 'undefined' && navigator.vibrate) {
  navigator.vibrate(200)
}
```

#### Offline Detection

```typescript
if (!navigator.onLine) {
  setError('Tidak ada koneksi internet. Periksa jaringan Anda dan coba lagi.')
  return
}
```

#### EmployeeId Guard

```typescript
useEffect(() => {
  const id = searchParams.get('employeeId')
  if (!id || Number(id) === 0) {
    setError('Employee ID tidak ditemukan. Pastikan Anda sudah login.')
    setDisabled(true)
  }
}, [])
```

#### Photo Flash

```typescript
const [showFlash, setShowFlash] = useState(false)
// On capture:
setShowFlash(true)
setTimeout(() => setShowFlash(false), 150)
```

#### cn Import Fix

```typescript
import { cn } from '@/lib/utils'
```

## Data Model Changes

No schema migrations required. All changes use existing columns:

- `attendanceRecords.locationNote` — extended to carry `[gps-unavailable]` prefix
- `attendanceRecords.photoUrl` — now stores actual file path instead of placeholder
- `timesheetAttendanceRealOverrides.validationFlags` — already `jsonb`, receives propagated flags

## Error Handling

| Scenario                      | Status | Code               | Route             |
| ----------------------------- | ------ | ------------------ | ----------------- |
| No valid auth                 | 401    | UNAUTHORIZED       | All mobile APIs   |
| Session email not found       | 403    | FORBIDDEN          | All mobile APIs   |
| EmployeeId mismatch           | 403    | EMPLOYEE_MISMATCH  | All mobile APIs   |
| Already registered (no force) | 409    | ALREADY_REGISTERED | face-registration |
| Replay detected (sim === 1.0) | 422    | REPLAY_DETECTED    | face-verification |
| Photo write failure           | 500    | STORAGE_ERROR      | face-attendance   |

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Auth rejection without valid credentials

_For any_ HTTP request to a mobile face API that provides neither a valid Bearer token matching `MOBILE_API_KEY` nor a valid Better Auth session cookie, the `authenticateMobileRequest` function SHALL return `{ authenticated: false }` with status 401, regardless of whether `MOBILE_API_KEY` is configured in the environment.

**Validates: Requirements 1.1, 1.3**

### Property 2: API key authentication success

_For any_ HTTP request containing a Bearer token that exactly matches the configured `MOBILE_API_KEY` environment variable, the `authenticateMobileRequest` function SHALL return `{ authenticated: true, type: 'api-key' }`.

**Validates: Requirements 2.1**

### Property 3: Session authentication success

_For any_ HTTP request with a valid Better Auth session cookie whose email maps to an active employee record, the `authenticateMobileRequest` function SHALL return `{ authenticated: true, type: 'session', employeeId, email }` where employeeId matches the employee with that email.

**Validates: Requirements 2.2**

### Property 4: Session ownership enforcement

_For any_ session-authenticated request where the `requestEmployeeId` parameter differs from the employee record resolved by the session user's email, the `authenticateMobileRequest` function SHALL return `{ authenticated: false, status: 403, code: 'EMPLOYEE_MISMATCH' }`. Conversely, _for any_ API-key-authenticated request, ownership validation SHALL be skipped regardless of the employeeId value.

**Validates: Requirements 3.2, 3.3, 3.4**

### Property 5: Photo storage filename uniqueness and path format

_For any_ valid photo upload with a given `clientRequestId`, the generated filename SHALL match the pattern `{clientRequestId}-{timestamp}.{jpg|png}` and the stored `photoUrl` SHALL equal `/uploads/face-attendance/{filename}`.

**Validates: Requirements 4.2, 4.3**

### Property 6: GPS unavailable flag detection and propagation

_For any_ attendance record where both latitude equals 0 and longitude equals 0, the system SHALL include 'gps-unavailable' in the record's location metadata, and when the sync engine processes such a record, the 'gps-unavailable' flag SHALL appear in the resulting timesheet override's `validationFlags` array.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 7: Overnight shift clock-out resolution

_For any_ day where an employee has at least one check-in event but no check-out event on that same calendar day, and a check-out event exists in the first 6 hours of the next calendar day for the same employee and site, the sync engine SHALL use that next-day check-out as the clock-out value for the original day's timesheet entry.

**Validates: Requirements 7.1, 7.2**

### Property 8: Overnight work minutes computation

_For any_ clock-in time `T1` and clock-out time `T2` where `T2` is chronologically after `T1` but the HH:mm representation of `T2` is numerically less than `T1` (crossing midnight), `computeWorkMinutes(T1, T2)` SHALL return the correct positive minute difference accounting for the 24-hour wraparound.

**Validates: Requirements 7.3**

### Property 9: Registration 409 idempotency pattern

_For any_ employee with a non-null `faceRegisteredAt` timestamp, a registration request without `force=true` SHALL return HTTP 409. _For any_ registration request with `force=true`, the system SHALL overwrite the existing embedding regardless of prior registration state. _For any_ employee with null `faceRegisteredAt`, registration SHALL succeed without requiring the `force` parameter.

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 10: Replay detection at exact similarity

_For any_ pair of embeddings where `cosineSimilarity(live, stored) === 1.0`, the face verification endpoint SHALL reject with HTTP 422 and code 'REPLAY_DETECTED', and SHALL NOT create an attendance record.

**Validates: Requirements 9.1, 9.3**

### Property 11: Legitimate verification acceptance

_For any_ pair of embeddings where `cosineSimilarity(live, stored)` is strictly greater than the threshold (0.7) and strictly less than 1.0, the face verification endpoint SHALL accept the verification and create an attendance record.

**Validates: Requirements 9.2**
