"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  HardHat,
  Loader2,
  MapPin,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Trash2,
  XCircle,
} from "lucide-react";
import { AdminPageShell } from "@/components/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HeroConfirmDialog,
  HeroDataTable,
  HeroDatePicker,
  HeroKpiCard,
  HeroSearchableSelect,
  type HeroColumnDef,
  type HeroTableFilter,
} from "@/components/templates";
import {
  deleteHseOsmSession,
  getHseOsmDashboardData,
  getHseOsmSessionById,
  getHseOsmSessions,
} from "@/app/actions/hse-osm";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { OsmDetailDialog } from "@/components/hse/osm-detail-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type OsmClientPageProps = {
  initialData: any;
};

export function OsmClientPage({ initialData }: OsmClientPageProps) {
  const [metrics, setMetrics] = useState(
    initialData?.metrics || {
      totalSessions: 0,
      totalFindings: 0,
      openTickets: 0,
      processedTickets: 0,
      closedTickets: 0,
      rejectedTickets: 0,
    }
  );

  const [sessions, setSessions] = useState<any[]>(initialData?.sessions || []);
  const [isLoading, setIsLoading] = useState(false);

  // Status Filter Pill Tab: "ALL" | "OPEN" | "IN PROGRESS" | "CLOSED" | "REJECTED"
  const [activeStatusTab, setActiveStatusTab] = useState<string>("ALL");

  // Advanced Filters
  const [siteFilter, setSiteFilter] = useState<string>("ALL");
  const [focusFilter, setFocusFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Dialogs
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sitesList = initialData?.sites || [];
  const focusItems = initialData?.focusItems || [];

  async function loadData() {
    setIsLoading(true);
    try {
      const activeSiteId = siteFilter !== "ALL" ? Number(siteFilter) : undefined;
      const formattedDateFrom = dateFrom ? dateFrom.toISOString().slice(0, 10) : undefined;
      const formattedDateTo = dateTo ? dateTo.toISOString().slice(0, 10) : undefined;

      const resSessions = await getHseOsmSessions({
        siteId: activeSiteId,
        status: activeStatusTab !== "ALL" ? activeStatusTab : undefined,
        focusItemId: focusFilter !== "ALL" ? Number(focusFilter) : undefined,
        search: searchQuery || undefined,
        dateFrom: formattedDateFrom,
        dateTo: formattedDateTo,
      });

      if (resSessions.success && resSessions.data) {
        setSessions(resSessions.data);
      }

      const resMetrics = await getHseOsmDashboardData(activeSiteId);
      if (resMetrics.success && resMetrics.metrics) {
        setMetrics(resMetrics.metrics);
      }
    } catch (err) {
      console.error("Gagal refresh data OSM List:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatusTab, siteFilter, focusFilter, dateFrom, dateTo]);

  async function handleOpenDetail(sessionId: number) {
    try {
      const res = await getHseOsmSessionById(sessionId);
      if (res.success && res.data) {
        setSelectedSessionDetail(res.data);
        setIsDetailDialogOpen(true);
      }
    } catch (err) {
      console.error("Gagal memuat detail sesi:", err);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      const res = await deleteHseOsmSession(deleteTargetId);
      if (res.success) {
        setDeleteTargetId(null);
        await loadData();
      } else {
        alert(res.error || "Gagal menghapus sesi OSM");
      }
    } catch (err: any) {
      console.error("Gagal menghapus sesi OSM:", err);
      alert(err?.message || "Terjadi kesalahan saat menghapus sesi OSM");
    } finally {
      setIsDeleting(false);
    }
  }

  // Export CSV
  function handleExportCsv() {
    if (sessions.length === 0) return;
    const headers = [
      "Ticket Number",
      "Tanggal & Waktu",
      "Report Inisiator",
      "Perusahaan / Departemen",
      "Report Destination",
      "Site",
      "Fokus Area",
      "Status",
      "Substandard",
      "Standard",
      "Total Temuan",
    ];

    const csvRows = [headers.join(",")];
    for (const s of sessions) {
      const summary = s.findingsSummary || {};
      const row = [
        `"${s.sessionNumber || ""}"`,
        `"${s.inspectionDate || ""} ${s.inspectionTime || ""}"`,
        `"${(s.leadEmployeeName || "").replace(/"/g, '""')}"`,
        `"${(s.leadCompany || s.leadDepartment || "").replace(/"/g, '""')}"`,
        `"${(s.locationArea || "").replace(/"/g, '""')}"`,
        `"${(s.siteName || "Head Office").replace(/"/g, '""')}"`,
        `"${(s.focusItemName || "").replace(/"/g, '""')}"`,
        `"${s.ticketStatus || s.status || "CLOSED"}"`,
        summary.substandard || 0,
        summary.standard || 0,
        summary.total || 0,
      ];
      csvRows.push(row.join(","));
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `OSM_List_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Filter options for HeroSearchableSelect
  const siteSelectOptions = useMemo(
    () => [
      { value: "ALL", label: "Semua Site Operasional" },
      ...sitesList.map((s: any) => ({ value: String(s.id), label: s.name })),
    ],
    [sitesList]
  );

  const focusSelectOptions = useMemo(
    () => [
      { value: "ALL", label: "Semua Fokus Area" },
      ...focusItems.map((f: any) => ({ value: String(f.id), label: f.name })),
    ],
    [focusItems]
  );

  // Status Tabs definitions (benchmarking Image 2)
  const statusTabs = [
    { key: "ALL", label: "All" },
    { key: "OPEN", label: "Open" },
    { key: "IN PROGRESS", label: "In Progress" },
    { key: "CLOSED", label: "Closed" },
    { key: "REJECTED", label: "Rejected" },
  ];

  // Table Columns matching Image 2
  const columns: HeroColumnDef<any>[] = [
    {
      key: "leadEmployeeName",
      header: "REPORT INISIATOR",
      sortable: true,
      className: "w-[240px]",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground text-sm leading-snug">
            {row.leadEmployeeName}
          </span>
          <span className="text-xs text-muted-foreground">
            {row.leadCompany || row.leadDepartment || "PT Chitra Paratama"}
          </span>
        </div>
      ),
      exportValue: (row) => row.leadEmployeeName,
    },
    {
      key: "locationArea",
      header: "REPORT DESTINATION",
      sortable: true,
      className: "w-[260px]",
      render: (row) => (
        <div className="flex flex-col max-w-[260px]">
          <span className="font-semibold text-foreground text-xs leading-snug truncate">
            {row.locationArea}
          </span>
          <span className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
            <span>{row.siteName || "Head Office"}</span>
            {row.locationDetail && <span>• {row.locationDetail}</span>}
          </span>
        </div>
      ),
      exportValue: (row) => `${row.locationArea} - ${row.siteName || ""}`,
    },
    {
      key: "sessionNumber",
      header: "TICKET NUMBER",
      sortable: true,
      className: "w-[180px]",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-foreground tracking-tight">
          {row.sessionNumber}
        </span>
      ),
      exportValue: (row) => row.sessionNumber,
    },
    {
      key: "status",
      header: "STATUS",
      sortable: true,
      className: "w-[130px]",
      render: (row) => {
        const ticketStatus = row.ticketStatus || (row.status === "ACTIVE" ? "OPEN" : "CLOSED");
        if (ticketStatus === "OPEN") {
          return (
            <span className="font-bold text-xs uppercase tracking-wider text-red-600 dark:text-red-400">
              OPEN
            </span>
          );
        }
        if (ticketStatus === "IN PROGRESS") {
          return (
            <span className="font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">
              IN PROGRESS
            </span>
          );
        }
        if (ticketStatus === "CLOSED") {
          return (
            <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              CLOSED
            </span>
          );
        }
        return (
          <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
            {ticketStatus}
          </span>
        );
      },
      exportValue: (row) => row.ticketStatus || row.status,
    },
    {
      key: "temuan",
      header: "TEMUAN",
      className: "w-[240px]",
      render: (row) => {
        const summary = row.findingsSummary || {};
        const substandard = summary.substandard ?? summary.open ?? 0;
        const standard = summary.standard ?? summary.closed ?? 0;

        if (substandard === 0 && standard === 0) {
          return (
            <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal">
              0 Temuan
            </Badge>
          );
        }

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {substandard > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide bg-red-600 text-white shadow-2xs">
                {substandard} SUBSTANDARD
              </span>
            )}
            {standard > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide bg-emerald-600 text-white shadow-2xs">
                {standard} STANDARD
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "inspectionDate",
      header: "CREATED AT",
      sortable: true,
      className: "w-[150px]",
      render: (row) => (
        <div className="flex flex-col text-xs">
          <span className="font-medium text-foreground">{row.inspectionDate}</span>
          <span className="text-[11px] text-muted-foreground">{row.inspectionTime}</span>
        </div>
      ),
      exportValue: (row) => `${row.inspectionDate} ${row.inspectionTime}`,
    },
    {
      key: "actions",
      header: "ACTIONS",
      sortable: false,
      align: "right",
      className: "w-[110px]",
      render: (row) => {
        const isDraft = !row.isLocked || row.status === "ACTIVE" || row.status === "DRAFT";
        return (
          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 border border-border/40 hover:border-border"
                >
                  Actions <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 shadow-lg">
                <DropdownMenuItem
                  onSelect={() => handleOpenDetail(row.id)}
                  className="cursor-pointer gap-2 text-xs"
                >
                  <Eye className="size-3.5 text-muted-foreground" />
                  <span>Lihat Detail</span>
                </DropdownMenuItem>
                {isDraft && (
                  <DropdownMenuItem
                    onSelect={() => setDeleteTargetId(row.id)}
                    className="cursor-pointer gap-2 text-xs text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40 font-medium"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Hapus Sesi (Draft)</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const hasActiveAdvancedFilters =
    siteFilter !== "ALL" || focusFilter !== "ALL" || !!dateFrom || !!dateTo;

  return (
    <AdminPageShell
      title="OSM list"
      eyebrow="OSM Management  /  OSM list"
      description="Daftar pemantauan On the Spot Monitoring (OSM) inspeksi keselamatan lapangan, temuan bahaya, & tindak lanjut perbaikan."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={sessions.length === 0}
            className="h-9 text-xs gap-1.5"
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
            className="h-9 px-3 text-xs gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      }
    >
      {/* 1. Mobile Execution Policy Banner */}
      <div className="flex items-start sm:items-center gap-3.5 p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-xl text-blue-900 dark:text-blue-200 shadow-2xs">
        <div className="size-8 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
          <Smartphone className="size-4" />
        </div>
        <div className="flex-1 text-xs leading-relaxed">
          <span className="font-bold">Pelaksanaan Inspeksi Hanya Dilakukan Melalui HP:</span>
          <span className="ml-1 text-blue-800/90 dark:text-blue-300">
            Sesuai standar operasional, pelaksanaan inspeksi On the Spot Monitoring (OSM) dan input temuan keselamatan hanya dapat dilakukan secara mobile melalui aplikasi <strong>HERO Mobile (HP)</strong> langsung di lapangan. Aplikasi HERO Desktop ini difokuskan sebagai <strong>OSM List</strong> untuk monitoring, peninjauan bukti temuan, dan verifikasi perbaikan.
          </span>
        </div>
      </div>

      {/* 2. Scorecard KPIs (Colorful Tones Standard) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <HeroKpiCard
          title="Total Sesi OSM"
          value={metrics.totalSessions}
          description="Sesi inspeksi lapangan"
          icon={<HardHat className="size-5" />}
          tone="blue"
        />
        <HeroKpiCard
          title="Open Tickets"
          value={metrics.openTickets}
          description="Menunggu perbaikan"
          icon={<AlertTriangle className="size-5" />}
          tone="rose"
        />
        <HeroKpiCard
          title="Processed"
          value={metrics.processedTickets}
          description="Menunggu verifikasi"
          icon={<Clock className="size-5" />}
          tone="amber"
        />
        <HeroKpiCard
          title="Closed Tickets"
          value={metrics.closedTickets}
          description="Tuntas terverifikasi"
          icon={<CheckCircle2 className="size-5" />}
          tone="emerald"
        />
        <HeroKpiCard
          title="Rejected"
          value={metrics.rejectedTickets}
          description="Perlu revisi perbaikan"
          icon={<XCircle className="size-5" />}
          tone="cyan"
        />
      </div>

      {/* 3. Search Bar, Status Pills & Filter Button (Benchmarking Image 2) */}
      <div className="rounded-xl border bg-card p-3.5 space-y-3.5 shadow-2xs">
        {/* Top line: Search OSM Input & Filter Popover */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search OSM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadData()}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Filter Popover Button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={hasActiveAdvancedFilters ? "default" : "outline"}
                size="sm"
                className={`h-9 text-xs gap-1.5 ${
                  hasActiveAdvancedFilters ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                <Filter className="size-3.5" />
                Filter
                {hasActiveAdvancedFilters && (
                  <span className="size-2 rounded-full bg-amber-400 ml-0.5" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-4 space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-bold text-sm text-foreground">Filter Lanjutan OSM</span>
                {hasActiveAdvancedFilters && (
                  <button
                    onClick={() => {
                      setSiteFilter("ALL");
                      setFocusFilter("ALL");
                      setDateFrom(undefined);
                      setDateTo(undefined);
                    }}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* Site Select */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Site</label>
                <HeroSearchableSelect
                  options={siteSelectOptions}
                  value={siteFilter}
                  onChange={setSiteFilter}
                  placeholder="Pilih Site..."
                />
              </div>

              {/* Focus Area Select */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Fokus Area</label>
                <HeroSearchableSelect
                  options={focusSelectOptions}
                  value={focusFilter}
                  onChange={setFocusFilter}
                  placeholder="Pilih Fokus Area..."
                />
              </div>

              {/* Date From */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Dari Tanggal</label>
                <HeroDatePicker
                  value={dateFrom}
                  onChange={setDateFrom}
                  placeholder="Pilih tanggal awal"
                />
              </div>

              {/* Date To */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Sampai Tanggal</label>
                <HeroDatePicker
                  value={dateTo}
                  onChange={setDateTo}
                  placeholder="Pilih tanggal akhir"
                />
              </div>

              <Button
                size="sm"
                className="w-full h-8 text-xs mt-2"
                onClick={() => loadData()}
              >
                Terapkan Filter
              </Button>
            </PopoverContent>
          </Popover>
        </div>

        {/* Bottom line: STATUS Pills (All, Open, In Progress, Closed, Rejected) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase mr-1">
            STATUS
          </span>
          {statusTabs.map((tab) => {
            const isActive = activeStatusTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveStatusTab(tab.key)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Table Standard HeroDataTable */}
      <HeroDataTable
        data={sessions}
        columns={columns}
        idField="id"
        loading={isLoading}
        onRowClick={(row) => handleOpenDetail(row.id)}
        exportFileName={`OSM_List_${new Date().toISOString().slice(0, 10)}`}
        pdfTitle="Laporan On the Spot Monitoring (OSM List) — HERO HSE"
        emptyMessage="Tidak ada data inspeksi OSM yang sesuai dengan kriteria filter."
        showSelection={false}
        showPagination={true}
      />

      {/* 5. Detail Modal Dialog (allowAddFinding={false} for desktop) */}
      <OsmDetailDialog
        isOpen={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        sessionData={selectedSessionDetail}
        onRefresh={loadData}
        allowAddFinding={false}
        onDelete={() => {
          if (selectedSessionDetail?.id) {
            setDeleteTargetId(selectedSessionDetail.id);
          }
        }}
      />

      {/* 6. Confirm Delete Dialog */}
      <HeroConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Hapus Sesi OSM"
        description="Apakah Anda yakin ingin menghapus sesi monitoring ini beserta seluruh temuan lapangannya? Tindakan ini bersifat permanen."
        confirmLabel="Ya, Hapus Sesi"
        cancelLabel="Batal"
        tone="destructive"
        isProcessing={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </AdminPageShell>
  );
}
