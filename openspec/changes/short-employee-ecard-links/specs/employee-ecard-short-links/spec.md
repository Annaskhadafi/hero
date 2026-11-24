# Spec Delta

## Purpose
Provide readable employee e-card links without changing the name displayed on the card or saved in contacts.

## ADDED Requirements

### Requirement: Short stable public card aliases
The system SHALL issue unique, stable name-based aliases to opted-in employee cards, shortening long names in the URL only. New share links, QR codes and vCard website fields SHALL use the alias when available.

#### Scenario: Long name on a shared card
- **WHEN** an employee with a long name shares their e-card
- **THEN** the URL uses a shortened name while the card and imported contact retain the full name

#### Scenario: Employees share the same name
- **WHEN** two employees would receive the same alias
- **THEN** a short suffix disambiguates the later alias without changing the existing link

### Requirement: Sharing rules apply to both URL formats
The system SHALL preserve valid legacy links and enforce opt-in and active employee status on both URL formats and their vCards.

#### Scenario: Public sharing is disabled
- **WHEN** an employee turns off public sharing
- **THEN** both the name-based and legacy links return 404 for the card and vCard
