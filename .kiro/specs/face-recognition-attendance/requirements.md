# Requirements Document

## Introduction

Face Recognition Attendance is a biometric attendance system for the HERO mobile app (PWA). It enables employees to register their face once, then use real-time face recognition for daily check-in/check-out. The system uses client-side face detection and embedding extraction (face-api.js / TensorFlow.js), server-side embedding storage and cosine similarity verification, basic anti-spoofing via blink detection, and a photo fallback mechanism when recognition fails. Successful verification automatically records attendance and syncs to the existing timesheet system.

## Glossary

- **Face_Registration_Service**: The client-side module responsible for capturing a user's face, extracting the face embedding, and sending it to the server for storage during one-time registration.
- **Face_Verification_Service**: The server-side module that receives a live face embedding and compares it against the stored embedding using cosine similarity to verify identity.
- **Embedding**: A 128-dimensional float array representing a face's unique biometric features, extracted by face-api.js.
- **Cosine_Similarity**: A mathematical measure of similarity between two vectors, used to compare face embeddings. Range: -1 to 1, where 1 means identical.
- **Match_Threshold**: The minimum cosine similarity score (0.6) required to consider a face verification successful.
- **Blink_Detector**: The client-side anti-spoofing module that detects eye blinks to confirm a live person is present before capturing the face.
- **Photo_Fallback_Service**: The module that captures a manual photo as proof of attendance when face recognition fails, marking the record for admin review.
- **Attendance_Recorder**: The server-side module that creates attendance records upon successful face verification and syncs them to the timesheet system.
- **Admin_Panel**: The administrative interface for viewing face registration status, managing face data, and reviewing photo-fallback attendance records.
- **Face_Model_Loader**: The client-side module responsible for loading and caching the face-api.js TensorFlow.js models (~6MB).

## Requirements

### Requirement 1: Face Model Loading

**User Story:** As an employee, I want the face recognition models to load efficiently on my mobile device, so that I can use face attendance without long wait times.

#### Acceptance Criteria

1. WHEN the employee opens the attendance screen for the first time, THE Face_Model_Loader SHALL download the face-api.js models (SSD MobileNet v1, face landmark 68-point, face recognition) from the application server.
2. WHEN the face-api.js models have been downloaded, THE Face_Model_Loader SHALL cache the models in the browser using IndexedDB or Cache API for subsequent sessions.
3. WHILE the models are loading, THE Face_Model_Loader SHALL display a progress indicator showing the download percentage.
4. IF the model download fails due to network error, THEN THE Face_Model_Loader SHALL display an error message and provide a retry button.
5. WHEN the models are already cached, THE Face_Model_Loader SHALL load models from cache within 3 seconds on a mid-range mobile device.

### Requirement 2: Face Registration

**User Story:** As an employee, I want to register my face once so that the system can recognize me for daily attendance.

#### Acceptance Criteria

1. WHEN the employee opens the face registration screen, THE Face_Registration_Service SHALL activate the device front-facing camera and display a live preview.
2. WHILE the camera is active, THE Face_Registration_Service SHALL display a face alignment guide overlay (oval frame) to help the employee position their face correctly.
3. WHEN a face is detected within the alignment guide, THE Face_Registration_Service SHALL extract a 128-dimensional float array embedding from the detected face.
4. IF no face is detected within 10 seconds of camera activation, THEN THE Face_Registration_Service SHALL display a guidance message instructing the employee to position their face within the frame.
5. IF multiple faces are detected in the camera frame, THEN THE Face_Registration_Service SHALL display a warning message requesting only one face be visible.
6. WHEN a valid embedding is extracted, THE Face_Registration_Service SHALL send the embedding to the server via a POST request to the face registration API endpoint.
7. WHEN the server receives a valid embedding, THE Face_Registration_Service SHALL store the embedding linked to the employee record with a registration timestamp.
8. IF the employee already has a registered embedding, THEN THE Face_Registration_Service SHALL replace the existing embedding with the new one and update the registration timestamp.
9. WHEN registration completes successfully, THE Face_Registration_Service SHALL display a success confirmation with the registration timestamp.
10. IF the server returns an error during registration, THEN THE Face_Registration_Service SHALL display the error message and allow the employee to retry.

### Requirement 3: Anti-Spoofing Blink Detection

**User Story:** As a system administrator, I want basic anti-spoofing measures so that employees cannot use photos or videos to fake attendance.

#### Acceptance Criteria

1. WHEN the employee initiates face capture (for registration or attendance), THE Blink_Detector SHALL monitor the eye aspect ratio of the detected face landmarks in real-time.
2. THE Blink_Detector SHALL require the employee to blink at least once within a 5-second detection window before allowing face capture to proceed.
3. WHEN a blink is detected (eye aspect ratio drops below 0.2 then returns above 0.2 within 400ms), THE Blink_Detector SHALL mark the liveness check as passed.
4. IF no blink is detected within the 5-second window, THEN THE Blink_Detector SHALL display a message instructing the employee to blink naturally and restart the detection window.
5. WHILE the blink detection is in progress, THE Blink_Detector SHALL display a visual indicator showing the liveness check status.

### Requirement 4: Face Verification for Attendance

**User Story:** As an employee, I want to verify my identity using face recognition so that I can quickly check in and check out.

#### Acceptance Criteria

1. WHEN the employee opens the attendance check-in or check-out screen, THE Face_Verification_Service SHALL activate the front-facing camera and begin real-time face detection.
2. WHEN a face is detected and the blink liveness check passes, THE Face_Verification_Service SHALL extract the 128-dimensional embedding from the live face.
3. WHEN a live embedding is extracted, THE Face_Verification_Service SHALL send the embedding to the server verification API endpoint along with the employee identifier.
4. WHEN the server receives the live embedding, THE Face_Verification_Service SHALL compute the cosine similarity between the live embedding and the stored embedding for that employee.
5. WHEN the cosine similarity score exceeds the Match_Threshold of 0.6, THE Face_Verification_Service SHALL return a verification success response with the similarity score.
6. IF the cosine similarity score is at or below the Match_Threshold of 0.6, THEN THE Face_Verification_Service SHALL return a verification failure response indicating no match.
7. IF the employee has no stored embedding, THEN THE Face_Verification_Service SHALL return an error indicating the employee must register their face first.
8. THE Face_Verification_Service SHALL complete the embedding comparison and return a response within 500ms of receiving the request.

### Requirement 5: Attendance Recording on Successful Verification

**User Story:** As an employee, I want my attendance to be recorded automatically when face verification succeeds, so that I do not need additional manual steps.

#### Acceptance Criteria

1. WHEN face verification succeeds (cosine similarity above Match_Threshold), THE Attendance_Recorder SHALL create an attendance record with the event type (check-in or check-out), timestamp, employee identifier, site identifier, confidence score, and source set to "face-recognition".
2. WHEN an attendance record is created, THE Attendance_Recorder SHALL sync the record to the timesheet system (timesheetAttendanceRealOverrides) using the existing face-attendance-sync module.
3. WHEN attendance is recorded successfully, THE Attendance_Recorder SHALL display a success confirmation to the employee showing the event type and timestamp.
4. IF an attendance record with the same clientRequestId already exists, THEN THE Attendance_Recorder SHALL return the existing record without creating a duplicate.
5. THE Attendance_Recorder SHALL capture the device GPS coordinates (latitude, longitude) at the time of attendance recording.

### Requirement 6: Photo Fallback Mechanism

**User Story:** As an employee, I want a fallback option when face recognition fails, so that I can still record my attendance.

#### Acceptance Criteria

1. WHEN face verification fails (no match) for 3 consecutive attempts, THE Photo_Fallback_Service SHALL display a notification informing the employee that face recognition has failed and offer the photo fallback option.
2. WHEN the employee selects the photo fallback option, THE Photo_Fallback_Service SHALL activate the camera for manual photo capture.
3. WHEN the employee captures a photo, THE Photo_Fallback_Service SHALL upload the photo to the server and create an attendance record with source set to "photo-fallback".
4. IF no face is detected in the camera feed for 15 seconds during verification attempts, THEN THE Photo_Fallback_Service SHALL offer the photo fallback option immediately without requiring 3 failed match attempts.
5. IF the confidence score of a detected face is below 0.3 (low quality detection), THEN THE Photo_Fallback_Service SHALL offer the photo fallback option immediately.
6. WHEN a photo-fallback attendance record is created, THE Photo_Fallback_Service SHALL mark the record with a "needs-review" flag for administrator review.
7. THE Photo_Fallback_Service SHALL store the fallback photo with a maximum file size of 5MB in JPEG or PNG format.

### Requirement 7: Face Registration API

**User Story:** As a system developer, I want a server API for face embedding registration so that the mobile app can store and update face data.

#### Acceptance Criteria

1. THE Face_Registration_Service SHALL expose a POST endpoint at `/api/mobile/face-registration` that accepts an employee identifier and a 128-dimensional float array embedding.
2. WHEN the endpoint receives a valid request, THE Face_Registration_Service SHALL validate that the embedding array contains exactly 128 floating-point numbers.
3. WHEN the embedding is valid, THE Face_Registration_Service SHALL store the embedding in the database linked to the employee with a created-at timestamp.
4. IF the request is missing the employee identifier or embedding, THEN THE Face_Registration_Service SHALL return a 400 status with a descriptive error message.
5. IF the employee identifier does not correspond to an active employee, THEN THE Face_Registration_Service SHALL return a 404 status with an error message.
6. WHEN the endpoint receives a request for an employee who already has a stored embedding, THE Face_Registration_Service SHALL overwrite the existing embedding and update the timestamp.
7. THE Face_Registration_Service SHALL require a valid authentication token in the Authorization header.

### Requirement 8: Face Verification API

**User Story:** As a system developer, I want a server API for face verification so that the mobile app can compare live embeddings against stored data.

#### Acceptance Criteria

1. THE Face_Verification_Service SHALL expose a POST endpoint at `/api/mobile/face-verification` that accepts an employee identifier and a 128-dimensional float array embedding.
2. WHEN the endpoint receives a valid request, THE Face_Verification_Service SHALL retrieve the stored embedding for the specified employee.
3. WHEN both embeddings are available, THE Face_Verification_Service SHALL compute the cosine similarity between the live embedding and the stored embedding.
4. WHEN the cosine similarity exceeds 0.6, THE Face_Verification_Service SHALL return a response with `verified: true` and the similarity score.
5. WHEN the cosine similarity is at or below 0.6, THE Face_Verification_Service SHALL return a response with `verified: false` and the similarity score.
6. IF the employee has no stored embedding, THEN THE Face_Verification_Service SHALL return a 404 status indicating no face registration found.
7. IF the embedding array does not contain exactly 128 floating-point numbers, THEN THE Face_Verification_Service SHALL return a 400 status with a validation error.
8. THE Face_Verification_Service SHALL require a valid authentication token in the Authorization header.

### Requirement 9: Admin Panel - Face Registration Management

**User Story:** As an administrator, I want to view and manage employee face registrations so that I can ensure the system is properly configured.

#### Acceptance Criteria

1. WHEN the administrator opens the face registration management page, THE Admin_Panel SHALL display a list of all employees with their face registration status (registered, not registered).
2. THE Admin_Panel SHALL display the registration timestamp for employees who have registered their face.
3. WHEN the administrator selects an employee, THE Admin_Panel SHALL provide an option to delete the stored face embedding (force re-registration).
4. WHEN the administrator deletes a face embedding, THE Admin_Panel SHALL remove the embedding from the database and update the employee status to "not registered".
5. THE Admin_Panel SHALL provide a filter to show only employees without face registration.
6. THE Admin_Panel SHALL display the total count of registered and unregistered employees as summary statistics.

### Requirement 10: Admin Panel - Photo Fallback Review

**User Story:** As an administrator, I want to review photo-fallback attendance records so that I can verify attendance for cases where face recognition failed.

#### Acceptance Criteria

1. WHEN the administrator opens the photo fallback review page, THE Admin_Panel SHALL display a list of all attendance records with source "photo-fallback" and "needs-review" flag.
2. THE Admin_Panel SHALL display the fallback photo, employee name, event type, timestamp, and site for each record.
3. WHEN the administrator reviews a record, THE Admin_Panel SHALL provide options to approve or reject the attendance record.
4. WHEN the administrator approves a photo-fallback record, THE Admin_Panel SHALL update the record status to "verified" and remove the "needs-review" flag.
5. WHEN the administrator rejects a photo-fallback record, THE Admin_Panel SHALL update the record status to "rejected" and record the rejection reason.
6. THE Admin_Panel SHALL provide a filter to show records by status (pending review, approved, rejected).

### Requirement 11: Embedding Storage Efficiency

**User Story:** As a system architect, I want face embeddings stored efficiently so that the system scales without excessive storage costs.

#### Acceptance Criteria

1. THE Face_Registration_Service SHALL store each face embedding as a JSON array of 128 floating-point numbers in a single database column.
2. THE Face_Registration_Service SHALL store at most one active embedding per employee at any time.
3. WHEN an employee re-registers, THE Face_Registration_Service SHALL overwrite the previous embedding rather than creating additional records.
4. THE Face_Verification_Service SHALL retrieve the stored embedding in a single database query without requiring joins to additional tables.

### Requirement 12: Integration with Existing Attendance System

**User Story:** As a system developer, I want face recognition attendance to integrate with the existing attendance and timesheet system so that all attendance data flows through a unified pipeline.

#### Acceptance Criteria

1. WHEN face verification succeeds and attendance is recorded, THE Attendance_Recorder SHALL create a record in the existing `attendanceRecords` table with the appropriate fields (employeeId, siteId, eventType, eventTime, status, photoUrl, latitude, longitude, confidenceScore, deviceType, clientRequestId).
2. WHEN an attendance record is created, THE Attendance_Recorder SHALL invoke the `syncFaceAttendanceToTimesheet` function to upsert data into `timesheetAttendanceRealOverrides`.
3. THE Attendance_Recorder SHALL set the `deviceType` field to "mobile" for PWA-based face attendance submissions.
4. THE Attendance_Recorder SHALL generate a unique `clientRequestId` on the client side to enable idempotent submissions.
5. IF the timesheet sync fails, THEN THE Attendance_Recorder SHALL log the error and still return success for the attendance record creation (eventual consistency).
