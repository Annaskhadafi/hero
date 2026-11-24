# Proposal

## Why
HERO ticket work needs a way for the release approver to authorize Git publication without being in Telegram. Email delivery alone must not authorize repository writes.

## What Changes
- Use the existing HERO email pipeline to send one approval request for a tested commit-and-push package to Mochamad Annas Khadafi's registered employee email.
- Collect one explicit commit-and-push decision on the matching release package through a button in the owner’s authorized Telegram DM. Email is informational only.
- Record delivery, approval, and execution separately. Do not resume ticket work until the release approval integration is verified.

## Capabilities
### New Capabilities
- `email-release-approval`: Exact-package approval and controlled publication for eligible internal HERO work.

### Modified Capabilities
None.

## Impact
HERO Settings > Email, the Hermes Telegram confirmation tool, an additive request/audit model, the trusted publisher, and the documented Git guard. No personal Gmail connection or send-as access is needed.
