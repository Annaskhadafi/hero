# Proposal

## Why
Supervisors and managers need to leave feedback on Daily Activity without overwriting the employee’s original field remarks.

## What Changes
- Add a Catatan Atasan column and a per-row Tambah Catatan Atasan action on the Daily Activity dashboard.
- Allow authorized employees at Supervisor level or above to append timestamped notes to activities in their existing data scope. Allow the employee who owns the activity and authorized supervisors to read them.

## Capabilities
### New Capabilities
- `daily-activity-supervisor-notes`: Scoped, identifiable supervisor feedback on Daily Activity.

### Modified Capabilities
None.

## Impact
Daily Activity dashboard, server queries and mutations, and an additive database migration. Employee field remarks, activity status, and approval decisions remain unchanged.
