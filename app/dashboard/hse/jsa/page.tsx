import { AdminPageShell } from '@/components/admin-page-shell'
import { JsaWorkspace } from '@/components/hse/jsa-workspace'
import { getJsaList } from '@/app/dashboard/hse/jsa/actions'

export const dynamic = 'force-dynamic'

export default async function JsaPage() {
  const jsaList = await getJsaList()

  return (
    <AdminPageShell
      eyebrow="HSE"
      title="Job Safety Analysis (JSA)"
      description="Kelola formulir JSA dan cetak laporan PDF."
    >
      <JsaWorkspace jsaList={jsaList} />
    </AdminPageShell>
  )
}
