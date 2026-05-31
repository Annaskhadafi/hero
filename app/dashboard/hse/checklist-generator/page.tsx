import { AdminPageShell } from '@/components/admin-page-shell'
import { ChecklistGeneratorClient } from '@/components/hse-checklists/checklist-generator-client'
import {
  getChecklistAuditLogs,
  getChecklistTemplatesWithLatestRevision,
  getDailyChecklistHistory,
} from '@/app/actions/hse-checklists'
import { getServerSession } from '@/lib/auth-session'

export default async function ChecklistGeneratorPage() {
  const [session, templates, history, auditLogs] = await Promise.all([
    getServerSession(),
    getChecklistTemplatesWithLatestRevision(),
    getDailyChecklistHistory(),
    getChecklistAuditLogs(),
  ])

  const areaOptions = Array.from(new Set(history.map((row) => row.area).filter(Boolean))).sort()
  const statusOptions = Array.from(new Set(history.map((row) => row.status).filter(Boolean))).sort()

  return (
    <AdminPageShell
      eyebrow="HSE • Checklist Generator"
      title="Digital Checklist Generator"
      description="Buat template inspeksi, jalankan checklist harian, pantau riwayat, dan cetak laporan PDF."
    >
      <ChecklistGeneratorClient
        currentUserName={session?.user?.name ?? ''}
        templates={templates}
        history={history}
        auditLogs={auditLogs}
        areaOptions={areaOptions}
        statusOptions={statusOptions}
      />
    </AdminPageShell>
  )
}
