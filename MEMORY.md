# Project Memory

## Last Updated: 2026-06-22

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
- 2026-06-22: Mobile dashboard Layanan Chitra updated: added Wellness and Leaderboard icons without replacing existing services (grid now shows all items across multiple rows); renamed Gamification to Leaderboard; mobile leaderboard filtered by same site and same section as logged-in employee
- 2026-06-22: SheetContent UI component now supports hideCloseButton prop to avoid duplicate close buttons when a custom close button is provided; mobile sidebar uses hideCloseButton to keep only the header close button
- 2026-06-22: Fixed post-login mobile dashboard "Rendered more hooks than during the previous render" by deferring MobileBroadcastPopup rendering until client mount, replacing sign-in router.replace with full page navigation, adding mobile segment error boundary, and making dashboard data fetching non-throwing with fallback UI
- 2026-06-22: Mobile dashboard now shows MCU shortcut card linking to /mobile/wellness with latest MCU date and status
- 2026-06-22: MCU Wellness dashboard table Doc MCU column changed to Eye/Download icon buttons; mobile revalidation added after MCU upload/AI save; mobile wellness scorecards kept as MCU records + MCU status with progress bar to next due
- 2026-06-22: Mobile wellness page converted to client component with collapsible MCU and Wellness Log sections, plus PDF popup viewer with download button for MCU documents
- 2026-06-22: Mobile profile sections made collapsible and fixed mobile wellness malformed array literal by replacing sql ANY with inArray for employeeMcuMetrics query
- 2026-06-22: Mobile profile MCU query switched from pre-hire hcCandidateMcu to post-hire employeeMcu (hero_employee_mcu)
- 2026-06-22: Curhat HR chat upload fixed with local fallback storage, original extension preservation, and realtime 3-second polling; added attachment_file_name column to hero_hr_counseling_messages
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
