'use client'

import { useState } from 'react'
import { FileCheck2, FileText, Archive, FileSignature } from 'lucide-react'

import { SuratKeteranganClient } from '@/app/dashboard/hc/surat-keterangan/client-form'
import { SuratTugasClient } from '@/app/dashboard/hc/surat-tugas/client-form'
import { SuratMcuClient } from '@/app/dashboard/hc/surat-mcu/client-form'
import { SuratPerubahanStatusClient } from '@/app/dashboard/hc/surat-perubahan-status/client-form'
import { SuratArchiveClient } from '@/app/dashboard/hc/surat/archive/client-page'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type EmployeeForLetter = {
  id: number
  name: string
  employeeSn: string
  joinYear: number
  section: string
  jobTitle: string
  levelName: string | null
  employeeStatusType: string | null
}

type HrSigner = {
  id: number
  name: string
  employeeSn: string
  jobTitle: string
  signatureUrl: string
}

type Letter = Parameters<typeof SuratArchiveClient>[0]['letters'][number]
type LetterStats = Parameters<typeof SuratArchiveClient>[0]['stats']

export function SuratWorkspaceClient({
  employees,
  hrSigners,
  letters,
  stats,
  initialTab,
}: {
  employees: EmployeeForLetter[]
  hrSigners: HrSigner[]
  letters: Letter[]
  stats: LetterStats
  initialTab: string
}) {
  const [tab, setTab] = useState(initialTab)

  return (
    <div className="space-y-4">
      <div className="rounded-[1.1rem] bg-white p-3 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_14px_32px_rgba(15,23,42,0.06)]">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="keterangan" className="gap-2">
              <FileText className="size-4" /> Surat Keterangan
            </TabsTrigger>
            <TabsTrigger value="tugas" className="gap-2">
              <FileCheck2 className="size-4" /> Surat Tugas
            </TabsTrigger>
            <TabsTrigger value="mcu" className="gap-2">
              <FileCheck2 className="size-4" /> Surat MCU
            </TabsTrigger>
            <TabsTrigger value="perubahan-status" className="gap-2">
              <FileSignature className="size-4" /> Perubahan Status
            </TabsTrigger>
            <TabsTrigger value="archive" className="gap-2">
              <Archive className="size-4" /> Surat Archive
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {tab === 'keterangan' && (
        <SuratKeteranganClient employees={employees} hrSigners={hrSigners} />
      )}
      {tab === 'tugas' && <SuratTugasClient employees={employees} hrSigners={hrSigners} />}
      {tab === 'mcu' && <SuratMcuClient employees={employees} hrSigners={hrSigners} />}
      {tab === 'perubahan-status' && <SuratPerubahanStatusClient employees={employees} hrSigners={hrSigners} />}
      {tab === 'archive' && <SuratArchiveClient letters={letters} stats={stats} />}
    </div>
  )
}
