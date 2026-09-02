import { db } from '../db'
import { repairFormWo } from '../db/schema/form-wo'
import { eq, or } from 'drizzle-orm'

async function main() {
  console.log('Updating Pemohon to real operational employees (Muhammad Taufik Akbar & Said Sultan Ramadani)...')

  // Update Service to Muhammad Taufik Akbar
  const updatedService = await db
    .update(repairFormWo)
    .set({
      pemohon: 'Muhammad Taufik Akbar',
      pemohonJobTitle: 'Serviceman',
      createdBy: '1020',
    })
    .where(eq(repairFormWo.jenisPengajuan, 'service'))
    .returning({ id: repairFormWo.id, no: repairFormWo.noPengajuan })

  console.log(`Updated ${updatedService.length} Service WO records to Muhammad Taufik Akbar.`)

  // Update Repair & Retread to Said Sultan Ramadani
  const updatedRepair = await db
    .update(repairFormWo)
    .set({
      pemohon: 'Said Sultan Ramadani',
      pemohonJobTitle: 'Repairman',
      createdBy: '1310',
    })
    .where(or(eq(repairFormWo.jenisPengajuan, 'repair'), eq(repairFormWo.jenisPengajuan, 'retread')))
    .returning({ id: repairFormWo.id, no: repairFormWo.noPengajuan })

  console.log(`Updated ${updatedRepair.length} Repair/Retread WO records to Said Sultan Ramadani.`)

  console.log('✅ ALL Form WO pemohon names have been restored accurately!')
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })
