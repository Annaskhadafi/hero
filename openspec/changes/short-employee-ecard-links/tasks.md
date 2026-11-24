# Tasks

## 1. Alias allocation and routing
- [ ] 1.1 Add the unique alias column and deterministic abbreviation with collision handling. Test long names, non-ASCII names, allocation races, and stable backfill of opted-in employees.
- [ ] 1.2 Use one gated resolver for aliases and legacy tokens. Test valid, malformed, unknown, disabled, and inactive cases for both public routes.

## 2. Sharing and verification
- [ ] 2.1 Use the short link in Copy Link, QR, and the vCard URL field; verify the card and downloaded contact still use the full name.
- [ ] 2.2 Run browser E2E with a disposable database, attach sanitized screenshots, update the internal monthly report, and verify the target migration before any authorized publication.
