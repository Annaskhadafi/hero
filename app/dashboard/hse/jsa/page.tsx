import { AdminPageShell } from '@/components/admin-page-shell'
import { JsaWorkspace } from '@/components/hse/jsa-workspace'
import { getJsaList, getJsaSettings } from '@/app/dashboard/hse/jsa/actions'

export const dynamic = 'force-dynamic'

export default async function JsaPage() {
  const [jsaList, settings] = await Promise.all([getJsaList(), getJsaSettings()])

  return (
    <AdminPageShell
      eyebrow="HSE"
      title="Job Safety Analysis (JSA)"
      description="Kelola formulir JSA dan cetak laporan PDF."
    >
      <JsaWorkspace jsaList={jsaList} settings={settings} />
    </AdminPageShell>
  )
}
