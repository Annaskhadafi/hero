import fs from 'fs'
import path from 'path'

function read(file: string) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

describe('stage 2 workflow email coverage', () => {
  it('uses reusable invitation helper for create-user and resend-invitation', () => {
    const source = read('app/dashboard/admin-actions.ts')

    expect(source).toContain("'resend-invitation'")
    expect(source).toContain("payload.intent === 'resend-invitation'")
    expect(source).toContain('await issueUserInvitation({')

    const createUserStart = source.indexOf("payload.intent === 'create-user'")
    const createUserEnd = source.indexOf('if (!payload.employeeId)', createUserStart)
    const createUserSection = source.slice(createUserStart, createUserEnd)

    expect(createUserSection).toContain('await issueUserInvitation({')
    expect(createUserSection).not.toContain('createUserInvitation({')
    expect(createUserSection).not.toContain('createEmailVerification({')
  })

  it('renders resend invitation action in security tab', () => {
    const source = read('components/security-user-row-actions.tsx')

    expect(source).toContain('name="intent" value="resend-invitation"')
    expect(source).toContain('Kirim Ulang Invitation')
    expect(source).toContain('value="security"')
  })

  it('seeds new workflow email templates and syncs missing codes into existing DBs', () => {
    const source = read('lib/hero-admin.ts') + read('lib/email-template-presets.ts')

    expect(source).toContain("templateCode: 'user_invitation'")
    expect(source).toContain("templateCode: 'onboarding_link'")
    expect(source).toContain("templateCode: 'leave_request_submitted'")
    expect(source).toContain("templateCode: 'leave_request_decision'")
    expect(source).toContain("templateCode: 'attendance_permission_decision'")
    expect(source).toContain("templateCode: 'overtime_assignment'")
    expect(
      source.includes("templateCode: 'daily_activity_pending_approval'") ||
      source.includes("templateCode: 'daily_activity_approval_notification'")
    ).toBe(true)
    expect(source).toContain("templateCode: 'offboarding_update'")
    expect(source).toContain('const existingEmailTemplates = await db')
    expect(source).toContain('const missingEmailTemplates = EMAIL_TEMPLATE_SEEDS.filter')
    expect(source).toContain('await db.insert(emailTemplates).values(missingEmailTemplates)')
  })

  it('assigns template codes to main workflow email senders', () => {
    const leaveSource = read('app/actions/leave.ts')
    const attendanceSource = read('app/actions/attendance.ts')
    const onboardingSource = read('app/actions/onboarding.ts')
    const activitySource = read('app/dashboard/activity-hub/actions.ts')
    const offboardingSource = read('app/actions/offboarding.ts')

    expect(leaveSource).toContain('templateCode: "leave_request_submitted"')
    expect(leaveSource).toContain('templateCode: "leave_request_decision"')
    expect(attendanceSource).toContain("templateCode: 'attendance_permission_decision'")
    expect(onboardingSource).toContain('templateCode: "onboarding_link"')
    expect(
      activitySource.includes('templateCode: "overtime_assignment"') ||
      activitySource.includes("templateCode: 'overtime_assignment'") ||
      activitySource.includes('spl_submitted')
    ).toBe(true)
    expect(
      activitySource.includes('templateCode: "daily_activity_pending_approval"') ||
      activitySource.includes("templateCode: 'daily_activity_pending_approval'")
    ).toBe(true)
    expect(offboardingSource).toContain('templateCode: "offboarding_update"')
  })

  it('keeps invitation helper bound to user_invitation template', () => {
    const source = read('lib/user-invitation.ts')

    expect(source).toContain('export async function issueUserInvitation')
    expect(source).toContain('templateCode: "user_invitation"')
    expect(source).toContain('verificationLink')
  })
})
