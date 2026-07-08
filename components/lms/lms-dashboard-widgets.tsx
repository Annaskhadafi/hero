'use client'

import { BookOpen, Users, CheckCircle2, Megaphone } from 'lucide-react'
import { EnterpriseScorecards, type EnterpriseScorecardItem } from '@/components/ui/enterprise-table-kit'

interface LmsDashboardWidgetsProps {
  totalCourses: number
  totalEnrollments: number
  avgCompletionRate: number
  activeCampaigns: number
}

export function LmsDashboardWidgets({
  totalCourses,
  totalEnrollments,
  avgCompletionRate,
  activeCampaigns,
}: LmsDashboardWidgetsProps) {
  const scorecards: EnterpriseScorecardItem[] = [
    {
      label: 'Total Kursus',
      value: totalCourses,
      icon: <BookOpen className="h-5 w-5 text-sky-600" />,
      tone: 'info',
    },
    {
      label: 'Total Enrollments',
      value: totalEnrollments,
      icon: <Users className="h-5 w-5 text-indigo-600" />,
      tone: 'default',
    },
    {
      label: 'Avg Completion Rate',
      value: `${avgCompletionRate}%`,
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
      tone: 'success',
    },
    {
      label: 'Active Campaigns',
      value: activeCampaigns,
      icon: <Megaphone className="h-5 w-5 text-amber-600" />,
      tone: 'warning',
    },
  ]

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold font-heading mb-4">Ringkasan LMS</h2>
      <EnterpriseScorecards items={scorecards} />
    </div>
  )
}
