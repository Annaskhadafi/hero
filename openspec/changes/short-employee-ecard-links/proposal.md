# Proposal

## Why
The long random e-card URL wraps over multiple lines when imported as an Android contact. A concise name-based link is easier to read and share.

## What Changes
- Issue short readable name aliases for opted-in cards, shortening long names only in the URL.
- Use the alias for new share links, QR codes and the vCard website field. Keep old links compatible and preserve opt-out across both URL forms.

## Capabilities
### New Capabilities
- `employee-ecard-short-links`: Stable name aliases and their sharing behavior; complements the existing unarchived employee e-card change.

### Modified Capabilities
None in the main spec store.

## Impact
Employee e-card sharing, public profile and vCard routes, and an additive employee alias migration. No Expo Scanner changes.
