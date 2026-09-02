import { db } from '../db'
import { emailTemplates } from '../db/schema/hero'
import { EMAIL_TEMPLATE_PRESET_MAP } from '../lib/email-template-presets'
import { eq } from 'drizzle-orm'

async function main() {
  console.log('--- SYNCING 5R PRESETS FULL HTML TO DATABASE ---')

  const fiveRCodes = [
    'five_r_approval_request',
    'workflow_five_r_report_approved',
    'workflow_five_r_report_returned_rejected',
    'workflow_five_r_report_rejected',
    'workflow_five_r_report_reminder',
    'workflow_five_r_report_overdue',
  ]

  for (const code of fiveRCodes) {
    const preset = EMAIL_TEMPLATE_PRESET_MAP[code]
    if (!preset) {
      console.warn('Preset not found for:', code)
      continue
    }

    const [existing] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.templateCode, code))
      .limit(1)

    if (existing) {
      await db
        .update(emailTemplates)
        .set({
          name: preset.name,
          subject: preset.subject,
          description: preset.description,
          htmlContent: preset.htmlContent,
          textContent: preset.textContent,
          templateType: preset.templateType,
          deliveryChannel: preset.deliveryChannel,
          recipientScope: preset.recipientScope,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(emailTemplates.templateCode, code))
      console.log(`✅ Updated ${code} (HTML length: ${preset.htmlContent.length})`)
    } else {
      await db.insert(emailTemplates).values({
        templateCode: code,
        name: preset.name,
        subject: preset.subject,
        description: preset.description,
        htmlContent: preset.htmlContent,
        textContent: preset.textContent,
        templateType: preset.templateType,
        deliveryChannel: preset.deliveryChannel,
        recipientScope: preset.recipientScope,
        isActive: true,
      })
      console.log(`✅ Created ${code} (HTML length: ${preset.htmlContent.length})`)
    }
  }

  console.log('🎉 Done syncing 5R presets!')
}

main().then(() => process.exit(0)).catch(console.error)
