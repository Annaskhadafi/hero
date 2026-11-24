# Spec Delta

## Purpose

Enables event attendees and sales teams to scan physical business cards, extract structured contact information via Vision AI, persist card images, and manage contacts with high-fidelity previews and quick actions.

## ADDED Requirements

### Requirement: Business card image capture and upload
The system SHALL allow users to capture photos of business cards using their device camera or file upload, and store the images securely in persistent storage.

#### Scenario: Successful image capture and upload
- **WHEN** the user selects a file or captures a photo on mobile or desktop
- **THEN** the user can move and resize a crop frame before confirming
- **AND** only the confirmed crop is uploaded to S3 and submitted to OpenAI

### Requirement: Vision AI information extraction
The system SHALL extract structured contact information using the existing HERO OpenAI configuration and never report successful extraction on provider failure.

#### Scenario: Successful contact information extraction
- **WHEN** a business card image is submitted to the Vision AI extraction service
- **THEN** the system returns structured fields including full name, company name, job title, phone/WhatsApp number, email, address, and website

#### Scenario: Partial or low quality card extraction
- **WHEN** an uploaded card image contains partially readable or incomplete information
- **THEN** the system returns identifiable fields with empty values for unreadable fields and allows manual correction in the review interface

#### Scenario: Review business information or recover from an extraction error
- **WHEN** the card is processed
- **THEN** the user can choose or correct the business category separately from contact category and edit products or services
- **AND** suggestions are based only on legible evidence on the card; absent information stays blank
- **AND** if extraction fails, the user sees a manual-entry message without raw provider details or fabricated data

### Requirement: Contact review and context enrichment
The system SHALL provide an editable review form allowing the user to verify extracted details, specify the expo event name, and append meeting notes before saving.

#### Scenario: Verifying and saving contact
- **WHEN** the user reviews the fields and submits the form with or without an expo event name
- **THEN** the system persists the business card record in the database and adds it to the active contact directory

### Requirement: Standardized contact listing and search
The system SHALL display saved business cards in a standardized HeroDataTable supporting instant search, multi-field filtering, and data export.

#### Scenario: Searching contacts by keyword
- **WHEN** the user types a search query matching a contact name, company, or expo event
- **THEN** the system immediately filters the displayed records to match the query

#### Scenario: Exporting contacts to Excel or CSV
- **WHEN** the user selects the export action from the contacts table toolbar
- **THEN** the system generates and downloads an Excel or CSV file containing all filtered contact records

### Requirement: Business card preview and quick actions
The system SHALL provide a document-style detail modal displaying the original card photograph side-by-side with structured contact information and direct action buttons.

#### Scenario: Opening card preview modal
- **WHEN** the user clicks the view action on any contact record
- **THEN** the system opens a wide detail modal showing the high-resolution original card photo alongside contact information with direct WhatsApp and Email shortcuts

### Requirement: Private card ownership
The system SHALL enforce the feature permissions and restrict card reads, exports, image access, edits, and deletion to the authenticated owner on mobile and desktop. No delegation is provided.

#### Scenario: Another user attempts access
- **WHEN** a user with menu access requests another user's record, export data, or photo link or attempts to change or delete that record
- **THEN** the system does not disclose the record or image and rejects mutation
