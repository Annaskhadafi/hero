# Spec Delta

## Purpose

Let HERO mobile users find and open available dashboard menus on small screens without the quick search controls or results being obscured.

## ADDED Requirements

### Requirement: Quick search stays usable in the visible viewport
The mobile dashboard search panel SHALL keep its search input, close action, category controls, and results reachable within the visible viewport. Content that does not fit SHALL be scrollable without clipping controls behind the keyboard or system navigation area.

#### Scenario: Open search on a small screen
- **WHEN** a user opens quick search on a small mobile viewport
- **THEN** the search input and close action are visible and usable
- **AND** category controls and results are reachable without scrolling the dashboard behind the panel

#### Scenario: Search with the on-screen keyboard open
- **WHEN** the keyboard opens while a user types in quick search
- **THEN** the search input remains visible and the matching results remain reachable
- **AND** dismissing the keyboard restores the larger available area without losing the current query or category

### Requirement: Selecting a search result preserves existing navigation
Quick search SHALL use the existing menu set and category and text filters, and selecting a result SHALL open the associated destination.

#### Scenario: Find and open a permitted menu
- **WHEN** a user enters a query matching an available menu and selects its result
- **THEN** the search panel closes and the existing menu destination or request group opens
