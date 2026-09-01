import { db } from '@/db'
import { workflowTemplates, workflowTemplateVersions, workflowBranches } from '@/db/schema/hero'

async function main() {
  const now = new Date()

  const [wf] = await db
    .insert(workflowTemplates)
    .values({
      templateKey: 'rfr-approval',
      name: 'Request for Recruitment (RFR)',
      mode: 'sequential',
      description: 'Approval workflow untuk permohonan rekrutmen karyawan',
      isActive: true,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: workflowTemplates.templateKey,
      set: { name: 'Request for Recruitment (RFR)', isActive: true, updatedAt: now },
    })
    .returning({ id: workflowTemplates.id })

  console.log('Workflow template:', wf?.id)

  if (wf) {
    const [ver] = await db
      .insert(workflowTemplateVersions)
      .values({
        workflowTemplateId: wf.id,
        versionNumber: 1,
        publishStatus: 'published',
        effectiveFrom: now,
        notes: 'Initial RFR approval workflow',
        updatedAt: now,
      })
      .returning({ id: workflowTemplateVersions.id })

    console.log('Version:', ver?.id)

    if (ver) {
      await db.insert(workflowBranches).values({
        workflowVersionId: ver.id,
        branchKey: 'default',
        label: 'Default Approval Route',
        outcomeType: 'route',
        routeMode: 'sequential',
        sortOrder: 1,
      })
      console.log('Branch created')
    }
  }

  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
