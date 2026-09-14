"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import * as XLSX from "xlsx";
import {
  Calendar,
  ChevronLeft,
  FileSpreadsheet,
  FileText,
  Package,
  Printer,
  Search,
  Wrench,
  CheckCircle2,
  Clock,
  XCircle,
  Layers,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApdMonthlyReportData } from "@/lib/apd-reports-data";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const YEARS = [2024, 2025, 2026, 2027];

export function ApdMonthlyReportView({
  category,
  data,
  currentYear,
  currentMonth,
  currentSiteId,
}: {
  category: "APD" | "MATERIAL_TOOLS";
  data: ApdMonthlyReportData;
  currentYear: number;
  currentMonth: number; // 0 = all, 1-12
  currentSiteId?: number;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("details");

  const titleText =
    category === "APD"
      ? "Laporan Bulanan Permintaan APD"
      : "Laporan Bulanan Permintaan Material & Tools";

  const descriptionText =
    category === "APD"
      ? "Rekapitulasi dan riwayat transaksi pengajuan Alat Pelindung Diri (APD) karyawan per bulan."
      : "Rekapitulasi dan riwayat transaksi pengajuan Material dan Tools per bulan.";

  const monthLabel =
    currentMonth > 0 ? MONTH_NAMES[currentMonth - 1] : "Sepanjang Tahun";

  // Filter detail rows by search keyword & status
  const filteredRows = useMemo(() => {
    return data.rows.filter((row) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        row.requestNumber.toLowerCase().includes(q) ||
        row.employeeName.toLowerCase().includes(q) ||
        row.employeeSn.toLowerCase().includes(q) ||
        row.siteName.toLowerCase().includes(q) ||
        row.items.some((it) => it.itemType.toLowerCase().includes(q));

      const st = (row.status || "").toLowerCase();
      let matchesStatus = true;
      if (statusFilter === "approved") {
        matchesStatus =
          st === "approved" ||
          st === "proses_order" ||
          st === "selesai" ||
          st === "completed";
      } else if (statusFilter === "pending") {
        matchesStatus =
          st === "pending_approval" ||
          st === "pending" ||
          st === "diajukan" ||
          st === "draft";
      } else if (statusFilter === "rejected") {
        matchesStatus =
          st === "rejected" || st === "ditolak" || st === "reverted";
      }

      return matchesSearch && matchesStatus;
    });
  }, [data.rows, search, statusFilter]);

  function handleFilterChange(newYear: number, newMonth: number, newSiteId?: number) {
    const params = new URLSearchParams();
    params.set("year", String(newYear));
    if (newMonth > 0) {
      params.set("month", String(newMonth));
    }
    if (newSiteId) {
      params.set("siteId", String(newSiteId));
    }
    const path =
      category === "APD"
        ? "/dashboard/apd/reports/apd"
        : "/dashboard/apd/reports/material-tools";
    router.push(`${path}?${params.toString()}`);
  }

  function handleExportExcel() {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Detail Transaksi
    const titleRows = [
      [`HERO • ${titleText.toUpperCase()}`],
      [`Periode: ${monthLabel} ${currentYear}`],
      [`Waktu Unduh: ${format(new Date(), "dd MMMM yyyy HH:mm", { locale: idLocale })}`],
      [],
      [
        "No",
        "No Tiket",
        "Tanggal",
        "Kategori",
        "SN Karyawan",
        "Nama Karyawan",
        "Jabatan",
        "Departemen",
        "Section",
        "Site",
        "Daftar Barang & Kuantiti",
        "Total Qty",
        "Status Permohonan",
        "Catatan",
      ],
    ];

    const dataRows = filteredRows.map((r, idx) => [
      idx + 1,
      r.requestNumber,
      format(new Date(r.requestDate), "dd/MM/yyyy", { locale: idLocale }),
      r.requestCategory,
      r.employeeSn,
      r.employeeName,
      r.jobTitle || "-",
      r.departmentName || "-",
      r.sectionName || "-",
      r.siteName,
      r.items.map((it) => `${it.itemType} (${it.quantity}x - ${it.requestType})`).join("; "),
      r.totalQuantity,
      r.status,
      r.notes || "-",
    ]);

    const totalQtyAll = filteredRows.reduce((acc, r) => acc + r.totalQuantity, 0);
    const footerRow = [
      "TOTAL",
      `${filteredRows.length} Tiket`,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      totalQtyAll,
      "",
      "",
    ];

    const wsDetail = XLSX.utils.aoa_to_sheet([...titleRows, ...dataRows, footerRow]);
    wsDetail["!cols"] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 28 },
      { wch: 22 },
      { wch: 24 },
      { wch: 24 },
      { wch: 20 },
      { wch: 45 },
      { wch: 12 },
      { wch: 18 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, "Detail Transaksi");

    // Sheet 2: Rekap per Item
    const itemTitleRows = [
      [`HERO • REKAPITULASI BARANG - ${category === "APD" ? "APD" : "MATERIAL & TOOLS"}`],
      [`Periode: ${monthLabel} ${currentYear}`],
      [],
      [
        "No",
        "Nama Barang",
        "Kategori",
        "Total Unit Diminta",
        "Jumlah Tiket Pengajuan",
        "Kuantiti Permintaan Baru",
        "Kuantiti Pergantian Rusak/Habis",
      ],
    ];

    const itemRows = data.itemSummaries.map((it, idx) => [
      idx + 1,
      it.itemType,
      it.category,
      it.totalQuantity,
      it.requestCount,
      it.baruQuantity,
      it.pergantianQuantity,
    ]);

    const totalItemQty = data.itemSummaries.reduce((a, b) => a + b.totalQuantity, 0);
    const totalBaruQty = data.itemSummaries.reduce((a, b) => a + b.baruQuantity, 0);
    const totalPergantianQty = data.itemSummaries.reduce((a, b) => a + b.pergantianQuantity, 0);
    const totalTickets = data.itemSummaries.reduce((a, b) => a + b.requestCount, 0);

    const itemFooterRow = [
      "TOTAL",
      `${data.itemSummaries.length} Jenis Barang`,
      "",
      totalItemQty,
      totalTickets,
      totalBaruQty,
      totalPergantianQty,
    ];

    const wsItem = XLSX.utils.aoa_to_sheet([...itemTitleRows, ...itemRows, itemFooterRow]);
    wsItem["!cols"] = [
      { wch: 6 },
      { wch: 30 },
      { wch: 14 },
      { wch: 18 },
      { wch: 22 },
      { wch: 24 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, wsItem, "Rekap per Item");

    // Sheet 3: Rekap per Site
    const siteTitleRows = [
      [`HERO • REKAPITULASI SITE - ${category === "APD" ? "APD" : "MATERIAL & TOOLS"}`],
      [`Periode: ${monthLabel} ${currentYear}`],
      [],
      [
        "No",
        "Nama Site Kerja",
        "Total Tiket",
        "Total Unit Barang",
        "Disetujui",
        "Menunggu Approval",
        "Ditolak / Revisi",
      ],
    ];

    const siteRows = data.siteSummaries.map((s, idx) => [
      idx + 1,
      s.siteName,
      s.totalRequests,
      s.totalItems,
      s.approvedCount,
      s.pendingCount,
      s.rejectedCount,
    ]);

    const totalSiteReq = data.siteSummaries.reduce((a, b) => a + b.totalRequests, 0);
    const totalSiteItems = data.siteSummaries.reduce((a, b) => a + b.totalItems, 0);
    const totalSiteAppr = data.siteSummaries.reduce((a, b) => a + b.approvedCount, 0);
    const totalSitePend = data.siteSummaries.reduce((a, b) => a + b.pendingCount, 0);
    const totalSiteRej = data.siteSummaries.reduce((a, b) => a + b.rejectedCount, 0);

    const siteFooterRow = [
      "TOTAL",
      `${data.siteSummaries.length} Site`,
      totalSiteReq,
      totalSiteItems,
      totalSiteAppr,
      totalSitePend,
      totalSiteRej,
    ];

    const wsSite = XLSX.utils.aoa_to_sheet([...siteTitleRows, ...siteRows, siteFooterRow]);
    wsSite["!cols"] = [
      { wch: 6 },
      { wch: 26 },
      { wch: 14 },
      { wch: 18 },
      { wch: 14 },
      { wch: 20 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, wsSite, "Rekap per Site");

    const fileName = `Laporan_${category === "APD" ? "APD" : "Material_Tools"}_${monthLabel}_${currentYear}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  function getStatusBadge(status: string) {
    const st = (status || "").toLowerCase();
    if (st === "approved" || st === "proses_order" || st === "selesai" || st === "completed") {
      return (
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200">
          <CheckCircle2 className="mr-1 size-3" /> Disetujui
        </Badge>
      );
    }
    if (st === "rejected" || st === "ditolak") {
      return (
        <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200">
          <XCircle className="mr-1 size-3" /> Ditolak
        </Badge>
      );
    }
    if (st === "reverted") {
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200">
          <Clock className="mr-1 size-3" /> Perlu Revisi
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200">
        <Clock className="mr-1 size-3" /> Menunggu Review
      </Badge>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="rounded-xl p-5 shadow-sm border border-border">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              {category === "APD" ? (
                <Package className="size-6" />
              ) : (
                <Wrench className="size-6" />
              )}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">
                  {titleText}
                </h1>
                <Badge variant="secondary" className="font-mono text-xs">
                  {monthLabel} {currentYear}
                </Badge>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                {descriptionText}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/apd/inventory">
                <ChevronLeft className="mr-1.5 size-4" /> Kembali ke Inventory
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5"
            >
              <Printer className="size-4 text-muted-foreground" /> Cetak
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleExportExcel}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <FileSpreadsheet className="size-4" /> Export Excel (.xlsx)
            </Button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">Periode:</span>
          </div>

          {/* Month Selector */}
          <select
            value={currentMonth}
            onChange={(e) =>
              handleFilterChange(currentYear, Number(e.target.value), currentSiteId)
            }
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value={0}>Semua Bulan (Setahun Penuh)</option>
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            value={currentYear}
            onChange={(e) =>
              handleFilterChange(Number(e.target.value), currentMonth, currentSiteId)
            }
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {YEARS.map((yr) => (
              <option key={yr} value={yr}>
                Tahun {yr}
              </option>
            ))}
          </select>

          {/* Site Filter */}
          <select
            value={currentSiteId || ""}
            onChange={(e) =>
              handleFilterChange(
                currentYear,
                currentMonth,
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Semua Site Kerja</option>
            {data.sitesList.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>

          {/* Direct Switch to the Other Report */}
          <div className="ml-auto flex items-center gap-2">
            {category === "APD" ? (
              <Link
                href={`/dashboard/apd/reports/material-tools?year=${currentYear}${currentMonth ? `&month=${currentMonth}` : ""}`}
                className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                <Wrench className="size-3.5" /> Buka Laporan Material &amp; Tools &rarr;
              </Link>
            ) : (
              <Link
                href={`/dashboard/apd/reports/apd?year=${currentYear}${currentMonth ? `&month=${currentMonth}` : ""}`}
                className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                <Package className="size-3.5" /> Buka Laporan APD &rarr;
              </Link>
            )}
          </div>
        </div>
      </Card>

      {/* KPI Metrics Summary Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[0.7rem] font-semibold uppercase text-muted-foreground">Total Permintaan</p>
          <p className="mt-1 text-2xl font-bold font-display text-foreground">
            {data.metrics.totalRequests} <span className="text-xs font-normal text-muted-foreground">tiket</span>
          </p>
        </Card>

        <Card className="p-4 rounded-xl border border-border bg-card">
          <p className="text-[0.7rem] font-semibold uppercase text-muted-foreground">Total Unit Barang</p>
          <p className="mt-1 text-2xl font-bold font-display text-primary">
            {data.metrics.totalItems} <span className="text-xs font-normal text-muted-foreground">unit</span>
          </p>
        </Card>

        <Card className="p-4 rounded-xl border border-border bg-emerald-50/40 dark:bg-emerald-950/20">
          <p className="text-[0.7rem] font-semibold uppercase text-emerald-700 dark:text-emerald-400">Disetujui</p>
          <p className="mt-1 text-2xl font-bold font-display text-emerald-700 dark:text-emerald-300">
            {data.metrics.approvedRequests} <span className="text-xs font-normal text-emerald-600/70">tiket</span>
          </p>
        </Card>

        <Card className="p-4 rounded-xl border border-border bg-blue-50/40 dark:bg-blue-950/20">
          <p className="text-[0.7rem] font-semibold uppercase text-blue-700 dark:text-blue-400">Menunggu Review</p>
          <p className="mt-1 text-2xl font-bold font-display text-blue-700 dark:text-blue-300">
            {data.metrics.pendingRequests} <span className="text-xs font-normal text-blue-600/70">tiket</span>
          </p>
        </Card>

        <Card className="p-4 rounded-xl border border-border bg-rose-50/40 dark:bg-rose-950/20 col-span-2 sm:col-span-1">
          <p className="text-[0.7rem] font-semibold uppercase text-rose-700 dark:text-rose-400">Ditolak / Revisi</p>
          <p className="mt-1 text-2xl font-bold font-display text-rose-700 dark:text-rose-300">
            {data.metrics.rejectedRequests} <span className="text-xs font-normal text-rose-600/70">tiket</span>
          </p>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-9 p-1">
            <TabsTrigger value="details" className="gap-1.5 text-xs">
              <FileText className="size-3.5" /> Detail Transaksi ({filteredRows.length})
            </TabsTrigger>
            <TabsTrigger value="by-item" className="gap-1.5 text-xs">
              <Layers className="size-3.5" /> Rekap per Jenis Barang ({data.itemSummaries.length})
            </TabsTrigger>
            <TabsTrigger value="by-site" className="gap-1.5 text-xs">
              <MapPin className="size-3.5" /> Rekap per Site ({data.siteSummaries.length})
            </TabsTrigger>
          </TabsList>

          {/* Search & Sub-Filter for Details Tab */}
          {activeTab === "details" && (
            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari tiket, karyawan, barang..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">Semua Status</option>
                <option value="approved">Disetujui</option>
                <option value="pending">Menunggu Review</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Detailed Transactions Table */}
        <TabsContent value="details" className="mt-0">
          <Card className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs">No</TableHead>
                    <TableHead className="text-xs">No. Tiket</TableHead>
                    <TableHead className="text-xs">Tanggal</TableHead>
                    <TableHead className="text-xs">Karyawan</TableHead>
                    <TableHead className="text-xs">Site &amp; Section</TableHead>
                    <TableHead className="text-xs">Daftar Barang yang Diajukan</TableHead>
                    <TableHead className="text-center text-xs">Total Qty</TableHead>
                    <TableHead className="text-center text-xs">Status</TableHead>
                    <TableHead className="text-right text-xs">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row, idx) => (
                    <TableRow key={row.id} className="hover:bg-muted/30">
                      <TableCell className="text-center text-xs text-muted-foreground font-mono">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-primary whitespace-nowrap">
                        {row.requestNumber}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {format(new Date(row.requestDate), "dd MMM yyyy", { locale: idLocale })}
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">{row.employeeName}</p>
                          <p className="text-[0.7rem] font-mono text-muted-foreground">SN: {row.employeeSn}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-xs font-medium">{row.siteName}</p>
                          <p className="text-[0.7rem] text-muted-foreground">{row.sectionName || row.departmentName || "-"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 py-1 max-w-md">
                          {row.items.map((item, itemIdx) => (
                            <div
                              key={item.id || itemIdx}
                              className="inline-flex items-center gap-1.5 rounded bg-muted/60 px-2 py-0.5 text-xs text-foreground mr-1.5 mb-1"
                            >
                              <span className="font-medium">{item.itemType}</span>
                              <Badge variant="outline" className="text-[0.65rem] px-1 py-0 h-4">
                                {item.quantity}x
                              </Badge>
                              <span className="text-[0.65rem] text-muted-foreground">
                                ({item.requestType})
                              </span>
                            </div>
                          ))}
                          {row.items.length === 0 && (
                            <span className="text-xs text-muted-foreground italic">Tidak ada item spesifik</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs">
                        {row.totalQuantity}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {getStatusBadge(row.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild>
                          <Link href={`/dashboard/apd/${row.id}`}>
                            <ExternalLink className="size-3.5 mr-1" /> Detail
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                        Tidak ada transaksi permintaan {category === "APD" ? "APD" : "Material & Tools"} pada periode yang dipilih.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Item Breakdown Table */}
        <TabsContent value="by-item" className="mt-0">
          <Card className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs">No</TableHead>
                    <TableHead className="text-xs">Nama Barang / APD</TableHead>
                    <TableHead className="text-xs">Kategori</TableHead>
                    <TableHead className="text-center text-xs">Total Unit Diminta</TableHead>
                    <TableHead className="text-center text-xs">Permintaan Baru</TableHead>
                    <TableHead className="text-center text-xs">Pergantian Rusak / Habis</TableHead>
                    <TableHead className="text-center text-xs">Jumlah Tiket Pengajuan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.itemSummaries.map((it, idx) => (
                    <TableRow key={it.itemType} className="hover:bg-muted/30">
                      <TableCell className="text-center text-xs text-muted-foreground font-mono">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-foreground">
                        {it.itemType}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[0.7rem]">
                          {it.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold text-sm text-primary">
                        {it.totalQuantity} <span className="text-xs font-normal text-muted-foreground">unit</span>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <span className="inline-block rounded bg-blue-50 px-2 py-0.5 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                          {it.baruQuantity} unit
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <span className="inline-block rounded bg-amber-50 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          {it.pergantianQuantity} unit
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {it.requestCount} kali
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.itemSummaries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                        Belum ada data barang pada periode ini.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 3: Site Breakdown Table */}
        <TabsContent value="by-site" className="mt-0">
          <Card className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs">No</TableHead>
                    <TableHead className="text-xs">Nama Site Kerja</TableHead>
                    <TableHead className="text-center text-xs">Total Tiket Permintaan</TableHead>
                    <TableHead className="text-center text-xs">Total Unit Barang</TableHead>
                    <TableHead className="text-center text-xs">Disetujui</TableHead>
                    <TableHead className="text-center text-xs">Menunggu Approval</TableHead>
                    <TableHead className="text-center text-xs">Ditolak / Revisi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.siteSummaries.map((st, idx) => (
                    <TableRow key={st.siteId} className="hover:bg-muted/30">
                      <TableCell className="text-center text-xs text-muted-foreground font-mono">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-foreground">
                        {st.siteName}
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs">
                        {st.totalRequests} tiket
                      </TableCell>
                      <TableCell className="text-center font-bold text-xs text-primary">
                        {st.totalItems} unit
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <span className="text-emerald-600 font-semibold">{st.approvedCount}</span>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <span className="text-blue-600 font-semibold">{st.pendingCount}</span>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <span className="text-rose-600 font-semibold">{st.rejectedCount}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.siteSummaries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                        Belum ada data permintaan per site pada periode ini.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
