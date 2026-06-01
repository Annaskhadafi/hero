import { AdminPageShell } from "@/components/admin-page-shell"
import { HiradcClientTable } from "@/components/hiradc/hiradc-client-table"
import { getHiradcData } from "@/lib/hiradc/queries"

export const dynamic = "force-dynamic"

export default async function HiradcPage() {
  const data = await getHiradcData()
  
  // We attach the register to each entry for the detail view
  const entriesWithRegister = data.entries.map(entry => {
    const register = data.registers.find(r => r.id === entry.registerId) || null
    return { ...entry, register }
  })

  return (
    <AdminPageShell
      eyebrow="HSE Module"
      title="HIRADC Register"
      description="Hazard Identification, Risk Assessment, and Determining Control"
    >
      <div className="mt-4">
        <HiradcClientTable 
          data={entriesWithRegister} 
          registers={data.registers} 
          canEdit={data.access.canEdit} 
        />
      </div>
    </AdminPageShell>
  )
}
