"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MinimalTableShell } from "@/components/ui/minimal-table-shell"
import { EnterpriseActionButtons } from "@/components/ui/enterprise-table-kit"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

export function TireInspectionClient({ data, access, basePath = "/dashboard/hse/tire-inspection" }: { data: any[], access: any, basePath?: string }) {
  const router = useRouter()

  const columns = [
    {
      accessorKey: "inspectionDate",
      header: "Tanggal",
      cell: ({ row }: any) => format(new Date(row.original.inspectionDate), "dd MMM yyyy"),
    },
    {
      accessorKey: "siteName",
      header: "Site",
    },
    {
      accessorKey: "customerName",
      header: "Customer",
    },
    {
      accessorKey: "shift",
      header: "Shift",
    },
    {
      accessorKey: "totalScore",
      header: "Skor",
      cell: ({ row }: any) => {
        const score = row.original.totalScore
        let variant = "default" as any
        let label = "Unknown"
        if (score >= 85) { variant = "success"; label = "Excellent" }
        else if (score >= 70) { variant = "secondary"; label = "Good" }
        else if (score >= 50) { variant = "warning"; label = "Moderate" }
        else { variant = "destructive"; label = "High Risk" }
        return (
          <div className="flex items-center gap-2">
            <span className="font-semibold">{Number(score).toFixed(1)}</span>
            <Badge variant={variant}>{label}</Badge>
          </div>
        )
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const status = row.original.status
        return <Badge variant="outline">{status.replace("_", " ")}</Badge>
      }
    },
    {
      id: "actions",
      cell: ({ row }: any) => (
        <EnterpriseActionButtons
          onView={() => router.push(`${basePath}/detail/${row.original.id}`)}
          access={access}
          onEdit={() => router.push(`${basePath}/editor/${row.original.id}`)}
        />
      ),
    },
  ]

  const scorecards = [
    {
      label: "Total Inspeksi",
      value: data.length.toString(),
      description: "Semua laporan inspeksi",
      icon: "camera",
    },
    {
      label: "Rata-rata Skor",
      value: (data.length ? (data.reduce((acc, curr) => acc + Number(curr.totalScore || 0), 0) / data.length).toFixed(1) : 0).toString(),
      description: "Skor kesehatan site",
      icon: "activity",
    },
  ]

  return (
    <MinimalTableShell
      label="inspeksi site"
      title="Daftar Inspeksi Site"
      description="Kelola laporan inspeksi kondisi area tambang."
      fileName="tire-inspection-report"
      searchPlaceholder="Cari berdasarkan site atau customer..."
      scorecards={scorecards}
      access={access}
      primaryAction={
        access.canEdit && (
          <Button onClick={() => router.push(`${basePath}/create`)}>
            <Plus className="mr-2 h-4 w-4" />
            Inspeksi Baru
          </Button>
        )
      }
    >
      <div className="rounded-md border bg-card overflow-hidden">
        <div className="h-[600px] overflow-auto scrollbar-thin scrollbar-thumb-accent relative">
          <Table>
            <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur-sm z-10">
              <TableRow>
                {columns.map((col: any) => (
                  <TableHead key={col.accessorKey || col.id}>{col.header || ""}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row: any, i: number) => (
                <TableRow key={row.id || i}>
                  {columns.map((col: any) => (
                    <TableCell key={col.accessorKey || col.id}>
                      {col.cell ? col.cell({ row: { original: row } }) : row[col.accessorKey]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                    Belum ada data inspeksi.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </MinimalTableShell>
  )
}
