'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Eye, Download, BadgeCheck, XCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export type ReportRow = {
  id: number
  courseTitle: string
  employeeName: string
  employeeSn: string
  siteId?: number | null
  siteName?: string | null
  status: string
  progress: number
  pretestScore: number | null
  posttestScore: number | null
  posttestAttempts?: number | null
  finalScore: number | null
  isPassed: boolean
  completedAt: Date | null
  certificateNumber: string | null
  certificateIssuedAt: Date | null
}

export function ReportsClient({
  data,
  sites = [],
}: {
  data: ReportRow[]
  sites?: { id: number; name: string }[]
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all')
  const [selectedRow, setSelectedRow] = useState<ReportRow | null>(null)

  const filteredData = data.filter(row => {
    const matchesSearch =
      row.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.employeeSn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.courseTitle.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSite = selectedSiteId === 'all' || !selectedSiteId || String(row.siteId) === selectedSiteId
    return matchesSearch && matchesSite
  })

  const handleExportCsv = () => {
    const headers = ['Nama Karyawan', 'SN', 'Site', 'Kursus', 'Progress', 'Pre-test', 'Post-test', 'Nilai Akhir', 'Status', 'No Sertifikat']
    const rows = filteredData.map(r => [
      `"${r.employeeName}"`,
      `"${r.employeeSn}"`,
      `"${r.siteName || '-'}"`,
      `"${r.courseTitle.replace(/"/g, '""')}"`,
      `${r.progress}%`,
      r.pretestScore ?? '-',
      r.posttestScore ?? '-',
      r.finalScore ?? '-',
      r.status,
      `"${r.certificateNumber || '-'}"`
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `laporan-lms-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Cari nama, SN, atau kursus..." 
              className="pl-9 bg-slate-50 border-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {sites.length > 0 && (
            <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
              <SelectTrigger className="w-full sm:w-48 bg-slate-50 border-slate-200">
                <SelectValue placeholder="Semua Site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Site</SelectItem>
                {sites.map(site => (
                  <SelectItem key={site.id} value={String(site.id)}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button variant="outline" onClick={handleExportCsv} className="w-full sm:w-auto gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4">Karyawan</th>
                <th className="px-6 py-4">Kursus</th>
                <th className="px-6 py-4">Progress</th>
                <th className="px-6 py-4">Nilai Akhir</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{row.employeeName}</div>
                    <div className="text-xs text-slate-500">
                      {row.employeeSn}
                      {row.siteName ? ` • ${row.siteName}` : ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700 max-w-[250px] truncate" title={row.courseTitle}>
                    {row.courseTitle}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${row.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                          style={{ width: `${row.progress}%` }} 
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600">{row.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {row.finalScore !== null ? (
                      <span className="font-semibold text-slate-900">{row.finalScore}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {row.status === 'passed' ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Lulus</Badge>
                    ) : row.status === 'failed' ? (
                      <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200">Gagal</Badge>
                    ) : row.status === 'in_progress' ? (
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Berjalan</Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200 capitalize">{row.status.replace('_', ' ')}</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRow(row)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      <Eye className="h-4 w-4 mr-2" /> Detail
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Tidak ada data yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Progres & Nilai</DialogTitle>
            <DialogDescription>
              Laporan lengkap untuk {selectedRow?.employeeName}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRow && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Nilai Pre-test</p>
                  <p className="text-2xl font-bold text-slate-900">{selectedRow.pretestScore ?? '-'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Nilai Post-test</p>
                      {selectedRow.posttestAttempts != null && selectedRow.posttestAttempts > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                          {selectedRow.posttestAttempts}x tes
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{selectedRow.posttestScore ?? '-'}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 mt-2 text-[11px] text-muted-foreground">
                    <span>Jumlah Percobaan: </span>
                    <strong className="font-semibold text-slate-800">
                      {selectedRow.posttestAttempts != null && selectedRow.posttestAttempts > 0
                        ? `${selectedRow.posttestAttempts} kali`
                        : selectedRow.posttestScore != null
                        ? '1 kali'
                        : 'Belum tes'}
                    </strong>
                  </div>
                </div>
                <div className="col-span-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-semibold mb-1 uppercase tracking-wider">Nilai Akhir (Tertimbang)</p>
                    <p className="text-3xl font-black text-blue-900">{selectedRow.finalScore ?? '-'}</p>
                  </div>
                  <div className="text-right">
                    {selectedRow.isPassed ? (
                      <div className="flex items-center text-emerald-600 font-bold bg-emerald-100 px-3 py-1 rounded-full">
                        <BadgeCheck className="h-5 w-5 mr-1" /> LULUS
                      </div>
                    ) : selectedRow.status === 'failed' ? (
                      <div className="flex items-center text-rose-600 font-bold bg-rose-100 px-3 py-1 rounded-full">
                        <XCircle className="h-5 w-5 mr-1" /> GAGAL
                      </div>
                    ) : (
                      <div className="flex items-center text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
                        <Clock className="h-4 w-4 mr-1" /> BELUM SELESAI
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedRow.certificateNumber && (
                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">Informasi Sertifikat</h4>
                  <div className="grid grid-cols-2 text-sm">
                    <div>
                      <p className="text-slate-500">No. Sertifikat</p>
                      <p className="font-medium text-slate-900">{selectedRow.certificateNumber}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Tanggal Terbit</p>
                      <p className="font-medium text-slate-900">
                        {selectedRow.certificateIssuedAt ? new Date(selectedRow.certificateIssuedAt).toLocaleDateString('id-ID') : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
