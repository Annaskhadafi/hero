# Requirements Document

## Introduction

This feature integrates face-based attendance (facial recognition check-in/check-out) with the Scheduling Timesheet's Attendance tab. Employees use facial recognition via a mobile app or kiosk device to clock in and clock out. The resulting attendance records automatically populate the Scheduling Timesheet Attendance grid, replacing or supplementing manual entry and Excel imports from fingerprint machines.

The system already has an `attendanceRecords` table storing check-in/check-out events with photo URLs, GPS coordinates, and timestamps. This feature extends that foundation by:

- Adding a dedicated face attendance submission API for mobile/kiosk clients
- Mapping face attendance events into the Scheduling Timesheet's daily attendance grid
- Providing source-aware conflict resolution when multiple attendance sources exist

## Glossary

- **Face_Attendance_Service**: The backend service responsible for receiving, validating, and storing face-based attendance submissions from mobile apps or kiosk devices.
- **Attendance_Grid**: The daily attendance matrix in the Scheduling Timesheet Attendance tab that displays clock-in/clock-out times and status per employee per day.
- **Attendance_Source**: The origin of an attendance record — one of `face`, `manual`, or `excel`.
- **Conflict_Resolver**: The logic that determines which attendance record takes priority when multiple sources provide data for the same employee on the same day.
- **Timesheet_Sync_Engine**: The process that reads raw face attendance events and maps them into the Attendance_Grid's override records (clock-in time, clock-out time, status).
- **Kiosk_Client**: A dedicated device (tablet or terminal) at a site entrance used by employees for face-based clock-in/clock-out.
- **Mobile_Client**: The HERO mobile app used by employees for face-based clock-in/clock-out.
- **Scheduling_Timesheet**: The workspace component (`scheduling-timesheet-workspace.tsx`) that manages scheduling, attendance, field breaks, and payroll tabs per site per period.

## Requirements

### Requirement 1: Face Attendance Record Storage

**User Story:** As a system administrator, I want face attendance records stored with source metadata, so that the system can distinguish face-based attendance from other sources.

#### Acceptance Criteria

1. WHEN a face attendance event is received, THE Face_Attendance_Service SHALL store the record with employee ID, site ID, event type (checked-in or checked-out), event timestamp in UTC (ISO 8601 format), photo URL (maximum 2048 characters), GPS coordinates (latitude and longitude as decimal degrees with up to 6 decimal places), and source set to `face`.
2. THE Face_Attendance_Service SHALL associate each face attendance record with a unique client request ID (string, maximum 128 characters) to prevent duplicate submissions.
3. IF a duplicate client request ID is submitted, THEN THE Face_Attendance_Service SHALL return the existing record without creating a new entry and indicate that the record already existed.
4. THE Face_Attendance_Service SHALL store the confidence score from the facial recognition match as a decimal value between 0.0 and 1.0 (inclusive) alongside the attendance record.
5. IF a face attendance event is received with any required field missing or invalid (employee ID not found, site ID not found, event type not matching allowed values, confidence score outside 0.0–1.0, or GPS coordinates outside valid ranges), THEN THE Face_Attendance_Service SHALL reject the record and return an error response indicating which field failed validation.
6. IF a face attendance event is received with a confidence score below the configured minimum threshold, THEN THE Face_Attendance_Service SHALL reject the record and return an error response indicating insufficient confidence.

### Requirement 2: Face Attendance Submission API

**User Story:** As a mobile/kiosk developer, I want a dedicated API endpoint for submitting face attendance records, so that client applications can send check-in/check-out data programmatically.

#### Acceptance Criteria

1. THE Face_Attendance_Service SHALL expose a POST endpoint at `/api/mobile/face-attendance` that accepts employee ID (integer), site ID (integer), event type (`checked-in` or `checked-out`), photo file (JPEG or PNG, max 5MB), GPS coordinates (latitude as decimal between -90.0 and 90.0, longitude as decimal between -180.0 and 180.0), confidence score (decimal between 0.0 and 1.0), device type (`mobile` or `kiosk`), and client request ID (string, max 255 characters).
2. WHEN a submission is received with all required fields present and within valid ranges, THE Face_Attendance_Service SHALL validate that the employee exists and is active before storing the record.
3. WHEN a valid face attendance submission is received and stored, THE Face_Attendance_Service SHALL return a response with status code 201 containing the created record within 2 seconds.
4. IF the employee ID does not match an active employee, THEN THE Face_Attendance_Service SHALL return an error response with status code 404 and a message indicating the employee was not found or is inactive.
5. IF the photo file is missing or exceeds 5MB or is not in JPEG or PNG format, THEN THE Face_Attendance_Service SHALL return an error response with status code 400 and a message indicating the photo validation failure reason.
6. IF the confidence score is below the configured minimum threshold (default 0.7), THEN THE Face_Attendance_Service SHALL reject the submission with status code 422 and a message indicating low confidence.
7. THE Face_Attendance_Service SHALL authenticate requests using a bearer token or API key associated with the device.
8. IF the request lacks a valid bearer token or API key, THEN THE Face_Attendance_Service SHALL return an error response with status code 401 and a message indicating authentication failure without processing the submission.
9. IF any required field (employee ID, site ID, event type, photo file, confidence score, device type, or client request ID) is missing or contains a value outside its valid range, THEN THE Face_Attendance_Service SHALL return an error response with status code 400 and a message identifying the invalid field.

### Requirement 3: Timesheet Attendance Grid Integration

**User Story:** As a site administrator, I want face attendance data to automatically appear in the Scheduling Timesheet Attendance tab, so that I do not need to manually enter clock-in/clock-out times for employees who use face recognition.

#### Acceptance Criteria

1. WHEN the Attendance tab is loaded for a site and period, THE Attendance_Grid SHALL display clock-in and clock-out times derived from face attendance records for each employee on each day, formatted as HH:MM (24-hour), by grouping all AttendanceRealRecord entries matching the selected siteId and period.
2. WHEN multiple check-in events (eventType not containing "out", "pulang", or "checkout") exist for the same employee on the same day, THE Attendance_Grid SHALL use the earliest eventTime as the clock-in time.
3. WHEN multiple check-out events (eventType containing "out", "pulang", or "checkout") exist for the same employee on the same day, THE Attendance_Grid SHALL use the latest eventTime as the clock-out time.
4. IF a face attendance record exists for an employee on a given day but only contains check-in events with no check-out event, THEN THE Attendance_Grid SHALL display the clock-in time and leave the clock-out field empty while setting the attendance status to `present`.
5. IF a face attendance record exists for an employee on a given day but only contains check-out events with no check-in event, THEN THE Attendance_Grid SHALL display the clock-out time and leave the clock-in field empty while setting the attendance status to `present`.
6. WHEN a manual override (source `manual`) or excel import override (source `excel`) exists for the same employee and day, THE Attendance_Grid SHALL display the override data instead of the face attendance record.
7. WHEN no attendance record and no override exists for an employee on a day where the employee's schedule code is IN, DS, or NS, THE Attendance_Grid SHALL retain the status as `empty` (unfilled).

### Requirement 4: Attendance Source Indicator

**User Story:** As a site administrator, I want to see which attendance source provided each cell's data, so that I can verify data provenance and identify discrepancies.

#### Acceptance Criteria

1. THE Attendance_Grid SHALL display a distinct icon indicator for each attendance cell that has data, showing whether the data originated from `face`, `manual`, or `excel`.
2. WHEN the source is `face`, THE Attendance_Grid SHALL display a face icon in the cell.
3. WHEN the source is `excel`, THE Attendance_Grid SHALL display a spreadsheet icon in the cell.
4. WHEN the source is `manual`, THE Attendance_Grid SHALL display a pencil icon in the cell.
5. WHEN a user hovers over an attendance cell that has source data, THE Attendance_Grid SHALL show a tooltip within 300 milliseconds containing the source type label, the record timestamp in `yyyy-MM-dd HH:mm` format, and for `face` source only, the confidence score displayed as a percentage (0–100%).
6. IF an attendance cell has no source data, THEN THE Attendance_Grid SHALL display the cell without any source indicator icon or tooltip.
7. IF an attendance cell has data from multiple sources, THEN THE Attendance_Grid SHALL display the indicator for the most recent source based on record timestamp, and the tooltip SHALL list all sources with their respective timestamps in reverse chronological order.
8. IF the confidence score is unavailable for a `face` source record, THEN THE Attendance_Grid SHALL omit the confidence score from the tooltip and display only the source type and timestamp.

### Requirement 5: Conflict Resolution Between Sources

**User Story:** As a site administrator, I want configurable conflict resolution when face attendance and Excel/manual data overlap, so that the most reliable data takes priority.

#### Acceptance Criteria

1. THE Conflict_Resolver SHALL detect a conflict when two or more sources (face, excel, manual) provide attendance data for the same employee on the same calendar date within the active period.
2. THE Conflict_Resolver SHALL apply a configurable priority order to determine which source takes precedence, defaulting to: face > excel > manual (face has highest priority).
3. WHERE the site administrator configures a custom priority order, THE Conflict_Resolver SHALL apply the custom order instead of the default and persist the configuration per site.
4. WHEN a conflict is detected during import or data load, THE Conflict_Resolver SHALL automatically resolve the conflict by selecting the highest-priority source's data as the winning record within 2 seconds of detection.
5. WHEN a conflict exists, THE Attendance_Grid SHALL display the winning source's data in the cell and show a visible conflict indicator icon distinguishing it from non-conflicted cells.
6. WHEN the site administrator clicks the conflict indicator, THE Attendance_Grid SHALL display all conflicting records (source label, clockIn, clockOut for each) and provide an option to override the resolution.
7. IF the site administrator manually overrides a conflict resolution, THEN THE Conflict_Resolver SHALL store the override with source set to `manual`, preserve the original conflicting records for audit, and update the cell display within 1 second.
8. IF the winning source contains partial data (clockIn without clockOut or vice versa) and a lower-priority source contains complete data, THEN THE Conflict_Resolver SHALL still select the higher-priority source's data as the winner unless the administrator manually overrides.

### Requirement 6: Sync Face Attendance to Timesheet Overrides

**User Story:** As a system, I want face attendance events automatically synced into the timesheet attendance override records, so that the Attendance tab reflects real-time face attendance data without manual intervention.

#### Acceptance Criteria

1. WHEN a new face attendance record is stored, THE Timesheet_Sync_Engine SHALL create or update the corresponding attendance override record matching the same employee, site, period, and day within 30 seconds of the event being stored.
2. WHEN computing clock-in and clock-out for an employee on a given day, THE Timesheet_Sync_Engine SHALL use the earliest `checked-in` event timestamp as clock-in and the latest `checked-out` event timestamp as clock-out, stored in `HH:mm` format.
3. THE Timesheet_Sync_Engine SHALL set the source field of the override record to `face`.
4. WHEN both clock-in and clock-out are present, THE Timesheet_Sync_Engine SHALL compute work minutes as the positive difference in minutes between clock-out and clock-in (if clock-out is earlier than clock-in, the computation SHALL assume the clock-out occurs on the next calendar day).
5. IF only a check-in event exists without a corresponding check-out, THEN THE Timesheet_Sync_Engine SHALL set clock-out to empty, status to `present`, work minutes to null, and add a validation flag `missing-check-out` to the validationFlags array.
6. IF only a check-out event exists without a corresponding check-in, THEN THE Timesheet_Sync_Engine SHALL set clock-in to empty, status to `present`, work minutes to null, and add a validation flag `missing-check-in` to the validationFlags array.
7. WHEN a subsequent face attendance event arrives for the same employee and day, THE Timesheet_Sync_Engine SHALL recompute clock-in, clock-out, work minutes, and validation flags from all events for that day, replacing the previous override values.

### Requirement 7: Face Attendance Dashboard Summary

**User Story:** As a site administrator, I want a summary view showing face attendance coverage, so that I can monitor adoption and identify employees not using face recognition.

#### Acceptance Criteria

1. WHEN the Attendance tab is loaded, THE Attendance_Grid SHALL display a summary bar showing the count of days filled by each source (face, excel, manual) for the selected site and period.
2. WHEN attendance data is loaded for the selected site and period, THE Attendance_Grid SHALL display the percentage of total attendance cells filled by source `face` (face recognition), calculated as (cells with source `face` / total filled cells across all employees) × 100, rounded to one decimal place.
3. WHEN an employee has zero records with source `face` for the selected period, THE Attendance_Grid SHALL highlight that employee row with a distinct background color differentiating it from rows that have face attendance data.
4. IF no attendance data exists for any employee in the selected site and period, THEN THE Attendance_Grid SHALL display the summary bar with all source counts as 0 and the face recognition percentage as 0.0%.
5. WHEN the selected period or site changes, THE Attendance_Grid SHALL recalculate and update the summary bar counts and face recognition percentage to reflect the newly selected site and period.
