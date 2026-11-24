# Spec Delta

## Purpose
Let consenting HERO employees share a digital contact profile with quick access to their contact details and verified Chitra Paratama company information.

## ADDED Requirements

### Requirement: Person-first English contact profile
The e-card SHALL put the employee’s name and job title above optional company content, with a navy-and-gold presentation and one-tap Save Contact and Show QR actions when sharing is enabled.

#### Scenario: Recipient opens a shared e-card
- **WHEN** a visitor opens an enabled public e-card
- **THEN** the employee identity and primary actions are visible immediately and the QR encodes that employee’s public e-card URL, not the corporate site

### Requirement: Interactive corporate content
The profile SHALL provide Contact, Company, and Gallery tabs, with map, telephone and official website links; an operations photo slideshow; a two-column product and services catalog; and on-demand official Instagram embedding with independent fallback links.

#### Scenario: Visitor examines a product
- **WHEN** a visitor selects Company and opens a product card
- **THEN** the profile shows an English description, relevant verified product image and attribution; model examples are not presented as stock promises

### Requirement: Sharing privacy stays unchanged
The redesign SHALL preserve employee opt-in, revocation, and the public page/vCard authorization checks without exposing private profile data or changing the Expo Scanner.

#### Scenario: Employee revokes sharing
- **WHEN** the employee disables public sharing
- **THEN** both the former public profile and vCard stop returning contact details
