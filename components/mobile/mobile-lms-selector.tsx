'use client'

import { useRouter } from 'next/navigation'

interface EmployeeOption {
  id: number
  name: string
  employeeSn: string | null
  department: string | null
}

export function MobileLmsSelector({
  employees,
  selectedId,
}: {
  employees: EmployeeOption[]
  selectedId: string
}) {
  const router = useRouter()

  return (
    <div className="rounded-[1rem] bg-white p-3 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
      <label htmlFor="employee-select" className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">
        Pilih Karyawan (Akses Super Admin)
      </label>
      <select
        id="employee-select"
        value={selectedId}
        onChange={(e) => {
          const val = e.target.value
          if (val) {
            router.push(`/mobile/lms?employeeId=${val}`)
          } else {
            router.push('/mobile/lms')
          }
        }}
        className="mt-2 block w-full rounded-lg border border-[#d8e8f3] bg-[#f6fbff] px-3 py-2 text-sm font-semibold text-[#003461] focus:border-[#003f78] focus:outline-none"
      >
        <option value="">-- Lihat Saya Sendiri --</option>
        {employees.map((emp) => (
          <option key={emp.id} value={emp.id}>
            {emp.name} ({emp.employeeSn || 'Tanpa NIK'}) - {emp.department || 'Tanpa Dept'}
          </option>
        ))}
      </select>
    </div>
  )
}
