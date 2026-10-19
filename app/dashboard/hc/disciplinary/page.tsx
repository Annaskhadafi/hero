import {
  getActiveEmployees,
  getDisciplinaryActions,
  getDisciplinaryStats,
  getViolationCategories,
} from '@/app/actions/disciplinary'

import { DisciplinaryClientPage } from './client-page'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Tindakan Disiplin - HC',
}

export default async function DisciplinaryPage() {
  const permission = await getCurrentMenuPermission('hc_disciplinary')
  if (!permission.canView) redirect('/dashboard')

  let actions: any[] = []
  let categories: any[] = []
  let stats: any = {
    totalCases: 0,
    activeSp: 0,
    expired: 0,
    thisMonth: 0,
    byLevel: {
      Teguran: 0,
      SP1: 0,
      SP2: 0,
      SP3: 0,
      Skorsing: 0,
      Termination: 0,
    },
  }
  let employees: any[] = []

  try {
    const res = await Promise.all([
      getDisciplinaryActions(),
      getViolationCategories(),
      getDisciplinaryStats(),
      getActiveEmployees(),
    ])
    actions = res[0]
    categories = res[1]
    stats = res[2]
    employees = res[3]
  } catch (err) {
    console.error('[disciplinary/page] Error loading disciplinary data:', err)
  }

  return (
    <DisciplinaryClientPage
      actions={actions}
      categories={categories}
      stats={stats}
      employees={employees}
    />
  )
}

