import { getPtwApprovalData } from '@/app/dashboard/hse/izin-kerja-ptw/actions'
import { getEmployeesForContract } from '@/app/actions/employee'
import { PtwApprovalForm } from '@/components/ptw-approval-form'

export const metadata = {
  title: 'Approval Permit to Work - HERO',
}

export default async function PtwApprovalPage({
  params,
}: {
  params: Promise<{ permitId: string }>
}) {
  const { permitId } = await params
  const permitIdNum = Number(permitId)

  const [data, employeesRaw] = await Promise.all([
    getPtwApprovalData(permitIdNum),
    getEmployeesForContract(),
  ])

  if (!data) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-bold text-slate-800">Dokumen PTW tidak ditemukan</h2>
        <p className="text-sm text-slate-500 mt-1">Permit to Work dengan ID {permitId} tidak ada atau sudah dihapus.</p>
      </div>
    )
  }

  const employees = employeesRaw.map((e) => ({
    id: e.id,
    name: e.fullName,
    employeeSn: e.employeeId,
    jobTitle: e.jobTitle,
    department: e.departmentName,
    section: e.sectionName,
  }))

  return (
    <PtwApprovalForm
      data={data}
      employees={employees}
    />
  )
}
