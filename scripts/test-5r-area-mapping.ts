import { db } from '../db'
import { fiveRMasterAreas } from '../db/schema/five-r'
import { sites, employees } from '../db/schema/hero'
import { eq, asc } from 'drizzle-orm'

function resolveFiveRAreaApprover(area: { id?: number; name?: string; siteId?: number | null }): { id: string; name: string; title: string } {
  const name = (area.name || '').toLowerCase()
  const siteId = area.siteId ? area.siteId.toString() : ''

  let empId = '955'

  if (name.includes('balikpapan') || siteId === '126') {
    if (name.includes('repair') || name.includes('retread') || name.includes('accessories')) {
      empId = '996' // Ary Maulana (SPV Repair & Retread Operation)
    } else if (name.includes('service')) {
      empId = '955' // Apriyanto (Head of Service MVC)
    } else if (name.includes('supply chain') || name.includes('warehouse')) {
      empId = '946' // Karmiyanto (Leader Supply Chain)
    } else if (name.includes('office') || name.includes('facility') || name.includes('admin')) {
      empId = '966' // Rendra Rachman (Human Capital Manager)
    } else if (name.includes('safety') || name.includes('hse')) {
      empId = '1375' // Ade Saharu (HSE Officer)
    } else {
      empId = '966'
    }
  } else if (name.includes('jakarta') || name.includes('pupar') || siteId === '125') {
    if (name.includes('service')) {
      empId = '15' // Junaidi (Serviceman Leader)
    } else if (name.includes('supply chain') || name.includes('warehouse')) {
      empId = '946' // Karmiyanto (Leader Supply Chain)
    } else {
      empId = '966' // Rendra Rachman (Human Capital Manager)
    }
  } else if (name.includes('palembang') || name.includes('pekanbaru') || siteId === '134' || siteId === '136') {
    empId = '96' // Febrial Hariri (Leader Technical Sumatera)
  } else if (name.includes('berau') || siteId === '146' || siteId === '137') {
    empId = '255' // Muhammad Refaldi (PJO Berau)
  } else if (name.includes('sangatta') || siteId === '127') {
    empId = '1164' // Saipudin (HSE Leader / PJO)
  } else if (name.includes('mhu') || siteId === '128') {
    empId = '1308' // Irfan Rivai Remba (HSE / PJO)
  } else if (name.includes('bmb') || siteId === '131') {
    empId = '1285' // Danny Hangga Irawan (HSE / PJO)
  } else if (name.includes('bib') || siteId === '133') {
    empId = '1374' // Fathurrahman Sufi (HSE Officer / PJO)
  } else if (name.includes('mifa') || siteId === '138') {
    empId = '454' // Adit Prasetyo (PJO)
  } else if (name.includes('sorowako') || name.includes('vale') || siteId === '140') {
    empId = '1307' // Muhammad Wahyu Ichsan (HSE / PJO)
  } else if (name.includes('tommy') || name.includes('tanjung') || siteId === '210' || siteId === '130') {
    if (name.includes('tommy')) empId = '97' // Tommy Indra Aldiny Rambe
    else empId = '1212' // Dowy Pratama Sita (PJO)
  } else if (siteId === '144') {
    empId = '1057' // Singgih Wiyono (PJO Tabang)
  }

  const EMP_NAMES: Record<string, { name: string; title: string }> = {
    '996': { name: 'Ary Maulana', title: 'SPV Repair & Retread Operation' },
    '955': { name: 'Apriyanto', title: 'Head of Service MVC' },
    '946': { name: 'Karmiyanto', title: 'Leader Supply Chain' },
    '966': { name: 'Rendra Rachman', title: 'Human Capital Manager' },
    '1375': { name: 'Ade Saharu', title: 'HSE Officer' },
    '15': { name: 'Junaidi', title: 'Serviceman Leader' },
    '96': { name: 'Febrial Hariri', title: 'Leader Technical Sumatera' },
    '255': { name: 'Muhammad Refaldi', title: 'PJO Berau' },
    '1164': { name: 'Saipudin', title: 'HSE Leader / PJO Sangatta' },
    '1308': { name: 'Irfan Rivai Remba', title: 'HSE / PJO CK MHU' },
    '1285': { name: 'Danny Hangga Irawan', title: 'HSE / PJO CK BMB' },
    '1374': { name: 'Fathurrahman Sufi', title: 'HSE Officer / PJO CK BIB' },
    '454': { name: 'Adit Prasetyo', title: 'PJO AMM MIFA' },
    '1307': { name: 'Muhammad Wahyu Ichsan', title: 'HSE / PJO Vale Sorowako' },
    '97': { name: 'Tommy Indra Aldiny Rambe', title: 'Technical Leader' },
    '1212': { name: 'Dowy Pratama Sita', title: 'PJO BUMA Tanjung' },
    '1057': { name: 'Singgih Wiyono', title: 'PJO AMM Tabang' },
  }

  return {
    id: empId,
    name: EMP_NAMES[empId]?.name ?? empId,
    title: EMP_NAMES[empId]?.title ?? '',
  }
}

async function main() {
  const areas = await db
    .select({
      id: fiveRMasterAreas.id,
      name: fiveRMasterAreas.name,
      siteId: fiveRMasterAreas.siteId,
      siteName: sites.name,
    })
    .from(fiveRMasterAreas)
    .leftJoin(sites, eq(fiveRMasterAreas.siteId, sites.id))
    .where(eq(fiveRMasterAreas.isActive, true))
    .orderBy(asc(fiveRMasterAreas.siteId), asc(fiveRMasterAreas.name))

  const results = areas.map((a) => {
    const approver = resolveFiveRAreaApprover(a)
    return {
      'Area ID': a.id,
      'Master Area 5R': a.name,
      'Site': a.siteName,
      'Step 1 (Quality)': 'Ria Annisa Putri (1181)',
      'Step 2 (PJO / Atasan)': `${approver.name} (${approver.id}) - ${approver.title}`,
      'Step 3 (CPI)': 'Bardinia Susi Ekawaty (944)',
    }
  })

  console.table(results)
}

main().then(() => process.exit(0)).catch(console.error)
