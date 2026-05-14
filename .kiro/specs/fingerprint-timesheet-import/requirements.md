# Requirements Document

## Introduction

Add fingerprint data import support to the Schedule Timesheet page (Attendance Real tab). The fingerprint data originates from an Excel file ("Finger Print BPP.xlsx") exported from a fingerprint attendance machine. This import source works alongside the existing Excel import functionality — the same "Import Excel" button handles both formats via auto-detection. The system already has a `fingerprint-detail` template detector in the attendance template parser; this feature ensures the full pipeline (detection → parsing → matching → preview → save) works correctly for the BPP fingerprint format and is accessible from the UI without additional user configuration.

## Glossary

- **Timesheet_Page**: The Schedule Timesheet workspace component (`scheduling-timesheet-workspace.tsx`) under the Schedule menu in the dashboard
- **Attendance_Real_Tab**: The "Attendance" sub-tab within the Timesheet_Page where actual attendance data is managed
- **Import_Button**: The "Import Excel" button in the Attendance_Real_Tab toolbar that triggers file selection
- **Template_Parser**: The `parseAttendanceWorkbook` function in `attendance-template-parser.ts` that auto-detects Excel format and extracts attendance rows
- **Fingerprint_Detail_Format**: An Excel format exported from fingerprint machines with structure: title row ("Lap. Detail Absensi"), date range row, day-number header row (1–30/31), then alternating employee ID/Name rows and scan-time rows
- **Employee_Block**: A pair of consecutive rows in Fingerprint_Detail_Format — first row contains "ID:" with employee SN and "Nama:" with employee name; second row contains compressed clock-in/clock-out times per day column
- **Compressed_Time**: A cell value containing concatenated time pairs (e.g., "07:5217:56" meaning clock-in 07:52, clock-out 17:56) or single times (e.g., "07:52")
- **Employee_Matcher**: The fuzzy matching system (Fuse.js + exact SN/name lookup) that maps Excel names/IDs to HERO employee records
- **Import_Preview**: The intermediate state showing matched/unmatched employees and conflicts before data is committed
- **BPP_Site**: The Balikpapan site where the fingerprint machine is deployed

## Requirements

### Requirement 1: Fingerprint Detail Format Detection

**User Story:** As an admin, I want the system to automatically detect the "Finger Print BPP" Excel format when I upload it, so that I do not need to manually configure the import template.

#### Acceptance Criteria

1. WHEN an Excel file is uploaded whose first 8 rows contain a cell matching "Lap. Detail Absensi" or "Lap Detail Absensi" (case-insensitive, ignoring punctuation), or whose sheet name contains "Log Absen" or "Detail Log" (case-insensitive, ignoring punctuation), THE Template_Parser SHALL consider the file a candidate for `fingerprint-detail` detection
2. WHEN the Excel file contains a row where at least 5 of the first 14 columns hold a numeric value equal to the column's 1-based position (i.e., column 1 holds "1", column 2 holds "2", etc.), THE Template_Parser SHALL use that row as the day-column header reference
3. WHEN the Excel file contains a row where the first cell is "ID" (case-insensitive) and at least one other cell in the same row is "Nama" (case-insensitive), THE Template_Parser SHALL recognize that row as an Employee_Block marker
4. IF all three conditions are satisfied (candidate marker from criterion 1, day-column header row from criterion 2, and at least one Employee_Block marker from criterion 3), THEN THE Template_Parser SHALL identify the file as `fingerprint-detail` kind with a confidence score of 100
5. IF any of the three conditions (candidate marker, day-column header row, Employee_Block marker) is not satisfied, THEN THE Template_Parser SHALL not identify the file as `fingerprint-detail` and SHALL allow other template detectors to evaluate the file

### Requirement 2: Employee Block Parsing

**User Story:** As an admin, I want the system to correctly extract employee identity and scan times from the fingerprint format, so that attendance data is accurately imported.

#### Acceptance Criteria

1. WHEN an Employee_Block is encountered, THE Template_Parser SHALL extract the employee SN from the first cell containing only digits (matching pattern `^\d+$`) that appears after the "ID" label in the first row of the block
2. WHEN an Employee_Block is encountered, THE Template_Parser SHALL extract the employee name from the cell at offset +2 from the "Nama" label in the first row, falling back to offset +1 if the +2 cell is empty
3. WHEN the scan-time row contains a Compressed_Time value for a day column, THE Template_Parser SHALL extract all time tokens matching the pattern `HH:MM` or `HH.MM` and assign the first valid token as clockIn and the last valid token as clockOut
4. WHEN a Compressed_Time cell contains exactly one valid time token (e.g., "07:52"), THE Template_Parser SHALL assign it as clockIn with an empty clockOut
5. WHEN a Compressed_Time cell contains two or more valid time tokens (e.g., "07:5217:56" or "07:5707:5717:3017:30"), THE Template_Parser SHALL assign the first token as clockIn and the last token as clockOut, discarding intermediate tokens
6. WHEN a day column cell is empty in the scan-time row, THE Template_Parser SHALL skip that day for the employee (no attendance record generated)
7. IF a time token has an hour value greater than 23 or a minute value greater than 59, THEN THE Template_Parser SHALL discard that token and not include it in clockIn or clockOut assignment
8. IF all time tokens in a Compressed_Time cell are invalid (hour > 23 or minute > 59), THEN THE Template_Parser SHALL skip that day for the employee (no attendance record generated)
9. IF the scan-time row (the row immediately following the employee identity row) contains no valid time data for any day column, THEN THE Template_Parser SHALL produce zero attendance records for that employee

### Requirement 3: Employee Matching

**User Story:** As an admin, I want fingerprint data to be matched to HERO employees by SN or name, so that attendance records are linked to the correct person.

#### Acceptance Criteria

1. WHEN a parsed employee SN from the fingerprint file, after normalization (lowercased, whitespace-collapsed, non-alphanumeric characters removed), matches a HERO employee's normalized `employeeSn` field, THE Employee_Matcher SHALL use that as the primary match (SN match)
2. WHEN no SN match is found, THE Employee_Matcher SHALL attempt a normalized name match (lowercased, whitespace-collapsed, non-alphanumeric characters removed) against HERO employee names
3. WHEN no SN match and no exact name match is found, THE Employee_Matcher SHALL attempt an alias match by comparing the normalized parsed SN and name against configured employee alias SNs and alias names
4. WHEN no SN, name, or alias match is found, THE Employee_Matcher SHALL attempt a fuzzy match using Fuse.js with a threshold of 0.32, ignoreLocation enabled, and minMatchCharLength of 3, searching across normalized names, SNs, and aliases
5. IF a fuzzy match score exceeds 0.2, THEN THE Employee_Matcher SHALL flag the row with a "low-confidence" validation warning
6. IF a parsed employee cannot be matched to any HERO employee by any method (SN, name, alias, or fuzzy), THEN THE Import_Button SHALL increment the unmatched count and include the employee's original name (deduplicated, maximum 50 names) in the unmatched names list displayed to the admin
7. THE Employee_Matcher SHALL use the matched employee's canonical name from HERO as the `matchedName` in the output rows regardless of the raw name or SN values from the Excel file

### Requirement 4: Period Auto-Detection

**User Story:** As an admin, I want the system to detect the correct period from the fingerprint file, so that I do not need to manually adjust the period selector before importing.

#### Acceptance Criteria

1. WHEN the fingerprint file contains a date range row matching the pattern "YYYY-MM-DD ~ YYYY-MM-DD" (e.g., "2026-04-01 ~ 2026-04-30") within the first 10 rows of the first sheet, THE Template_Parser SHALL extract the period as the year-month portion (YYYY-MM) of the start date
2. WHEN the extracted period differs from the currently selected period in the UI, THE Timesheet_Page SHALL update the period selector to the extracted period and display an informational toast indicating the detected period value
3. IF no date range row is found and no rows are parsed for the current period, THEN THE Timesheet_Page SHALL scan the first 30 data rows for date values in recognized formats (ISO YYYY-MM-DD, dd-Mon-yyyy) and re-parse using the first detected period
4. IF period auto-detection fails (no date range row found and no parseable dates in data rows), THEN THE Timesheet_Page SHALL display an error toast indicating that no data was found for the selected period and abort the import

### Requirement 5: Import Execution and Persistence

**User Story:** As an admin, I want imported fingerprint data to be saved to the database and reflected in the attendance grid immediately, so that I can review and finalize the timesheet.

#### Acceptance Criteria

1. WHEN fingerprint data is successfully parsed and at least one employee is matched, THE Timesheet_Page SHALL update the attendance grid cells with status "present", clockIn, and clockOut values for each matched employee-day pair
2. WHEN fingerprint data is successfully parsed and matched, THE Timesheet_Page SHALL save the matched attendance overrides to the database with source "excel" within 30 seconds of the grid update
3. WHEN an attendance cell already has data from a previous import or manual entry for the same employee and day, THE Timesheet_Page SHALL overwrite the existing status, clockIn, and clockOut values with the new fingerprint data
4. IF the database save fails after cell updates are applied, THEN THE Timesheet_Page SHALL display an error toast with a minimum duration of 10 seconds instructing the user to click "Save Attendance" to retry, and the toast SHALL remain visible until dismissed or the page is navigated away
5. WHEN the import completes with at least one matched employee, THE Timesheet_Page SHALL display a success toast showing the count of matched employees and the count of unmatched employees
6. IF the import completes with zero matched employees, THEN THE Timesheet_Page SHALL display an error toast indicating no employees matched and SHALL NOT update any grid cells or save to the database

### Requirement 6: Schedule Conflict Auto-Resolution

**User Story:** As an admin, I want the system to automatically adjust the schedule when fingerprint data shows an employee worked on a scheduled OFF/FB/Sakit/Libur day, so that the timesheet reflects reality.

#### Acceptance Criteria

1. WHEN imported attendance data contains a cell with status equal to "present" for a day where the employee's schedule code is OFF, FB, Sakit, or Libur, THE Timesheet_Page SHALL override that schedule cell to IN if the site's schedule type is "office", or DS if the site's schedule type is "shift"
2. WHEN imported attendance data contains a cell with status other than "present" (sick, leave, absent, or empty) for a day where the employee's schedule code is OFF, FB, Sakit, or Libur, THE Timesheet_Page SHALL preserve the original schedule code for that day without applying an override
3. THE Timesheet_Page SHALL preserve the original schedule code for any day where no attendance data has been imported for that employee-day combination
4. IF the auto-resolved schedule overrides fail to persist to the database, THEN THE Timesheet_Page SHALL display the overrides in the UI, indicate that changes are unsaved, and provide a mechanism for the admin to retry saving

### Requirement 7: Backward Compatibility

**User Story:** As an admin, I want the existing import formats (row-log, matrix, contractor-detail) to continue working unchanged, so that other sites' data can still be imported.

#### Acceptance Criteria

1. WHEN a row-log format Excel file is uploaded, THE Template_Parser SHALL detect the format as "row-log" and produce the same parsed rows (employeeSn, employeeName, day, clockIn, clockOut) as the parser version prior to this feature for the same input file
2. WHEN a matrix format Excel file is uploaded, THE Template_Parser SHALL detect the format as "matrix" and produce the same parsed attendance rows per employee per day as the parser version prior to this feature for the same input file
3. WHEN a contractor-detail format Excel file is uploaded, THE Template_Parser SHALL detect the format as "contractor-detail" and produce the same parsed rows as the parser version prior to this feature for the same input file
4. THE Import_Button SHALL accept .xlsx, .xls, and .csv file types without changes to the file input element
5. IF a file matches both a legacy format (row-log, matrix, contractor-detail) and the fingerprint-detail detection rules, THEN THE Template_Parser SHALL prioritize the legacy format detection and parse accordingly

### Requirement 8: Error Handling

**User Story:** As an admin, I want clear error messages when the fingerprint import fails, so that I can take corrective action.

#### Acceptance Criteria

1. IF the uploaded Excel file does not match any known template format (matrix, row-log, fingerprint-detail, or contractor-detail), THEN THE Template_Parser SHALL throw an error with a message indicating the template is not recognized and suggesting the admin check the Excel headers or select a manual template mapping
2. IF zero attendance rows are parsed from the fingerprint file for the currently selected period (YYYY-MM), THEN THE Timesheet_Page SHALL display an error toast stating the period and include all accumulated parsing warnings in the toast description, and SHALL NOT modify any existing attendance cell state
3. IF no employees from the fingerprint file match any HERO employees (matched count equals zero), THEN THE Timesheet_Page SHALL display an error toast indicating zero matches with the unmatched count in the description, log up to 5 sample names from the Excel file and up to 5 sample employee names from the system to the browser console, and SHALL NOT modify any existing attendance cell state
4. IF the period is finalized (finalizedAt is set, or scheduleStatus equals "finalized", or attendanceStatus equals "finalized"), THEN THE Timesheet_Page SHALL block the import action and display an error toast with the blocked action label and a description stating the period must be reopened before editing
