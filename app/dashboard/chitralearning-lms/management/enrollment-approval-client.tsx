'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { approveInternalLmsEnrollmentAction } from '../actions'

type PendingEnrollment = {
  id: number;
  courseTitle: string;
  employeeName: string;
  employeeSn: string;
  department: string;
  requestedAt: Date;
}

export function EnrollmentApprovalClient({ pendingEnrollments }: { pendingEnrollments: PendingEnrollment[] }) {
  const [processingId, setProcessingId] = useState<number | null>(null)
  const router = useRouter()

  async function handleAction(enrollmentId: number, status: 'approved' | 'rejected') {
    setProcessingId(enrollmentId)
    try {
      const formData = new FormData()
      formData.append('enrollmentId', enrollmentId.toString())
      formData.append('status', status)
      
      if (status === 'rejected') {
        const reason = window.prompt("Alasan penolakan (opsional):")
        if (reason !== null) {
          formData.append('rejectionReason', reason)
        }
      }

      await approveInternalLmsEnrollmentAction(formData)
      toast.success(status === 'approved' ? 'Pendaftaran disetujui.' : 'Pendaftaran ditolak.')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Gagal memproses permintaan.')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
          <tr>
            <th className="px-6 py-4">Karyawan</th>
            <th className="px-6 py-4">Departemen</th>
            <th className="px-6 py-4">Kursus</th>
            <th className="px-6 py-4">Tanggal Request</th>
            <th className="px-6 py-4 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {pendingEnrollments.map(enr => (
            <tr key={enr.id} className="hover:bg-slate-50/50">
              <td className="px-6 py-4">
                <div className="font-medium text-slate-900">{enr.employeeName}</div>
                <div className="text-xs text-slate-500">{enr.employeeSn}</div>
              </td>
              <td className="px-6 py-4 text-slate-600">{enr.department}</td>
              <td className="px-6 py-4 font-medium text-slate-900">{enr.courseTitle}</td>
              <td className="px-6 py-4 text-slate-600">{enr.requestedAt.toLocaleDateString('id-ID')}</td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-green-200 text-green-700 hover:bg-green-50"
                    disabled={processingId === enr.id}
                    onClick={() => handleAction(enr.id, 'approved')}
                  >
                    {processingId === enr.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                    Setujui
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-red-200 text-red-700 hover:bg-red-50"
                    disabled={processingId === enr.id}
                    onClick={() => handleAction(enr.id, 'rejected')}
                  >
                    {processingId === enr.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                    Tolak
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {pendingEnrollments.length === 0 && (
            <tr>
              <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                Tidak ada permintaan pendaftaran yang menunggu persetujuan.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
