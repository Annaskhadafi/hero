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
  const [actions, categories, stats, employees] = await Promise.all([
    getDisciplinaryActions(),
    getViolationCategories(),
    getDisciplinaryStats(),
    getActiveEmployees(),
  ])

  return (
    <DisciplinaryClientPage
      actions={actions}
      categories={categories}
      stats={stats}
      employees={employees}
    />
  )
}
