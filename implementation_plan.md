# Sistem Absen Live Camera & Geolocation

This document details the implementation plan for the new Attendance (Absen) feature in the HERO application, designed with a mobile-first UI for field workers and a cohesive web view for admins/HR.

## User Review Required

> [!IMPORTANT]
> - Mobile-First Layout: The implementation creates a dedicated mobile-app-like view for employees to perform attendance as requested. For the web interface, this mobile view can either be centered on a larger screen (like a simulator view) or integrated natively as a card alongside the calendar/records. We will center it as a max-width container on larger screens unless otherwise specified.
> - Database Sync: A new `attendances` table will be introduced to track clock-ins, clock-outs, geolocation, photo evidence, and site coordinates. Is the Drizzle schema ready for this, or should we create the schema files (`db/schema/attendance.ts`)?
> - Mobile Hardware Access: The application requires HTTPS to access camera and GPS APIs securely via `navigator.mediaDevices` and `navigator.geolocation`. If tested locally on mobile devices without HTTPS, these APIs might fail.

## Proposed Changes

### 1. Database Schema
#### [NEW] `db/schema/attendances.ts`
Create the table to store the attendance logs containing:
- `id` (uuid)
- `user_id` (relationship with users)
- `type` (enum: 'clock-in', 'clock-out')
- `photo_url` (reference to uploaded file)
- `latitude`, `longitude` (numeric/decimal)
- `location_name` (e.g., 'Site North (Pit 3)')
- `timestamp` (datetime)
- `status` (verified, pending, rejected)
- `notes` (text)

### 2. File Upload & Media Handling
- Integrate `uploadFile` server action for saving attendance selfie captures (Canvas to Blob -> FormData -> `uploadFile`) as per One Chitra Guidelines.

### 3. Frontend - Attendance Mobile UI (Employee View)
#### [NEW] `app/dashboard/attendance/page.tsx`
Create the main entry point for the Attendance module. It will conditionally render the clock-in view or the history view.

#### [NEW] `components/attendance/live-camera-view.tsx`
- Implement `<video>` attached to `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })` to provide a "LIVE" selfie feed.
- Overlay a circle with a map pin for the GPS status.
- Call `navigator.geolocation.getCurrentPosition` when the component mounts to lock GPS. Display "GPS LOCKED" when ready, or a loading state if pending.

#### [NEW] `components/attendance/clock-action-buttons.tsx`
- Buttons for "CLOCK IN" and "CLOCK OUT".
- Upon clicking, triggers a snapshot from the video feed to a hidden `<canvas>`, converts to blob, and triggers server action to log attendance.

#### [NEW] `components/attendance/todays-log.tsx`
- A timeline component showing today's attendance logs (Checked In, Pending Clock Out).

### 4. Frontend - Web Dashboard (HR / Admin View)
#### [NEW] `app/dashboard/attendance/records/page.tsx`
- Display a comprehensive TanStack Table of all attendances for admins to monitor.
- Adhere to the Table & Virtualization Standards.
- Include a "Preview Photo" dialog view using `PermissionGuard` if necessary.

### 5. Backend Server Actions
#### [NEW] `app/actions/attendance.ts`
- `submitAttendance(data: FormData)`: Handles file upload via the standard unified upload approach, inserts database record.
- `getTodayAttendance(userId: string)`: Retrieves the timeline logic for `todays-log.tsx`.

## Open Questions

> [!WARNING]
> 1. **Radius Validation:** Do we need to enforce a geofence radius limit to block attendance if an employee is too far from the Site?
> 2. **Navigation:** Should this replace an existing link or be added as a new resource `attendance` in `lib/navigation.ts`?

## Verification Plan

### Automated Tests
- No explicit E2E tests, but standard TypeScript checks and eslint validation.
- Verify Drizzle schema with `npm run db:push` or `npm run db:generate`.

### Manual Verification
1. Access `/dashboard/attendance` via browser.
2. Grant Camera and Location permissions.
3. Validate that the camera stream displays successfully.
4. Click "Clock In", confirm that the photo is uploaded to `public/uploads` and a row is created in the database.
5. Resize browser to simulate mobile width constraints.
