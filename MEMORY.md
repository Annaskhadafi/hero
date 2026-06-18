# Project Memory

## Last Updated: 2026-06-18

## Key Decisions
- Using Next.js with App Router
- Database: PostgreSQL with Drizzle ORM
- UI Components: Custom enterprise components
- Authentication: NextAuth.js
- Deployment: Vercel + Docker

## Preferences
- TypeScript for all new code
- ESLint + Prettier for formatting
- Component-based architecture
- RBAC for all admin features

## History
- 2026-06-14: Initial memory system setup
- 2026-06-18: Stage 2 email workflow completed for resend invitation, workflow template seeds, and source-inspection coverage
- 2026-06-18: Stage 3 email settings UI adds workflow preset registry, placeholder metadata, and live preview for template editing
- 2026-06-18: Stage 4 email settings adds restore-default and sync-all preset actions from admin UI
- 2026-06-18: Stage 5 adds HSE Safety recipient settings and email coverage for observation, incident, incident report, inspection, induction, and inventory reminder flows
- 2026-06-18: Human Capital email settings and notifications added for employee master, disciplinary, and performance review workflows with preset templates
- 2026-06-18: Existing HC email flows for recruitment, MCU, and contract review now inherit global Human Capital recipient policy via CC routing
- 2026-06-18: Legacy HC recruitment, MCU, and contract review flows now support central Email Settings template overrides and are seeded into the main preset registry
- 2026-06-18: Remaining HC recruitment flows now use central template overrides and HC policy CC for application received, interview invitation, and online test assignment; db-push wrapper now aborts unknown destructive prompts
- 2026-06-18: AGENTS.md now explicitly requires all new features with email/notification to follow centralized Email Settings, recipient policy, runtime template override, seed/preset registry, and delivery logging patterns
- 2026-06-18: AGENTS.md notification standards now include implementation checklist, file mapping, done-criteria, and domain pattern examples so future new features follow the same centralized email flow consistently
- 2026-06-18: AGENTS.md now also enforces full new-feature flow coverage across approval, reminder, notification bell, email, delivery log, admin settings, and minimum verification
- 2026-06-18: Legacy HC offering/onboarding now use centralized template overrides and HC policy CC, legacy HC email settings page redirects to central Email Settings, legacy attendance/leave/offboarding now emit bell events, and legacy HSE JSA/HIRADC/PTW now emit centralized HSE email + bell notifications
- 2026-06-18: Dev environment now bootstrapped with npm install, type-check is green, and audit shows full Approval Engine reuse for non-activity legacy workflows is still blocked by hero_approvals/activity-linked schema assumptions
- 2026-06-18: Approval Engine refactor now supports submission-based legacy workflows by adding approvals.submissionId + legacy approvalSubmissionId links, introducing lib/legacy-approval-engine.ts, binding attendance/leave/offboarding submission creation into centralized approval flow, and teaching approval workspace/admin review flow to process non-activity submissions
- Project: HERO - Employee Reporting System
- Main features: Employee management, timesheets, safety dashboard
