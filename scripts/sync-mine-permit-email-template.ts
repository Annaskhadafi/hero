import { db } from '../db'
import { emailTemplates } from '../db/schema/hero'
import { eq } from 'drizzle-orm'
import { EMAIL_TEMPLATE_PRESETS } from '../lib/email-template-presets'

async function run() {
  const preset = EMAIL_TEMPLATE_PRESETS.find(p => p.templateCode === 'hc_employee_mine_permit_reminder')
  if (!preset) {
    console.error('Preset hc_employee_mine_permit_reminder not found!')
    process.exit(1)
  }

  const [existing] = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.templateCode, preset.templateCode))
    .limit(1)

  if (existing) {
    console.log(`Updating template ${preset.templateCode}...`)
    await db
      .update(emailTemplates)
      .set({
        name: preset.name,
        subject: preset.subject,
        htmlContent: preset.htmlContent,
        textContent: preset.textContent,
        description: preset.description,
        variables: preset.variables,
        sampleValues: preset.sampleValues,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, existing.id))
  } else {
    console.log(`Inserting template ${preset.templateCode}...`)
    await db.insert(emailTemplates).values({
      name: preset.name,
      templateCode: preset.templateCode,
      templateType: preset.templateType,
      deliveryChannel: preset.deliveryChannel,
      recipientScope: preset.recipientScope,
      ccEmail: preset.ccEmail,
      subject: preset.subject,
      htmlContent: preset.htmlContent,
      textContent: preset.textContent,
      description: preset.description,
      variables: preset.variables,
      sampleValues: preset.sampleValues,
      isActive: true,
      updatedAt: new Date(),
    })
  }

  console.log('Sync complete!')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
