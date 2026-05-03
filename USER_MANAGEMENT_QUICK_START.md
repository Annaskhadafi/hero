# USER MANAGEMENT ENHANCEMENTS - QUICK START GUIDE

## WHAT WAS BUILT

**28 enhancements** across Critical, High, Medium, and Low priority:

### Critical Security (6)
- Audit trail for all user actions
- Email unique constraints at DB level
- Session management fixes
- Password reset notifications
- Soft delete pattern
- Email verification flow

### High Priority UX (6)
- Detailed bulk import error reporting
- Bulk actions (activate/ban/delete)
- User invitation system
- Manager assignment (partial)
- Profile photo upload (partial)
- Filter persistence (partial)

### Medium Performance (6)
- Optimized queries with JOIN (no more N+1)
- Full pagination support
- Centralized validation (partial)
- Import mapping persistence (partial)
- Export template (partial)
- Manager lookup optimization

### Low Priority Features (10)
- User activity dashboard infrastructure
- Advanced search (partial)
- User groups/teams tables
- Self-service profile (partial)
- Password policy config (partial)
- Account lockout fields
- 2FA/MFA (partial)
- Import history tracking
- Duplicate detection (partial)
- Onboarding (partial)

## FILES CREATED

```
lib/
  audit-logger.ts              # Audit trail system
  user-invitation.ts           # Invitation & email verification
  user-notifications.ts        # User notifications
  enhanced-user-import.ts      # Import with detailed errors
  pagination.ts                # Pagination helpers
  optimized-user-queries.ts    # Optimized SQL queries

db/
  migrations/
    add_user_constraints.sql   # DB migration
  schema/
    user-management.ts         # New tables schema

components/
  security-user-bulk-actions.tsx  # Bulk actions UI

admin-actions-audit-patch.txt     # Audit integration code
admin-actions-bulk-patch.txt      # Bulk actions handler
```

## QUICK INTEGRATION (30 MIN)

### Step 1: Run Migration (5 min)
```bash
cd D:\[01] PROJECT\HERO
psql -U postgres -d hero_db -f db/migrations/add_user_constraints.sql
```

### Step 2: Add Imports to admin-actions.ts (2 min)
Add at top of `app/dashboard/admin-actions.ts`:
```typescript
import { logAuditEvent } from "@/lib/audit-logger";
import { notifyPasswordReset, notifyRoleChanged, notifyAccountBanned } from "@/lib/user-notifications";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

async function getCurrentActorEmail(): Promise<string | undefined> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user?.email ?? undefined;
  } catch {
    return undefined;
  }
}
```

### Step 3: Add Audit to change-password Intent (5 min)
In `manageSecurityUserAction`, find `if (payload.intent === "change-password")` and add:
```typescript
const actorEmail = await getCurrentActorEmail();

// After password update, before revalidate:
await logAuditEvent({
  actorEmail,
  action: "user.password_reset",
  entityType: "user",
  entityLabel: employee.name,
  description: `Reset password for ${employee.name}`,
  severity: "warning",
});

await notifyPasswordReset({
  employeeId: employee.id,
  employeeName: employee.name,
  resetByName: "Admin",
});
```

### Step 4: Add Session Kill to change-role (3 min)
In `if (payload.intent === "change-role")`, after role update:
```typescript
// Kill session so user must re-login with new role
if (employee.authUserId) {
  await db.delete(session).where(eq(session.userId, employee.authUserId));
}

await logAuditEvent({
  actorEmail: await getCurrentActorEmail(),
  action: "user.role_changed",
  entityType: "user",
  entityLabel: employee.name,
  description: `Changed role to ${payload.accessRole}`,
  severity: "warning",
});
```

### Step 5: Add Bulk Actions Handler (5 min)
Copy content from `admin-actions-bulk-patch.txt` and paste at end of `admin-actions.ts`.

### Step 6: Add Bulk Actions UI (5 min)
In `components/security-user-management.tsx`:

1. Add import:
```typescript
import { SecurityUserBulkActions } from "@/components/security-user-bulk-actions";
```

2. Add state (after other useState):
```typescript
const [selectedIds, setSelectedIds] = useState<number[]>([]);
```

3. Add bulk actions toolbar (before table):
```typescript
<SecurityUserBulkActions
  selectedIds={selectedIds}
  onClearSelection={() => setSelectedIds([])}
  roleOptions={roleOptions}
/>
```

4. Add checkbox column to table header:
```typescript
<TableHead className="w-12">
  <Checkbox
    checked={selectedIds.length === filteredUsers.length && filteredUsers.length > 0}
    onCheckedChange={(checked) => {
      setSelectedIds(checked ? filteredUsers.map(u => u.id) : []);
    }}
  />
</TableHead>
```

5. Add checkbox to each row:
```typescript
<TableCell>
  <Checkbox
    checked={selectedIds.includes(user.id)}
    onCheckedChange={(checked) => {
      setSelectedIds(checked 
        ? [...selectedIds, user.id]
        : selectedIds.filter(id => id !== user.id)
      );
    }}
  />
</TableCell>
```

### Step 7: Test (5 min)
1. Start dev server: `npm run dev`
2. Go to `/dashboard/security/users`
3. Select 2-3 users
4. Try bulk activate/ban
5. Check audit logs in DB:
```sql
SELECT * FROM hero_audit_logs ORDER BY created_at DESC LIMIT 10;
```

## VERIFICATION QUERIES

```sql
-- Check unique constraints
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN (''hero_employees'', ''auth_user'') 
AND indexname LIKE ''%email%'';

-- Check new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = ''hero_employees'' 
AND column_name IN (
  ''deleted_at'', 
  ''email_verified'', 
  ''password_reset_at'',
  ''last_login_at'',
  ''invitation_token''
);

-- Check new tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = ''public'' 
AND table_name LIKE ''hero_user_%'';

-- Test audit log
INSERT INTO hero_audit_logs (action, entity_type, entity_label, description, severity)
VALUES (''test'', ''user'', ''Test User'', ''Test audit entry'', ''info'');

SELECT * FROM hero_audit_logs WHERE action = ''test'';
```

## FULL INTEGRATION (4-6 HOURS)

For complete integration of all features, follow `USER_MANAGEMENT_IMPLEMENTATION.md`.

## TROUBLESHOOTING

### Migration fails with "relation already exists"
```sql
-- Check what exists
SELECT table_name FROM information_schema.tables WHERE table_name LIKE ''hero_user_%'';

-- Drop if needed (CAUTION: loses data)
DROP TABLE IF EXISTS hero_user_import_history CASCADE;
DROP TABLE IF EXISTS hero_user_activity_log CASCADE;
DROP TABLE IF EXISTS hero_user_group_memberships CASCADE;
DROP TABLE IF EXISTS hero_user_groups CASCADE;
```

### Import error: "Cannot find module @/db/schema/user-management"
Add export to `db/schema/hero.ts`:
```typescript
export * from "./user-management";
```

### Bulk actions not showing
Check:
1. Component imported correctly
2. State initialized
3. Checkbox columns added
4. Action handler exported

### Audit log not saving
Check:
1. Migration ran successfully
2. `hero_audit_logs` table exists
3. Actor email resolves correctly
4. No DB connection errors in console

## ROLLBACK

If issues occur:

```sql
-- Rollback migration
DROP INDEX IF EXISTS hero_employees_email_unique_idx;
DROP INDEX IF EXISTS auth_user_email_unique_idx;

ALTER TABLE hero_employees 
  DROP COLUMN IF EXISTS deleted_at,
  DROP COLUMN IF EXISTS email_verified,
  DROP COLUMN IF EXISTS email_verification_token,
  DROP COLUMN IF EXISTS email_verification_expires_at,
  DROP COLUMN IF EXISTS password_reset_at,
  DROP COLUMN IF EXISTS password_reset_by,
  DROP COLUMN IF EXISTS last_login_at,
  DROP COLUMN IF EXISTS failed_login_attempts,
  DROP COLUMN IF EXISTS locked_until,
  DROP COLUMN IF EXISTS invitation_token,
  DROP COLUMN IF EXISTS invitation_expires_at,
  DROP COLUMN IF EXISTS invitation_accepted_at;

DROP TABLE IF EXISTS hero_user_import_history CASCADE;
DROP TABLE IF EXISTS hero_user_activity_log CASCADE;
DROP TABLE IF EXISTS hero_user_group_memberships CASCADE;
DROP TABLE IF EXISTS hero_user_groups CASCADE;
```

Remove new files:
```bash
rm lib/audit-logger.ts
rm lib/user-invitation.ts
rm lib/user-notifications.ts
rm lib/enhanced-user-import.ts
rm lib/pagination.ts
rm lib/optimized-user-queries.ts
rm db/schema/user-management.ts
rm components/security-user-bulk-actions.tsx
```

## PRODUCTION CHECKLIST

- [ ] Migration tested on staging DB
- [ ] Unique constraint doesn''t break existing data
- [ ] Audit logs writing correctly
- [ ] Notifications sending
- [ ] Bulk actions work
- [ ] Session kill on role change works
- [ ] Performance acceptable (check query times)
- [ ] No console errors
- [ ] Backup DB before production migration
- [ ] Monitor audit logs after deployment

## SUPPORT

For issues or questions:
1. Check `USER_MANAGEMENT_AUDIT.md` for original analysis
2. Check `USER_MANAGEMENT_IMPLEMENTATION.md` for detailed integration
3. Review code comments in generated files
4. Test queries in `VERIFICATION QUERIES` section

