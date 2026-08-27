import { db } from '../db'
import { emailTemplates } from '../db/schema/hero'
import { eq, or } from 'drizzle-orm'
import { EMAIL_TEMPLATE_PRESETS } from '../lib/email-template-presets'

async function run() {
  const tpls = await db
    .select()
    .from(emailTemplates)
    .where(
      or(
        eq(emailTemplates.templateCode, 'form_wo_ready_for_wo_number'),
        eq(emailTemplates.templateCode, 'form_wo_approval_request'),
        eq(emailTemplates.templateCode, 'form_wo_billing_approved'),
        eq(emailTemplates.templateCode, 'form_wo_final_completed_pdf')
      )
    )

  console.log('Current DB Templates:')
  for (const t of tpls) {
    console.log(`Code: ${t.templateCode} | HTML: ${t.htmlContent.substring(0, 100)}...`)
  }

  // Sync / Update DB templates with latest presets that have buttons!
  for (const preset of EMAIL_TEMPLATE_PRESETS) {
    if (
      [
        'form_wo_ready_for_wo_number',
        'form_wo_approval_request',
        'form_wo_billing_approved',
        'form_wo_final_completed_pdf',
      ].includes(preset.templateCode)
    ) {
      const existing = tpls.find((t) => t.templateCode === preset.templateCode)
      if (existing) {
        console.log(`Updating DB template: ${preset.templateCode}`)
        await db
          .update(emailTemplates)
          .set({
            subject: preset.subject,
            htmlContent: preset.htmlContent,
            textContent: preset.textContent,
            updatedAt: new Date(),
          })
          .where(eq(emailTemplates.id, existing.id))
      } else {
        console.log(`Inserting DB template: ${preset.templateCode}`)
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
        })
      }
    }
  }
  console.log('Sync completed!')
}

run().catch(console.error)
