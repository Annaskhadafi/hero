import fs from 'fs'
import path from 'path'

function read(file: string) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

describe('notification reminder wiring', () => {
  it('exposes protected cron route for reminder tick', () => {
    const source = read('app/api/cron/reminders/route.ts')

    expect(source).toContain('process.env.CRON_SECRET')
    expect(source).toContain('runApprovalAutomationTick')
    expect(source).toContain('x-cron-secret')
  })

  it('keeps bell feed scoped to in-app deliveries only', () => {
    const source = read('lib/notification-feed.ts')

    expect(source).toContain('eq(notificationDeliveries.deliveryChannel, "in_app")')
    expect(source).not.toContain('ne(notificationDeliveries.status, "failed"),\n        isNull(notificationDeliveries.clearedAt)')
  })

  it('sends before-due reminders to bell and email separately', () => {
    const source = read('lib/approval-blueprint.ts')

    expect(source).toContain("const recipient = job.assigneeEmail?.trim().toLowerCase()")
    expect(source).toContain("channel: 'in_app'")
    expect(source).toContain("deliveryChannel: 'in_app'")
    expect(source).toContain("const [emailEvent] = await tx")
    expect(source).toContain("deliveryChannel: 'email'")
  })

  it('hard-deletes expired push subscriptions', () => {
    const source = read('lib/push-notifications.ts')

    expect(source).toContain('statusCode === 404 || statusCode === 410')
    expect(source).toContain('.delete(notificationPushSubscriptions)')
    expect(source).not.toContain('isActive: false,\n              updatedAt: new Date()')
  })

  it('shows manual reminder tick and delivery statuses in notification center', () => {
    const source = read('components/notification-center-board.tsx')

    expect(source).toContain('runApprovalAutomationAction')
    expect(source).toContain('Run Reminder Tick')
    expect(source).toContain('notification-delivery-status')
    expect(source).toContain('delivery.errorMessage || "-"')
  })
})
