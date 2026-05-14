# Implementation Plan: Face Recognition Attendance

## Overview

Implement a biometric face recognition attendance system for the HERO mobile PWA. The system uses client-side face-api.js for face detection/embedding extraction, server-side cosine similarity verification, blink-based anti-spoofing, photo fallback for failed recognition, and admin management tools. Implementation is split into 4 phases: Database & Core Logic, Server APIs, Client-side Components, and Admin Panel.

## Tasks

- [x] 1. Database & Core Logic
  - [x] 1.1 Add face embedding columns to employees schema
    - Add `faceEmbedding` (jsonb, nullable) column to the employees table in `db/schema/hero.ts`
    - Add `faceRegisteredAt` (timestamp, nullable) column to the employees table
    - Generate and run the database migration
    - _Requirements: 11.1, 11.2, 11.4_

  - [x] 1.2 Create cosine similarity utility
    - Create `lib/face-recognition/cosine-similarity.ts`
    - Implement `cosineSimilarity(a: number[], b: number[]): number` function
    - Compute dot product divided by product of magnitudes
    - Return 0 for zero-magnitude vectors
    - Ensure result is in range [-1, 1]
    - _Requirements: 4.4, 8.3_

  - [x] 1.3 Create embedding validator
    - Create `lib/face-recognition/embedding-validator.ts`
    - Implement `validateEmbedding(input: unknown): { valid: boolean; error?: string }` function
    - Validate: input is array, length === 128, all elements are finite floating-point numbers
    - Return descriptive error messages for each validation failure case
    - _Requirements: 7.2, 8.7_

- [x] 2. Server APIs
  - [x] 2.1 Create face registration API
    - Create `app/api/mobile/face-registration/route.ts`
    - Implement POST handler accepting `{ employeeId, embedding }` in request body
    - Validate authentication token from Authorization header
    - Use `validateEmbedding` to validate the embedding array
    - Look up employee by ID, return 404 if not found or inactive
    - Store embedding in `employees.faceEmbedding` (jsonb) and set `faceRegisteredAt` to current timestamp
    - Overwrite existing embedding if employee already has one registered
    - Return 201 with `{ success: true, registeredAt }` on success
    - Return 400 for missing fields or invalid embedding, 401 for auth failure
    - _Requirements: 2.6, 2.7, 2.8, 2.9, 2.10, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 11.2, 11.3_

  - [x] 2.2 Create face verification API
    - Create `app/api/mobile/face-verification/route.ts`
    - Implement POST handler accepting `{ employeeId, embedding, siteId, eventType, latitude, longitude, clientRequestId }`
    - Validate authentication token from Authorization header
    - Use `validateEmbedding` to validate the live embedding array
    - Retrieve stored embedding for the employee, return 404 if no face registration found
    - Compute cosine similarity between live and stored embeddings using `cosineSimilarity`
    - If similarity > 0.6: create attendance record in `attendanceRecords` table with all required fields (employeeId, siteId, eventType, eventTime, status="verified", locationNote="face-recognition", confidenceScore, deviceType="mobile", latitude, longitude, clientRequestId)
    - If similarity > 0.6: invoke `syncFaceAttendanceToTimesheet` for timesheet integration
    - Handle idempotency: if `clientRequestId` already exists, return existing record
    - Return `{ verified: true, similarityScore, attendanceRecord }` on match
    - Return `{ verified: false, similarityScore }` on no match
    - Return 400 for invalid embedding, 401 for auth, 404 for no registration
    - Ensure response within 500ms target
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 3. Checkpoint - Core backend complete
  - Ensure all API routes work correctly, ask the user if questions arise.

- [x] 4. Client-Side Face Recognition Components
  - [x] 4.1 Create face model loader hook
    - Create `hooks/use-face-models.ts`
    - Implement `useFaceModels()` hook that loads face-api.js models (ssd_mobilenetv1, face_landmark_68_model, face_recognition_model)
    - Check Cache API / IndexedDB for cached models first
    - Download from `/models/` path on app server if not cached
    - Cache models after successful download with versioned keys
    - Track and expose loading progress (0-100%)
    - Expose `isLoaded`, `error`, `retry()` state
    - Target: load from cache within 3 seconds on mid-range device
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 4.2 Create blink detector hook
    - Create `hooks/use-blink-detector.ts`
    - Implement `useBlinkDetector()` hook that monitors Eye Aspect Ratio (EAR) from 68-point face landmarks
    - EAR formula: `(|p2-p6| + |p3-p5|) / (2 * |p1-p4|)` using eye landmark points
    - Detect blink: EAR drops below 0.2 then returns above 0.2 within 400ms
    - Implement 5-second detection window; if no blink detected, show message and restart
    - Expose `isLivenessConfirmed`, `isDetecting`, `status` state
    - Show visual indicator of liveness check progress
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 4.3 Create face capture component
    - Create `components/mobile/face-capture.tsx`
    - Activate device front-facing camera and display live preview
    - Display face alignment guide overlay (oval frame)
    - Integrate face-api.js for real-time face detection
    - Show guidance message if no face detected within 10 seconds
    - Show warning if multiple faces detected
    - Integrate blink detector for liveness check
    - Extract 128-dimensional embedding on successful detection + blink
    - Support both `registration` and `verification` modes
    - Track consecutive verification failures (for fallback trigger)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2_

  - [x] 4.4 Create photo fallback component
    - Create `components/mobile/photo-fallback.tsx`
    - Display notification that face recognition has failed
    - Activate camera for manual photo capture
    - Validate captured photo (JPEG/PNG, max 5MB)
    - Upload photo to server via face-attendance API
    - Create attendance record with source "photo-fallback" and status "needs-review"
    - Trigger conditions: 3 consecutive failures, no face for 15s, or confidence < 0.3
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 4.5 Create face attendance page
    - Create mobile attendance page route (e.g., `app/(mobile)/attendance/face/page.tsx`)
    - Orchestrate full flow: load models → camera → blink detection → face capture → verification API call
    - Handle check-in and check-out event types
    - Capture GPS coordinates at time of attendance
    - Generate unique `clientRequestId` on client side for idempotency
    - Display success confirmation with event type and timestamp on verified
    - Integrate photo fallback component on failure conditions
    - Handle all error states (camera denied, network error, no registration)
    - _Requirements: 4.1, 5.3, 5.5, 6.1, 6.4, 6.5, 12.4_

- [x] 5. Checkpoint - Client-side complete
  - Ensure all client components render correctly and integrate with APIs, ask the user if questions arise.

- [x] 6. Admin Panel
  - [x] 6.1 Add face registration management to admin
    - Create server action `getFaceRegistrationStatus()` returning employee list with registration status and stats (registered/unregistered counts)
    - Create server action `deleteFaceEmbedding(employeeId)` to remove embedding and reset registration
    - Create admin UI component showing employee list with face registration status
    - Display registration timestamp for registered employees
    - Provide delete/force-re-registration action per employee
    - Add filter for unregistered employees only
    - Display summary statistics (total registered vs unregistered)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 6.2 Add photo fallback review to admin
    - Create server action `getPhotoFallbackRecords(filter?)` returning records with photo-fallback source and needs-review flag
    - Create server action `reviewFallbackRecord(recordId, action, reason?)` for approve/reject
    - Create admin UI component showing fallback records list (photo, employee name, event type, timestamp, site)
    - Provide approve/reject actions per record
    - On approve: set status to "verified", remove needs-review flag
    - On reject: set status to "rejected", store rejection reason
    - Add filter by status (pending, approved, rejected)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 7. Final Checkpoint - Full integration
  - Ensure all components are wired together, APIs respond correctly, admin actions work, and timesheet sync functions. Ask the user if questions arise.

## Notes

- All code is TypeScript (Next.js App Router with React)
- face-api.js models (~6MB) served from `/models/` path on the application server
- Cosine similarity threshold is 0.6 for face match
- Blink detection uses EAR < 0.2 threshold with 400ms return window
- Photo fallback max size: 5MB, JPEG/PNG only
- `clientRequestId` ensures idempotent attendance submissions
- Timesheet sync failure should not block attendance record creation (eventual consistency)
- Existing `syncFaceAttendanceToTimesheet` module handles timesheet upsert logic
- Checkpoints ensure incremental validation between phases

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["4.1", "4.2"] },
    { "id": 3, "tasks": ["4.3", "4.4"] },
    { "id": 4, "tasks": ["4.5"] },
    { "id": 5, "tasks": ["6.1", "6.2"] }
  ]
}
```
