# Spec Delta

## Purpose

Enables event attendees and sales teams to scan physical business cards, extract structured contact information via Vision AI, persist card images, and manage contacts with high-fidelity previews and quick actions.

## ADDED Requirements

### Requirement: Business card image capture and upload
The system SHALL allow users to capture photos of business cards using their device camera or file upload, and store the images securely in persistent storage.

#### Scenario: Successful image capture and upload
- **WHEN** the user selects an image file or captures a photo of a business card
- **THEN** the system uploads the image to persistent S3 storage under the business-cards prefix and returns a persistent proxy URL

### Requirement: Vision AI information extraction
The system SHALL extract structured contact information from the uploaded business card image using a Vision AI service.

#### Scenario: Successful contact information extraction
- **WHEN** a business card image is submitted to the Vision AI extraction service
- **THEN** the system returns structured fields including full name, company name, job title, phone/WhatsApp number, email, address, and website

#### Scenario: Partial or low quality card extraction
- **WHEN** an uploaded card image contains partially readable or incomplete information
- **THEN** the system returns identifiable fields with empty values for unreadable fields and allows manual correction in the review interface

### Requirement: Contact review and context enrichment
The system SHALL provide an editable review form allowing the user to verify extracted details, specify the expo event name, and append meeting notes before saving.

#### Scenario: Verifying and saving contact
- **WHEN** the user reviews the extracted fields, assigns the expo event name and notes, and submits the form
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
