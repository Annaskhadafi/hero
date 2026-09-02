import { db } from '../db'
import { emailTemplates } from '../db/schema/hero'
import { EMAIL_TEMPLATE_PRESET_MAP } from '../lib/email-template-presets'
import { eq } from 'drizzle-orm'

async function main() {
  console.log('--- SYNCING UNIFIED HERO DESIGN FOR ALL 5R TEMPLATES ---')

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

    // preset.htmlContent is produced by applyUnifiedEmailDesign!
    console.log(`Checking ${code}:`)
    console.log(`- Header snippet:`, preset.htmlContent.slice(0, 200))
    console.log(`- Contains linear-gradient(135deg,#020617:`, preset.htmlContent.includes('linear-gradient(135deg,#020617'))

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

    console.log(`✅ Saved ${code} with standard HERO design!`)
  }

  console.log('🎉 Done syncing standard HERO design!')
}

main().then(() => process.exit(0)).catch(console.error)
