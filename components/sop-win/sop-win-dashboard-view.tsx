"use client";

import { useMemo } from "react";
import {
  FileText,
  FileSpreadsheet,
  Shield,
  Layers,
  History,
  TrendingUp,
  Building,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

interface SopWinDashboardViewProps {
  data: {
    totalDocuments: number;
    totalSop: number;
    totalWin: number;
    totalPol: number;
    totalRevisions: number;
    departmentStats: Array<{ code: string; name: string; count: number }>;
    recentRevisions: Array<{
      id: number;
      documentId: number;
      revisionNumber: string;
      effectiveDate: Date | string | null;
      changeDescription: string;
      createdAt: Date | string;
      documentTitle: string;
      documentNumber: string;
      documentType: string;
      departmentCode: string;
    }>;
    recentDocuments: Array<{
      id: number;
      documentNumber: string;
      title: string;
      documentType: string;
      departmentCode: string;
      currentRevision: string;
      status: string;
      createdAt: Date | string;
    }>;
  };
  onSelectDepartment?: (deptCode: string) => void;
}

const TYPE_COLORS = {
  SOP: "#4f46e5", // Indigo
  WIN: "#0284c7", // Sky
  POL: "#10b981", // Emerald
};

const PIE_COLORS = ["#4f46e5", "#0284c7", "#10b981"];

export function SopWinDashboardView({
  data,
  onSelectDepartment,
}: SopWinDashboardViewProps) {
  const totalSop = data?.totalSop || 0;
  const totalWin = data?.totalWin || 0;
  const totalPol = data?.totalPol || 0;
  const totalDocuments = data?.totalDocuments || 0;
  const totalRevisions = data?.totalRevisions || 0;
  const departmentStats = Array.isArray(data?.departmentStats) ? data.departmentStats : [];
  const recentRevisions = Array.isArray(data?.recentRevisions) ? data.recentRevisions : [];

  const typePieData = useMemo(() => {
    return [
      { name: "SOP", value: totalSop },
      { name: "WIN", value: totalWin },
      { name: "POL", value: totalPol },
    ].filter((d) => d.value > 0);
  }, [totalSop, totalWin, totalPol]);

  const barData = useMemo(() => {
    return departmentStats.map((d) => ({
      name: d.code,
      fullName: d.name,
      count: d.count,
    }));
  }, [departmentStats]);

  return (
    <div className="space-y-6">
      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Documents */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Dokumen
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-[#003461] dark:bg-blue-950 dark:text-blue-300">
              <FileText className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {totalDocuments}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Dokumen Aktif</span>
          </div>
        </div>

        {/* Total SOP */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Standar SOP
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
              <Layers className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
              {totalSop}
            </span>
            <span className="text-[11px] text-indigo-500 font-medium">Prosedur</span>
          </div>
        </div>

        {/* Total WIN */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Instruksi WIN
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300">
              <FileSpreadsheet className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-sky-700 dark:text-sky-300">
              {totalWin}
            </span>
            <span className="text-[11px] text-sky-500 font-medium">Petunjuk Kerja</span>
          </div>
        </div>

        {/* Total POL */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Kebijakan POL
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
              <Shield className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
              {totalPol}
            </span>
            <span className="text-[11px] text-emerald-500 font-medium">Policy</span>
          </div>
        </div>

        {/* Total Revisions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Total Revisi
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300">
              <History className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-amber-700 dark:text-amber-300">
              {totalRevisions}
            </span>
            <span className="text-[11px] text-amber-600 font-medium">Riwayat Versi</span>
          </div>
        </div>
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bar Chart: Distribution across 15 Departments */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Building className="size-4 text-[#003461]" />
                Distribusi Dokumen Per Departemen
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Jumlah SOP, WIN, dan POL terdaftar di 15 departemen operasional.
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              15 Departemen
            </Badge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  formatter={(val: any) => [`${val} Dokumen`, "Total"]}
                  labelFormatter={(label: any) => `Department ${label}`}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#003461"
                  radius={[6, 6, 0, 0]}
                  onClick={(entry) => {
                    if (onSelectDepartment && entry?.name) {
                      onSelectDepartment(entry.name);
                    }
                  }}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: SOP vs WIN vs POL Composition */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="size-4 text-indigo-600" />
              Komposisi Tipe Dokumen
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Proporsi Standar Prosedur, Instruksi Kerja, dan Kebijakan.
            </p>
          </div>

          <div className="h-52 w-full flex-1 flex items-center justify-center">
            {totalDocuments === 0 ? (
              <p className="text-xs text-slate-400">Belum ada data dokumen</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {typePieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          TYPE_COLORS[entry.name as keyof typeof TYPE_COLORS] ||
                          PIE_COLORS[index % PIE_COLORS.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} Dokumen`, name]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800 text-center">
            <div>
              <div className="flex items-center justify-center gap-1">
                <span className="size-2 rounded-full bg-indigo-600" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">SOP</span>
              </div>
              <span className="text-xs font-black text-indigo-700">{totalSop}</span>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <span className="size-2 rounded-full bg-sky-600" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">WIN</span>
              </div>
              <span className="text-xs font-black text-sky-700">{totalWin}</span>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <span className="size-2 rounded-full bg-emerald-600" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">POL</span>
              </div>
              <span className="text-xs font-black text-emerald-700">{totalPol}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity / Revisions Feed */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="size-4 text-amber-600" />
            Riwayat Revisi Dokumen Terkini
          </h3>
          <span className="text-xs text-slate-400 font-medium">Log Pembaruan</span>
        </div>

        {recentRevisions.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            Belum ada riwayat revisi tercatat.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentRevisions.map((rev) => (
              <div
                key={rev.id}
                className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 space-y-2 dark:border-slate-800/60 dark:bg-slate-900/40"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Badge
                      className={`text-[10px] font-bold border-none ${
                        rev.documentType === "SOP"
                          ? "bg-indigo-100 text-indigo-800"
                          : rev.documentType === "WIN"
                          ? "bg-sky-100 text-sky-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {rev.documentType}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      Rev {rev.revisionNumber}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Dept: {rev.departmentCode}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {rev.documentNumber}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
                    {rev.documentTitle}
                  </p>
                </div>

                <div className="rounded-xl bg-white p-2 text-[11px] text-slate-600 line-clamp-2 border border-slate-100 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300">
                  {rev.changeDescription || "Tidak ada catatan perubahan"}
                </div>

                <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                  <span>
                    {new Date(rev.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <CheckCircle2 className="size-3" />
                    Aktif
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
