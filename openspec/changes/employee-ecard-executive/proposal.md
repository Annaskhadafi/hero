# Proposal

## Why
The TKT-0004 prototype approved for implementation makes the employee, rather than corporate copy, the focus of the digital business card.

## What Changes
- Implement the English Chitra Executive profile: navy and gold identity, Save Contact, Show QR, and Contact, Company, and Gallery tabs.
- Include headquarters links, an operations slideshow, illustrated product details, Services, and an on-demand Instagram preview.
- Keep existing sharing, vCard, and revocation controls. QR opens the employee’s public e-card. Expo Scanner is out of scope.

## Capabilities
### New Capabilities
- `employee-ecard`: Employee contact card and its public sharing and company content.

### Modified Capabilities
None.

## Impact
Employee mobile profile, public `/business-card/[token]`, company content assets, and browser regressions. No database migration planned.
