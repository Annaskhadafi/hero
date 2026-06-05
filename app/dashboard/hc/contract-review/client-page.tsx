"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import { deleteContractReview } from "@/app/actions/contract-review"
import { AdminPageShell } from "@/components/admin-page-shell"
import { HcWorkspaceBanner, hcPrimaryActionClassName } from "@/components/hc/hc-workspace-banner"
import { Button } from "@/components/ui/button"
import { EnterpriseActionButtons } from "@/components/ui/enterprise-table-kit"
import { MinimalTableShell } from "@/components/ui/minimal-table-shell"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function ContractReviewClientPage({ reviews, employees }: { reviews: any[], employees: any[] }) {
  const router = useRouter()
  const [rows, setRows] = useState(reviews)
  const access = { canView: true, canEdit: true, canDelete: true }

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus review ini?")) return
    setRows(rows.filter((r) => r.id !== id))
    await deleteContractReview(id)
  }

  return (
    <AdminPageShell eyebrow="HC • Contract & Probation" title="Employee Review" description="Kelola evaluasi probation dan contract extension karyawan.">
      <HcWorkspaceBanner
        title="Contract & Probation Reviews"
        description="Monitor evaluasi karyawan untuk perpanjangan kontrak atau pengangkatan karyawan tetap."
        items={[
          { label: "Total Reviews", value: rows.length, tone: "slate" },
        ]}
      />

      <MinimalTableShell 
        label="contract review" 
        title="Daftar Review" 
        description="Daftar historis evaluasi karyawan." 
        fileName="contract-reviews-hc" 
        searchPlaceholder="Cari..." 
        access={access} 
        primaryAction={
          <Button onClick={() => router.push('/dashboard/hc/contract-review/form')} className={hcPrimaryActionClassName}>
            <Plus className="size-4" />Tambah Review
          </Button>
        } 
        columnOptions={[]}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Karyawan</TableHead>
              <TableHead>Jenis Review</TableHead>
              <TableHead>Tgl Masuk</TableHead>
              <TableHead>Tgl Review</TableHead>
              <TableHead>Rekomendasi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">Belum ada data review.</TableCell>
              </TableRow>
            )}
            {rows.map((row) => {
              const emp = employees.find(e => e.id === row.employeeId)
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{emp?.name || row.employeeNameStr || '-'}</TableCell>
                  <TableCell className="capitalize">{row.reviewType}</TableCell>
                  <TableCell>{row.hireDate ? new Date(row.hireDate).toLocaleDateString('id-ID') : '-'}</TableCell>
                  <TableCell>{row.todayDate ? new Date(row.todayDate).toLocaleDateString('id-ID') : '-'}</TableCell>
                  <TableCell className="capitalize">{row.recommendation.replace('_', ' ')}</TableCell>
                  <TableCell className="capitalize">{row.status}</TableCell>
                  <TableCell>
                    <EnterpriseActionButtons 
                      access={access} 
                      labels={{ view: "Print Preview", edit: "Edit", delete: "Hapus" }} 
                      onView={() => router.push(`/dashboard/hc/contract-review/form/${row.id}?mode=print`)} 
                      onEdit={() => router.push(`/dashboard/hc/contract-review/form/${row.id}`)} 
                      onDelete={() => handleDelete(row.id)} 
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </MinimalTableShell>
    </AdminPageShell>
  )
}
