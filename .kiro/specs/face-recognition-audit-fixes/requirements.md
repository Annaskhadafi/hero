# Requirements Document

## Introduction

This specification covers security hardening, reliability improvements, and UX polish for the HERO face recognition attendance system. The fixes address critical authentication gaps (dev mode bypass, missing ownership validation), implement actual photo storage, and add moderate/minor improvements including abort handling, GPS validation, overnight shift support, replay attack prevention, and client-side UX enhancements.

## Glossary

- **Face_Attendance_API**: The Next.js API route at `/api/mobile/face-attendance` handling photo-based attendance submissions via FormData
- **Face_Verification_API**: The Next.js API route at `/api/mobile/face-verification` handling face embedding verification and attendance recording
- **Face_Registration_API**: The Next.js API route at `/api/mobile/face-registration` handling face embedding registration for employees
- **Auth_Middleware**: The `validateAuth` function within each API route responsible for authenticating requests via session cookie or API key
- **Sync_Engine**: The `syncFaceAttendanceToTimesheet` function that computes clock-in/clock-out from attendance records and upserts into timesheet overrides
- **Photo_Fallback_Component**: The `PhotoFallback` React component that captures and uploads a photo when face verification fails
- **Face_Attendance_Page**: The main face attendance page at `/mobile/attendance/face/page.tsx`
- **Session_Auth**: Better Auth session cookie-based authentication for browser/PWA clients
- **API_Key_Auth**: Bearer token authentication using `MOBILE_API_KEY` environment variable for kiosk/device clients
- **Cosine_Similarity**: Mathematical measure of similarity between two embedding vectors, ranging from -1 to 1
- **Validation_Flag**: A string tag appended to attendance records indicating data quality issues (e.g., 'gps-unavailable', 'missing-check-out')

## Requirements

### Requirement 1: Remove Dev Mode Authentication Bypass

**User Story:** As a security auditor, I want all API routes to require valid authentication credentials, so that unauthenticated requests cannot access protected endpoints.

#### Acceptance Criteria

1. WHEN the `MOBILE_API_KEY` environment variable is not configured, THE Auth_Middleware SHALL reject requests that lack a valid session cookie, returning HTTP 401.
2. THE Auth_Middleware SHALL remove the `if (!apiKey) return true` code path from Face_Attendance_API, Face_Verification_API, and Face_Registration_API.
3. WHEN a request provides neither a valid Bearer token nor a valid session cookie, THE Auth_Middleware SHALL return HTTP 401 with error code 'UNAUTHORIZED'.

### Requirement 2: Dual Authentication Support

**User Story:** As a system architect, I want API routes to accept either session cookies or API keys, so that both browser-based PWA clients and external kiosk devices can authenticate.

#### Acceptance Criteria

1. WHEN a request includes a valid Bearer token matching `MOBILE_API_KEY`, THE Auth_Middleware SHALL authenticate the request as an API key caller.
2. WHEN a request includes a valid Better Auth session cookie, THE Auth_Middleware SHALL authenticate the request as a session-based caller.
3. WHEN a request includes both a valid Bearer token and a valid session cookie, THE Auth_Middleware SHALL authenticate the request using the Bearer token.
4. THE Auth_Middleware SHALL apply dual authentication logic consistently across Face_Attendance_API, Face_Verification_API, and Face_Registration_API.

### Requirement 3: EmployeeId Ownership Validation for Session-Based Auth

**User Story:** As a security auditor, I want session-authenticated users to only access their own employee records, so that one user cannot submit attendance for another employee.

#### Acceptance Criteria

1. WHEN a request is authenticated via Session_Auth, THE Auth_Middleware SHALL look up the employee record matching the session user's email address.
2. WHEN the session user's email does not match any active employee record, THE Auth_Middleware SHALL return HTTP 403 with error code 'FORBIDDEN'.
3. WHEN the `employeeId` in the request body does not match the employee record associated with the session user's email, THE Auth_Middleware SHALL return HTTP 403 with error code 'EMPLOYEE_MISMATCH'.
4. WHEN a request is authenticated via API_Key_Auth, THE Auth_Middleware SHALL skip employeeId ownership validation and trust the provided employeeId.

### Requirement 4: Photo Storage Implementation

**User Story:** As a system operator, I want uploaded attendance photos to be saved to disk with accessible URLs, so that admin reviewers can view fallback photos.

#### Acceptance Criteria

1. WHEN a photo is uploaded via Face_Attendance_API, THE Face_Attendance_API SHALL save the photo file to the `public/uploads/face-attendance/` directory.
2. THE Face_Attendance_API SHALL generate a unique filename using the format `{clientRequestId}-{timestamp}.{extension}` to prevent filename collisions.
3. WHEN the photo is saved successfully, THE Face_Attendance_API SHALL store the relative URL path `/uploads/face-attendance/{filename}` in the attendance record's `photoUrl` field.
4. IF the photo file write fails, THEN THE Face_Attendance_API SHALL return HTTP 500 with error code 'STORAGE_ERROR' and message describing the failure.

### Requirement 5: AbortController for Photo Fallback Component

**User Story:** As a mobile user, I want in-flight API requests to be cancelled when I navigate away from the photo fallback, so that stale responses do not cause unexpected behavior.

#### Acceptance Criteria

1. WHEN the Photo_Fallback_Component mounts, THE Photo_Fallback_Component SHALL create an AbortController instance for managing fetch lifecycle.
2. WHEN the Photo_Fallback_Component unmounts, THE Photo_Fallback_Component SHALL call `abort()` on the active AbortController to cancel any in-flight fetch request.
3. WHEN the fetch is aborted due to unmount, THE Photo_Fallback_Component SHALL suppress the AbortError and not invoke the `onError` callback.

### Requirement 6: GPS Unavailable Validation Flag

**User Story:** As a timesheet administrator, I want attendance records to indicate when GPS data was unavailable, so that I can identify records requiring location verification.

#### Acceptance Criteria

1. WHEN the Face_Verification_API receives latitude equal to 0 and longitude equal to 0, THE Face_Verification_API SHALL add 'gps-unavailable' to the validation flags of the attendance record.
2. WHEN the Face_Attendance_API receives latitude equal to 0 and longitude equal to 0, THE Face_Attendance_API SHALL add 'gps-unavailable' to the validation flags of the attendance record.
3. WHEN the Sync_Engine processes a record with 'gps-unavailable' flag, THE Sync_Engine SHALL propagate the flag to the timesheet override record.

### Requirement 7: Overnight Shift Handling in Sync Engine

**User Story:** As a shift worker, I want my clock-out recorded after midnight to be correctly paired with my clock-in from the previous day, so that my work hours are calculated accurately.

#### Acceptance Criteria

1. WHEN the Sync_Engine computes clock-out for a given day and finds no check-out events on that day, THE Sync_Engine SHALL also query the next calendar day's records for check-out events belonging to the same employee and site.
2. WHEN a check-out event is found on the next calendar day, THE Sync_Engine SHALL use that event's time as the clock-out value for the original day's timesheet entry.
3. WHEN an overnight clock-out is detected, THE Sync_Engine SHALL compute work minutes correctly across the midnight boundary.

### Requirement 8: Registration Overwrite Confirmation

**User Story:** As an employee, I want to be warned before my existing face registration is overwritten, so that I do not accidentally lose my registered face data.

#### Acceptance Criteria

1. WHEN an employee already has a face embedding registered and a new registration request is received without `force=true`, THE Face_Registration_API SHALL return HTTP 409 with error code 'ALREADY_REGISTERED' and include the existing `faceRegisteredAt` timestamp.
2. WHEN a registration request includes `force=true` in the request body, THE Face_Registration_API SHALL overwrite the existing embedding with the new one.
3. WHEN an employee has no existing face embedding, THE Face_Registration_API SHALL register the embedding without requiring the `force` parameter.

### Requirement 9: Replay Attack Prevention

**User Story:** As a security auditor, I want the system to reject verification attempts that replay a stored embedding, so that attendance cannot be faked by submitting the stored embedding directly.

#### Acceptance Criteria

1. WHEN the Cosine_Similarity between the live embedding and the stored embedding equals exactly 1.0, THE Face_Verification_API SHALL reject the verification with HTTP 422 and error code 'REPLAY_DETECTED'.
2. WHEN the Cosine_Similarity is above the verification threshold but below 1.0, THE Face_Verification_API SHALL accept the verification as legitimate.
3. THE Face_Verification_API SHALL perform the replay check before creating the attendance record.

### Requirement 10: Haptic Feedback on Successful Capture

**User Story:** As a mobile user, I want tactile feedback when my face is captured, so that I have immediate confirmation without looking at the screen.

#### Acceptance Criteria

1. WHEN the face embedding is successfully captured, THE Face_Attendance_Page SHALL trigger `navigator.vibrate(200)` to provide haptic feedback.
2. IF the Vibration API is not supported by the device, THEN THE Face_Attendance_Page SHALL skip the vibration call without throwing an error.

### Requirement 11: Offline Detection Before API Calls

**User Story:** As a mobile user, I want to see a clear offline message before the app attempts API calls, so that I understand why attendance submission is not working.

#### Acceptance Criteria

1. WHEN the user initiates a check-in or check-out flow and `navigator.onLine` returns false, THE Face_Attendance_Page SHALL display an offline error message instead of proceeding with the capture flow.
2. THE Face_Attendance_Page SHALL display the message "Tidak ada koneksi internet. Periksa jaringan Anda dan coba lagi." when offline is detected.
3. WHEN the device regains connectivity, THE Face_Attendance_Page SHALL allow the user to retry the flow.

### Requirement 12: EmployeeId Missing Immediate Error

**User Story:** As a mobile user, I want to see an error immediately if the employeeId parameter is missing, so that I do not waste time attempting a flow that will fail.

#### Acceptance Criteria

1. WHEN the Face_Attendance_Page mounts and the `employeeId` search parameter is missing or equals 0, THE Face_Attendance_Page SHALL display an error message on mount without waiting for user interaction.
2. THE Face_Attendance_Page SHALL display the message "Employee ID tidak ditemukan. Pastikan Anda sudah login." and disable the check-in and check-out buttons.

### Requirement 13: Photo Capture Flash Effect

**User Story:** As a mobile user, I want a brief visual flash when a photo is captured, so that I have clear feedback that the photo was taken.

#### Acceptance Criteria

1. WHEN the Photo_Fallback_Component captures a photo, THE Photo_Fallback_Component SHALL display a brief white overlay (opacity flash) lasting approximately 150 milliseconds.
2. THE Photo_Fallback_Component SHALL display the flash overlay before showing the captured image preview.

### Requirement 14: Fix Missing cn Import

**User Story:** As a developer, I want the face attendance page to compile without errors, so that the GPS status indicator renders correctly.

#### Acceptance Criteria

1. THE Face_Attendance_Page SHALL import the `cn` utility function from `@/lib/utils`.
2. WHEN the page is compiled, THE Face_Attendance_Page SHALL produce no import-related TypeScript errors for the `cn` function.
