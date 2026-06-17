'use client'

import { Award, AlertTriangle, Layers, BadgeCheck, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface DashboardAgg {
  totalRecords: number
  activeCount: number
  expiringCount: number
  expiredCount: number
  certTypeDistribution: { type: string; count: number }[]
  departmentCoverage: { name: string; count: number; employees: number }[]
  expiringSoonList: { employeeName: string; certName: string; certType: string; daysLeft: number }[]
  expiredList: { employeeName: string; certName: string; certType: string; daysOverdue: number }[]
}

export function SioDashboardSection({ agg }: { agg: DashboardAgg }) {
  const total = agg.totalRecords || 1

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <BadgeCheck className="size-6 text-emerald-500" />
            <Badge className="bg-emerald-500/10 text-emerald-600 border-0 hover:bg-emerald-500/10">Aktif</Badge>
          </div>
          <p className="mt-4 text-3xl font-bold text-foreground">{agg.activeCount}</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">Sertifikat Aktif</p>
        </Card>

        <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <Clock className="size-6 text-amber-500" />
            <Badge className="bg-amber-500/10 text-amber-600 border-0 hover:bg-amber-500/10">30 Hari</Badge>
          </div>
          <p className="mt-4 text-3xl font-bold text-foreground">{agg.expiringCount}</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">Segera Expired</p>
        </Card>

        <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <AlertTriangle className="size-6 text-rose-500" />
            <Badge className="bg-rose-500/10 text-rose-600 border-0 hover:bg-rose-500/10">Expired</Badge>
          </div>
          <p className="mt-4 text-3xl font-bold text-foreground">{agg.expiredCount}</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">Sertifikat Expired</p>
        </Card>

        <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <Layers className="size-6 text-primary" />
            <Badge className="bg-primary/10 text-primary border-0 hover:bg-primary/10">Total</Badge>
          </div>
          <p className="mt-4 text-3xl font-bold text-foreground">{agg.totalRecords}</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">Total Sertifikat</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <Card className="lg:col-span-4 rounded-[1.2rem] border-0 bg-surface-container-lowest p-5 shadow-sm">
          <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5 mb-4">
            <Award className="size-4 text-primary" />
            Distribusi Tipe Sertifikat
          </h4>
          <div className="space-y-4">
            {agg.certTypeDistribution.length > 0 ? (
              agg.certTypeDistribution.map((item) => (
                <div key={item.type}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold">{item.type}</span>
                    <span className="text-muted-foreground">{item.count} ({Math.round((item.count / total) * 100)}%)</span>
                  </div>
                  <Progress value={(item.count / total) * 100} className="h-2 bg-slate-100" />
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">Belum ada data.</p>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-8 rounded-[1.2rem] border-0 bg-surface-container-lowest p-5 shadow-sm">
          <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5 mb-4">
            <Layers className="size-4 text-primary" />
            Sertifikasi per Departemen
          </h4>
          <div className="max-h-[250px] overflow-y-auto space-y-3">
            {agg.departmentCoverage.length > 0 ? (
              agg.departmentCoverage.map((d) => (
                <div key={d.name} className="flex items-center justify-between py-2 border-b border-dashed border-slate-100 last:border-0">
                  <div>
                    <p className="text-xs font-bold text-foreground">{d.name}</p>
                    <p className="text-[10px] text-muted-foreground">{d.employees} Karyawan</p>
                  </div>
                  <Badge className="bg-primary/5 text-primary border-0 font-bold text-xs px-2.5 py-1">{d.count} Sertifikat</Badge>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">Belum ada data.</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest p-5 shadow-sm">
          <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5 text-rose-700 mb-4">
            <AlertTriangle className="size-4 text-rose-500" />
            Peringatan Expired
          </h4>
          <div className="max-h-[300px] overflow-y-auto space-y-3">
            {agg.expiredList.length === 0 && agg.expiringSoonList.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">Semua sertifikasi valid.</p>
            ) : (
              <>
                {agg.expiredList.map((item, i) => (
                  <div key={`exp-${i}`} className="flex items-start justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-xs font-bold text-foreground">{item.employeeName}</p>
                      <p className="text-[10px] text-muted-foreground">{item.certType} — {item.certName}</p>
                    </div>
                    <Badge className="bg-rose-500/10 text-rose-600 border-0 text-[9px] font-bold shrink-0">
                      {item.daysOverdue} hr lewat
                    </Badge>
                  </div>
                ))}
                {agg.expiringSoonList.map((item, i) => (
                  <div key={`soon-${i}`} className="flex items-start justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-xs font-bold text-foreground">{item.employeeName}</p>
                      <p className="text-[10px] text-muted-foreground">{item.certType} — {item.certName}</p>
                    </div>
                    <Badge className="bg-amber-500/10 text-amber-600 border-0 text-[9px] font-bold shrink-0">
                      {item.daysLeft} hr lagi
                    </Badge>
                  </div>
                ))}
              </>
            )}
          </div>
        </Card>

        <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest p-5 shadow-sm">
          <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5 mb-4">
            <Clock className="size-4 text-primary" />
            Informasi Sistem
          </h4>
          <div className="space-y-3 text-xs text-muted-foreground">
            <p>Data sertifikasi SIO/POP/POM diimpor dari file Excel dan dikelola manual.</p>
            <p>Status expiry otomatis dihitung berdasarkan tanggal masa berlaku.</p>
            <p>Peringatan dikirim untuk sertifikat yang akan expired dalam 30 hari.</p>
            <div className="bg-amber-50 p-3 rounded-lg border border-dashed border-amber-200 text-amber-800">
              <strong>Link User Management:</strong> Data karyawan terhubung via SN/Email ke modul User Management. Poin produktivitas otomatis diberikan saat sertifikasi baru ditambahkan.
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
