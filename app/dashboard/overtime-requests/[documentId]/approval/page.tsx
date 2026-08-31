import { getOvertimeApprovalData } from '@/app/dashboard/overtime-requests/actions'
import { getEmployeesForContract } from '@/app/actions/employee'
import { OvertimeRequestApprovalForm } from '@/components/overtime-request-approval-form'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Approval Surat Perintah Lembur - HERO',
}

export default async function OvertimeApprovalPage({
  params,
}: {
  params: Promise<{ documentId: string }>
}) {
  const { documentId } = await params
  const documentIdNum = Number(documentId)

  const [data, employeesRaw] = await Promise.all([
    getOvertimeApprovalData(documentIdNum),
    getEmployeesForContract(),
  ])

  if (!data) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-bold text-slate-800">Dokumen Overtime SPL tidak ditemukan</h2>
        <p className="text-sm text-slate-500 mt-1">Surat Perintah Lembur dengan ID {documentId} tidak ada atau sudah dihapus.</p>
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
    <OvertimeRequestApprovalForm
      data={data}
      employees={employees}
    />
  )
}
