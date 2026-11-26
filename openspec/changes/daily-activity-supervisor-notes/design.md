# Design

## Context
Daily Activity already shows employee field remarks. The dashboard groups activities by employee; the note must point to a specific activity, not an arbitrary employee row.

## Goals / Non-Goals
Keep feedback separate and auditable. Do not alter field remarks, status, or approvals. Editing/removing notes and exporting them are out of scope.

## Decisions
- Add an append-only note table keyed by activity ID with server-derived author and timestamp. Store plain text and cap notes at 1,000 characters.
- Resolve identity and eligible position from User Management. Check the authoritative job classification and Daily Activity permissions and data scope on the server. Deny unknown rank; no substring match or role-name bypass. If no reliable Supervisor threshold is configured, require an explicit mapping before activation.
- Show latest authorized note and count in Catatan Atasan. For employee rows containing multiple activities, identify or select the activity before writing. Show history in a template dialog; hide write controls for readers. Owners can read their own notes wherever the existing authorized activity detail is available.
- Notify the employee via HERO notification bell; no email, approval, or reminder change.

## Risks / Trade-offs
Notes are private to the activity owner and authorized supervisors. Do not serialize them for other viewers or add them to exports. Verify grouped activity associations, cross-scope denial, and additive migration before an authorized release.
