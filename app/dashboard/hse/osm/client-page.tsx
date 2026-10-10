"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  HardHat,
  Loader2,
  MapPin,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { AdminPageShell } from "@/components/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteHseOsmSession,
  getHseOsmDashboardData,
  getHseOsmSessionById,
  getHseOsmSessions,
} from "@/app/actions/hse-osm";
import { HSE_OSM_STATUS_CONFIG, type HseOsmFindingStatus } from "@/lib/hse-osm-constants";
import { OsmSessionModal } from "@/components/hse/osm-session-modal";
import { OsmDetailDialog } from "@/components/hse/osm-detail-dialog";

type OsmClientPageProps = {
  initialData: any;
};

export function OsmClientPage({ initialData }: OsmClientPageProps) {
  const [metrics, setMetrics] = useState(initialData?.metrics || {
    totalSessions: 0,
    totalFindings: 0,
    openTickets: 0,
    processedTickets: 0,
    closedTickets: 0,
    rejectedTickets: 0,
  });

  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [siteFilter, setSiteFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [focusFilter, setFocusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Modals
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const sitesList = initialData?.sites || [];
  const focusItems = initialData?.focusItems || [];
  const classifications = initialData?.classifications || [];
  const currentUser = initialData?.actor?.employee || null;

  async function loadData() {
    setIsLoading(true);
    try {
      const activeSiteId = siteFilter !== "ALL" ? Number(siteFilter) : undefined;
      const resSessions = await getHseOsmSessions({
        siteId: activeSiteId,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        focusItemId: focusFilter !== "ALL" ? Number(focusFilter) : undefined,
        search: searchQuery || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });

      if (resSessions.success && resSessions.data) {
        setSessions(resSessions.data);
      }

      const resMetrics = await getHseOsmDashboardData(activeSiteId);
      if (resMetrics.success && resMetrics.metrics) {
        setMetrics(resMetrics.metrics);
      }
    } catch (err) {
      console.error("Gagal refresh data OSM:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteFilter, statusFilter, focusFilter, dateFrom, dateTo]);

  async function handleOpenDetail(sessionId: number) {
    setIsLoadingDetail(true);
    try {
      const res = await getHseOsmSessionById(sessionId);
      if (res.success && res.data) {
        setSelectedSessionDetail(res.data);
        setIsDetailDialogOpen(true);
      }
    } catch (err) {
      console.error("Gagal memuat detail sesi:", err);
    } finally {
      setIsLoadingDetail(false);
    }
  }

  async function handleDeleteSession(sessionId: number) {
    if (!confirm("Apakah Anda yakin ingin menghapus sesi monitoring ini beserta temuannya?")) return;
    try {
      await deleteHseOsmSession(sessionId);
      await loadData();
    } catch (err) {
      console.error("Gagal menghapus sesi:", err);
    }
  }

  // Export CSV
  function handleExportCsv() {
    if (sessions.length === 0) return;
    const headers = [
      "No Sesi",
      "Tanggal",
      "Waktu",
      "Site",
      "Area Lokasi",
      "Fokus Area",
      "Inisiator Leader",
      "NRP Leader",
      "Total Temuan",
      "Temuan Open",
      "Temuan Processed",
      "Temuan Closed",
      "Temuan Rejected",
      "Status Sesi",
    ];

    const csvRows = [headers.join(",")];
    for (const s of sessions) {
      const row = [
        `"${s.sessionNumber}"`,
        `"${s.inspectionDate}"`,
        `"${s.inspectionTime}"`,
        `"${s.siteName || "-"}"`,
        `"${s.locationArea.replace(/"/g, '""')}"`,
        `"${s.focusItemName}"`,
        `"${s.leadEmployeeName}"`,
        `"${s.leadBadgeNumber}"`,
        s.findingsSummary?.total || 0,
        s.findingsSummary?.open || 0,
        s.findingsSummary?.processed || 0,
        s.findingsSummary?.closed || 0,
        s.findingsSummary?.rejected || 0,
        `"${s.status}"`,
      ];
      csvRows.push(row.join(","));
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `OSM_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // TanStack Virtualizer Table standard
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: sessions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0) : 0;

  return (
    <AdminPageShell
      title="On the Spot Monitoring (OSM)"
      eyebrow="HSE Safety & Risk Control"
      description="Pemantauan inspeksi keselamatan lapangan, geotagging temuan bahaya, & pelacakan tindakan korektif."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={sessions.length === 0}
            className="text-xs h-8 gap-1.5"
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => setIsSessionModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 gap-1.5 shadow-sm"
          >
            <Plus className="size-3.5" />
            Buat Sesi Baru
          </Button>
        </div>
      }
    >
      {/* 4 Metric Cards (Benchmarking KPC & HERO Standard) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Sessions Card */}
        <div className="rounded-xl border bg-card p-4 shadow-xs space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Sesi OSM</span>
            <HardHat className="size-4 text-slate-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{metrics.totalSessions}</span>
            <span className="text-[11px] text-muted-foreground font-medium">sesi inspeksi</span>
          </div>
          <span className="text-[10px] text-muted-foreground block truncate">
            {metrics.totalFindings} total temuan lapangan
          </span>
        </div>

        {/* OPEN TICKETS CARD */}
        <div className="rounded-xl border border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/50 p-4 shadow-xs space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-red-700 dark:text-red-300">
            <span className="text-xs font-bold uppercase tracking-wider">0 OPEN</span>
            <AlertTriangle className="size-4 text-red-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-700 dark:text-red-300">
              {metrics.openTickets}
            </span>
            <span className="text-[11px] text-red-600/80 font-medium">Tiket Open</span>
          </div>
          <span className="text-[10px] text-red-600/80 block">Menunggu tindakan korektif</span>
        </div>

        {/* PROCESSED TICKETS CARD */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/50 p-4 shadow-xs space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-300">
            <span className="text-xs font-bold uppercase tracking-wider">PROCESSED</span>
            <Clock className="size-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700 dark:text-amber-300">
              {metrics.processedTickets}
            </span>
            <span className="text-[11px] text-amber-600/80 font-medium">Ditindaklanjuti</span>
          </div>
          <span className="text-[10px] text-amber-600/80 block">Menunggu verifikasi HSE</span>
        </div>

        {/* CLOSED TICKETS CARD */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/50 p-4 shadow-xs space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
            <span className="text-xs font-bold uppercase tracking-wider">CLOSED</span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {metrics.closedTickets}
            </span>
            <span className="text-[11px] text-emerald-600/80 font-medium">Tiket Closed</span>
          </div>
          <span className="text-[10px] text-emerald-600/80 block">Tuntas terverifikasi</span>
        </div>

        {/* REJECTED TICKETS CARD */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 dark:bg-slate-900/40 dark:border-slate-800 p-4 shadow-xs space-y-1.5 flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
            <span className="text-xs font-bold uppercase tracking-wider">REJECTED</span>
            <XCircle className="size-4 text-slate-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-700 dark:text-slate-300">
              {metrics.rejectedTickets}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Tiket Rejected</span>
          </div>
          <span className="text-[10px] text-slate-500 block">Perlu revisi tindakan</span>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="rounded-xl border bg-card p-3.5 space-y-3 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {/* Site Filter */}
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Semua Site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                Semua Site
              </SelectItem>
              {sitesList.map((s: any) => (
                <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Focus Item Filter */}
          <Select value={focusFilter} onValueChange={setFocusFilter}>
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Semua Fokus Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                Semua Fokus Area
              </SelectItem>
              {focusItems.map((f: any) => (
                <SelectItem key={f.id} value={String(f.id)} className="text-xs">
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Semua Status Sesi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                Semua Status
              </SelectItem>
              <SelectItem value="ACTIVE" className="text-xs">
                Active
              </SelectItem>
              <SelectItem value="COMPLETED" className="text-xs">
                Completed
              </SelectItem>
              <SelectItem value="ARCHIVED" className="text-xs">
                Archived
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Date From */}
          <Input
            type="date"
            placeholder="Dari Tanggal"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="text-xs h-8"
          />

          {/* Date To */}
          <Input
            type="date"
            placeholder="Sampai Tanggal"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="text-xs h-8"
          />

          {/* Search Input & Button */}
          <div className="flex gap-1.5 sm:col-span-2 md:col-span-4 lg:col-span-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari lokasi, leader, no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadData()}
                className="pl-8 text-xs h-8"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={loadData}
              disabled={isLoading}
              className="h-8 px-2.5"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Table & Virtualization Standard Container */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
        <div
          ref={parentRef}
          className="h-[620px] overflow-auto relative scrollbar-thin scrollbar-thumb-accent"
        >
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 border-b shadow-2xs">
              <TableRow className="hover:bg-transparent text-xs">
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead className="w-36">Nomor Sesi</TableHead>
                <TableHead className="w-28">Waktu</TableHead>
                <TableHead className="w-36">Site</TableHead>
                <TableHead>Area Lokasi & Geotagging</TableHead>
                <TableHead>Fokus Area</TableHead>
                <TableHead>Inisiator Tim</TableHead>
                <TableHead className="text-center w-40">Status Temuan</TableHead>
                <TableHead className="text-right w-28">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center text-xs text-muted-foreground">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="size-5 animate-spin text-amber-600" />
                        <span>Memuat daftar sesi OSM...</span>
                      </div>
                    ) : (
                      "Tidak ada sesi monitoring yang sesuai dengan filter."
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {paddingTop > 0 && (
                    <tr>
                      <td style={{ height: `${paddingTop}px` }} />
                    </tr>
                  )}
                  {virtualRows.map((virtualRow) => {
                    const session = sessions[virtualRow.index];
                    if (!session) return null;

                    const summary = session.findingsSummary || {
                      total: 0,
                      open: 0,
                      processed: 0,
                      closed: 0,
                      rejected: 0,
                    };

                    return (
                      <TableRow
                        key={session.id}
                        className="text-xs hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleOpenDetail(session.id)}
                      >
                        <TableCell className="text-center font-mono text-muted-foreground text-[11px]">
                          {virtualRow.index + 1}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-foreground">
                          {session.sessionNumber}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{session.inspectionDate}</div>
                          <span className="text-[11px] text-muted-foreground">
                            {session.inspectionTime}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          {session.siteName || "Head Office"}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-foreground truncate max-w-xs">
                            {session.locationArea}
                          </div>
                          {session.latitude && (
                            <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="size-3 text-red-500" />
                              {session.latitude}, {session.longitude}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-amber-600 dark:text-amber-400">
                            {session.focusItemName}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground truncate max-w-[160px]">
                            {session.leadEmployeeName}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <span>{session.leadBadgeNumber}</span>
                            <span>•</span>
                            <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded">
                              {session.teamCount || 1} Personil
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {summary.total === 0 ? (
                            <span className="text-[11px] text-muted-foreground italic">
                              Nol Temuan
                            </span>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              {summary.open > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                                  {summary.open} Open
                                </span>
                              )}
                              {summary.processed > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                  {summary.processed} Proc
                                </span>
                              )}
                              {summary.closed > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  {summary.closed} Done
                                </span>
                              )}
                              {summary.rejected > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                                  {summary.rejected} Rej
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              title="Lihat Detail Dokumen"
                              onClick={() => handleOpenDetail(session.id)}
                            >
                              <Eye className="size-3.5" />
                            </Button>
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              title="Cetak PDF"
                            >
                              <Link href={`/print/hse/osm/${session.id}`} target="_blank">
                                <Printer className="size-3.5" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Hapus Sesi"
                              onClick={() => handleDeleteSession(session.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {paddingBottom > 0 && (
                    <tr>
                      <td style={{ height: `${paddingBottom}px` }} />
                    </tr>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modals */}
      <OsmSessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        currentUser={currentUser}
        sitesList={sitesList}
        focusItems={focusItems}
        onSuccess={loadData}
      />

      <OsmDetailDialog
        isOpen={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        sessionData={selectedSessionDetail}
        onRefresh={async () => {
          await loadData();
          if (selectedSessionDetail?.id) {
            const res = await getHseOsmSessionById(selectedSessionDetail.id);
            if (res.success && res.data) setSelectedSessionDetail(res.data);
          }
        }}
      />
    </AdminPageShell>
  );
}
