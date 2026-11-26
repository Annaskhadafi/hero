## ADDED Requirements

### Requirement: Scoped supervisor notes
The dashboard SHALL display a Catatan Atasan column and allow employees classified as Supervisor or above with Daily Activity edit permission to append a note to an activity within their existing data scope. The server SHALL record the authenticated author and timestamp.

#### Scenario: Add feedback to a specific activity
- **WHEN** an eligible supervisor selects a specific activity in their scope and submits a nonblank note
- **THEN** the note appears with its author and timestamp without changing employee remarks, status, or approval

#### Scenario: Ineligible write attempt
- **WHEN** a caller lacks supervisor classification, permission, or scope
- **THEN** the server denies the operation even if called directly

### Requirement: Private feedback visibility
The system SHALL expose notes only to the owner of the activity and authorized supervisors. Notes SHALL NOT be added to exports.

#### Scenario: Employee receives feedback
- **WHEN** a note is added to the employee’s activity
- **THEN** the employee can read it and receives a HERO notification referencing the activity

#### Scenario: Other viewer requests a note
- **WHEN** a viewer is neither the activity owner nor an authorized supervisor within scope
- **THEN** the system does not include the note or its count in the response
