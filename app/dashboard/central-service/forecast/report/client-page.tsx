"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Search, ArrowUpDown, Download } from "lucide-react";
import { getSapRevenue } from "@/app/actions/central-service-forecast";
import html2canvas from "html2canvas-pro";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const fmtIdr = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

const fmtUsd = (v: number) =>
  "$" + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

/** Plain number format with dots (e.g. 14.000.000) — no currency symbol */
const fmtNum = (v: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(v);

const fmtNumUsd = (v: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(v);

const fmtPct = (v: number) => v.toFixed(1);

const formatShort = (val: number) => {
  if (val >= 1000000) return "$" + (val / 1000000).toFixed(1) + "M";
  if (val >= 1000) return "$" + (val / 1000).toFixed(1) + "K";
  return "$" + val.toFixed(0);
};

const renderBarLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (!value || value === 0) return null;
  return (
    <text x={x + width / 2} y={y - 6} textAnchor="middle" fill="#374151" fontSize={10} fontWeight={600}>
      {formatShort(value)}
    </text>
  );
};

const renderPieLabel = ({ name, value }: { name: string; value: number }) => {
  return `${name}: ${formatShort(value)}`;
};

function CategoryScoreCard({
  label,
  forecast,
  forecastUsd,
  actual,
  actualUsd,
  colorClass,
  textClass,
}: {
  label: string;
  forecast: number;
  forecastUsd: number;
  actual: number;
  actualUsd?: number;
  colorClass: string;
  textClass: string;
}) {
  const p = forecast > 0 ? Math.min((actual / forecast) * 100, 999) : 0;
  const barColor =
    p >= 100 ? "bg-emerald-500" : p >= 80 ? "bg-blue-500" : p >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 flex flex-col gap-3 shadow-sm relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${colorClass}`} />
      <div className="flex justify-between items-start">
        <div className="text-[11px] font-black uppercase text-muted-foreground tracking-wider line-clamp-2 max-w-[65%] pl-2">
          {label}
        </div>
        <div className={`text-3xl font-black ${textClass} drop-shadow-sm`}>{fmtPct(p)}%</div>
      </div>
      <div className="flex justify-between items-end mt-4 pl-2">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground font-bold uppercase">Forecast</span>
          <span className="text-lg font-black tracking-tight">{fmtIdr(forecast)}</span>
          {forecastUsd > 0 && (
            <span className="text-sm font-bold text-muted-foreground">{fmtUsd(forecastUsd)}</span>
          )}
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[10px] text-primary/70 font-bold uppercase">Revenue (IDR)</span>
          <span className="text-lg font-black text-primary tracking-tighter">{fmtIdr(actual)}</span>
          {actualUsd !== undefined && actualUsd > 0 && (
            <span className="text-sm font-bold text-muted-foreground">{fmtUsd(actualUsd)}</span>
          )}
        </div>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full w-[calc(100%-8px)] ml-2 overflow-hidden mt-3">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: Math.min(p, 100) + "%" }} />
      </div>
    </div>
  );
}

type CategoryRow = {
  category: string;
  forecastIdr: number;
  actualIdr: number;
  forecastUsd: number;
  actualUsd: number;
  remarkMonthly: string;
  remarkDaily: string;
  status: string;
  color: string;
};

type CustomerGroup = {
  key: string;
  customer: string;
  pic: string;
  month: string;
  categories: CategoryRow[];
  totalAmountIdr: number;
  totalAmountUsd: number;
};

const CAT_COLORS: Record<string, string> = {
  Outstanding: "bg-amber-100 text-amber-700",
  Repair: "bg-amber-100 text-amber-700",
  Service: "bg-blue-100 text-blue-700",
  Retread: "bg-emerald-100 text-emerald-700",
  Accessories: "bg-gray-100 text-gray-700",
};

export function ReportClientPage({
  periods,
  dailyItems,
  initialSapRevenue,
  exchangeRate,
}: {
  periods: any[];
  dailyItems: any[];
  initialSapRevenue: {
    service: { idr: number; usd: number };
    repair: { idr: number; usd: number };
    retread: { idr: number; usd: number };
    rows: any[];
  };
  exchangeRate: string;
}) {
  const [selectedPeriodId, setSelectedPeriodId] = useState(periods[0]?.id?.toString() || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"customer" | "actual">("customer");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [sapRevenue, setSapRevenue] = useState(initialSapRevenue);
  const [isLoadingSap, setIsLoadingSap] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const rate = Number(exchangeRate) || 15000;

  const handleExportJpeg = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        margin: { top: 40, bottom: 40, left: 40, right: 40 },
      } as any);
      const link = document.createElement("a");
      link.download = `daily-report-${periods.find((p) => p.id.toString() === selectedPeriodId)?.monthYear || "export"}.jpeg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const filtered = useMemo(() => {
    return dailyItems.filter((w: any) => {
      if (w.period.id.toString() !== selectedPeriodId) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          w.item.customer?.toLowerCase().includes(q) ||
          w.item.picSales?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [dailyItems, selectedPeriodId, searchQuery]);

  useEffect(() => {
    const period = periods.find((p) => p.id.toString() === selectedPeriodId);
    if (!period) return;
    setIsLoadingSap(true);
    getSapRevenue(period.monthYear)
      .then(setSapRevenue)
      .finally(() => setIsLoadingSap(false));
  }, [selectedPeriodId, periods]);

  const totals = useMemo(() => {
    let serviceFc = 0, serviceAct = 0;
    let repairFc = 0, repairAct = 0;
    let retreadFc = 0, retreadAct = 0;
    let osFc = 0;

    filtered.forEach((w: any) => {
      const item = w.item;
      osFc += Number(item.osInvoicePrevMonth || 0);
      serviceFc += Number(item.serviceForecast || 0);
      repairFc += Number(item.repairForecast || 0);
      retreadFc += Number(item.retreadForecast || 0);

      w.actuals?.forEach((a: any) => {
        const amt = Number(a.amountIdr);
        if (a.category === "Service") serviceAct += amt;
        else if (a.category === "Repair") repairAct += amt;
        else if (a.category === "Retread") retreadAct += amt;
      });
    });

    return { serviceFc, serviceAct, repairFc, repairAct, retreadFc, retreadAct, osFc };
  }, [filtered]);

  const categoryData = useMemo(() => {
    return [
      { name: "Outstanding", Forecast: totals.osFc / rate, Actual: 0 },
      { name: "Repair", Forecast: totals.repairFc / rate, Actual: totals.repairAct / rate },
      { name: "Retread", Forecast: totals.retreadFc / rate, Actual: totals.retreadAct / rate },
      { name: "Service", Forecast: totals.serviceFc / rate, Actual: totals.serviceAct / rate },
    ];
  }, [totals, rate]);

  const pieData = useMemo(() => {
    return [
      { name: "Outstanding", value: totals.osFc / rate },
      { name: "Repair", value: totals.repairFc / rate },
      { name: "Retread", value: totals.retreadFc / rate },
      { name: "Service", value: totals.serviceFc / rate },
    ].filter((c) => c.value > 0);
  }, [totals, rate]);

  const groupedData = useMemo(() => {
    const map = new Map<string, CustomerGroup>();

    filtered.forEach((w: any) => {
      const item = w.item;
      const period = w.period;
      const key = `${item.customer}-${item.id}`;
      const isAcc = item.isProductAccessories;

      if (map.has(key)) return;

      const categories: CategoryRow[] = [];

      if (isAcc) {
        const forecastIdr = Number(item.accessoriesAmountIdr || 0);
        const forecastUsd = Number(item.accessoriesAmountUsd || 0);
        if (forecastIdr > 0) {
          categories.push({
            category: "Accessories",
            forecastIdr,
            actualIdr: 0,
            forecastUsd,
            actualUsd: 0,
            remarkMonthly: item.remark || "",
            remarkDaily: "",
            status: item.status,
            color: CAT_COLORS.Accessories,
          });
        }
      } else {
        const os = Number(item.osInvoicePrevMonth || 0);
        const repair = Number(item.repairForecast || 0);
        const service = Number(item.serviceForecast || 0);
        const retread = Number(item.retreadForecast || 0);

        if (os > 0) {
          categories.push({
            category: "Outstanding",
            forecastIdr: os,
            actualIdr: 0,
            forecastUsd: 0,
            actualUsd: 0,
            remarkMonthly: "",
            remarkDaily: "",
            status: item.status,
            color: "bg-amber-100 text-amber-700",
          });
        }
        if (repair > 0) {
          categories.push({
            category: "Repair",
            forecastIdr: repair,
            actualIdr: 0,
            forecastUsd: 0,
            actualUsd: 0,
            remarkMonthly: item.repairRemark || "",
            remarkDaily: "",
            status: item.status,
            color: CAT_COLORS.Repair,
          });
        }
        if (service > 0) {
          categories.push({
            category: "Service",
            forecastIdr: service,
            actualIdr: 0,
            forecastUsd: 0,
            actualUsd: 0,
            remarkMonthly: item.serviceRemark || "",
            remarkDaily: "",
            status: item.status,
            color: CAT_COLORS.Service,
          });
        }
        if (retread > 0) {
          categories.push({
            category: "Retread",
            forecastIdr: retread,
            actualIdr: 0,
            forecastUsd: 0,
            actualUsd: 0,
            remarkMonthly: item.retreadRemark || "",
            remarkDaily: "",
            status: item.status,
            color: CAT_COLORS.Retread,
          });
        }
      }

      // Overlay actuals if they exist (already sorted by updateDate DESC from server)
      // Track which categories already got their daily remark so we keep only the latest
      const seenDailyRemark = new Set<string>();
      w.actuals?.forEach((a: any) => {
        const existing = categories.find((c) => c.category === a.category);
        if (existing) {
          existing.actualIdr = Number(a.amountIdr);
          existing.actualUsd = Number(a.amountUsd);
          // Only set remarkDaily from the first (latest) actual per category
          if (!seenDailyRemark.has(a.category)) {
            existing.remarkDaily = a.remark || existing.remarkDaily;
            existing.status = a.itemStatus || existing.status;
            seenDailyRemark.add(a.category);
          }
        } else {
          if (!seenDailyRemark.has(a.category)) {
            seenDailyRemark.add(a.category);
          }
          categories.push({
            category: a.category,
            forecastIdr: 0,
            actualIdr: Number(a.amountIdr),
            forecastUsd: 0,
            actualUsd: Number(a.amountUsd),
            remarkMonthly: "",
            remarkDaily: a.remark || "",
            status: a.itemStatus || "-",
            color: CAT_COLORS[a.category] || "bg-gray-100 text-gray-700",
          });
        }
      });

      if (categories.length === 0) return;

      const totalAmountIdr = categories.reduce((s, c) => s + c.forecastIdr, 0);
      const totalAmountUsd = totalAmountIdr / rate;

      map.set(key, {
        key,
        customer: item.customer,
        pic: item.picSales,
        month: period?.monthYear || "",
        categories,
        totalAmountIdr,
        totalAmountUsd,
      });
    });

    let groups = Array.from(map.values());

    groups.sort((a, b) => {
      const valA = sortField === "customer" ? a.customer.toLowerCase() : a.categories.reduce((s, c) => s + c.forecastIdr + c.actualIdr, 0);
      const valB = sortField === "customer" ? b.customer.toLowerCase() : b.categories.reduce((s, c) => s + c.forecastIdr + c.actualIdr, 0);
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return groups;
  }, [filtered, sortField, sortOrder]);

  const toggleSort = (field: "customer" | "actual") => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortOrder("asc"); }
  };

  const totalRowIdr = groupedData.reduce((s, g) => s + g.categories.reduce((cs, c) => cs + c.forecastIdr + c.actualIdr, 0), 0);
  const totalRowUsd = groupedData.reduce((s, g) => s + g.categories.reduce((cs, c) => cs + c.forecastUsd + c.actualUsd, 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold">Daily Report</h2>
          <div className="w-[200px]">
            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.monthYear}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search customer or PIC..."
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="h-9" onClick={handleExportJpeg}>
            <Download className="w-4 h-4 mr-2" />
            Export JPEG
          </Button>
        </div>
      </div>

      <div ref={reportRef} className="p-10 bg-white">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CategoryScoreCard
          label="Outstanding Prev Month"
          forecast={totals.osFc}
          forecastUsd={totals.osFc / rate}
          actual={0}
          colorClass="bg-amber-500"
          textClass="text-amber-700"
        />
        <CategoryScoreCard
          label="Forecast Service"
          forecast={totals.serviceFc}
          forecastUsd={totals.serviceFc / rate}
          actual={totals.serviceAct}
          actualUsd={sapRevenue.service.usd}
          colorClass="bg-blue-500"
          textClass="text-blue-700"
        />
        <CategoryScoreCard
          label="Forecast Repair"
          forecast={totals.repairFc}
          forecastUsd={totals.repairFc / rate}
          actual={totals.repairAct}
          actualUsd={sapRevenue.repair.usd}
          colorClass="bg-amber-500"
          textClass="text-amber-700"
        />
        <CategoryScoreCard
          label="Forecast Retread"
          forecast={totals.retreadFc}
          forecastUsd={totals.retreadFc / rate}
          actual={totals.retreadAct}
          actualUsd={sapRevenue.retread.usd}
          colorClass="bg-emerald-500"
          textClass="text-emerald-700"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Forecast vs Actual (By Category)</CardTitle>
            <CardDescription className="text-xs">Comparison in USD</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 25, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(val) => formatShort(val)} />
                <Tooltip formatter={(val: number) => "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
                <Legend />
                <Bar dataKey="Forecast" fill="#8884d8" label={renderBarLabel} />
                <Bar dataKey="Actual" fill="#82ca9d" label={renderBarLabel} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Forecast Composition</CardTitle>
            <CardDescription className="text-xs">Share of forecast per category</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} label={renderPieLabel} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="border-2 border-primary/10 bg-white rounded-lg overflow-hidden mt-6">
        <div className="bg-[#0052CC] text-white py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Pending Document {periods.find((p) => p.id.toString() === selectedPeriodId)?.monthYear || ""}
            </div>
            <div className="text-right text-xs">
              <span className="text-white/70 font-bold">TOTAL: </span>
              <span className="font-black">{fmtIdr(totalRowIdr)}</span>
              <span className="text-white/70"> | </span>
              <span className="font-black">{fmtUsd(totalRowUsd)}</span>
            </div>
          </div>
        </div>
        <div className="p-0">
          <div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-yellow-400">
                  <th className="text-black font-bold text-xs text-center border border-black/20 px-2 py-2 w-[40px]">No</th>
                  <th
                    className="text-black font-bold text-xs text-left border border-black/20 px-2 py-2 cursor-pointer hover:bg-yellow-500"
                    onClick={() => toggleSort("customer")}
                  >
                    <div className="flex items-center gap-1">
                      Customer <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="text-black font-bold text-xs text-left border border-black/20 px-2 py-2">PIC</th>
                  <th className="text-black font-bold text-xs text-left border border-black/20 px-2 py-2">Category</th>
                  <th className="text-black font-bold text-xs text-left border border-black/20 px-2 py-2">Remark Daily</th>
                  <th className="text-black font-bold text-xs text-right border border-black/20 px-2 py-2">Amount</th>
                  <th className="text-black font-bold text-xs text-center border border-black/20 px-2 py-2">Status</th>
                  <th className="text-black font-bold text-xs text-right border border-black/20 px-2 py-2">Amount IDR</th>
                  <th className="text-black font-bold text-xs text-right border border-black/20 px-2 py-2">Amount USD</th>
                  <th className="text-black font-bold text-xs text-left border border-black/20 px-2 py-2">Remark Monthly</th>
                  <th className="text-black font-bold text-xs text-center border border-black/20 px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {groupedData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8 text-muted-foreground">
                      No data for this period
                    </td>
                  </tr>
                ) : (
                  groupedData.map((group, gi) => {
                    const groupRemarkMonthly = group.categories[0]?.remarkMonthly || "";
                    const groupStatus = group.categories[0]?.status || "";
                    const catLen = group.categories.length;
                    return group.categories.map((cat, ci) => {
                      const isFirst = ci === 0;
                      const isLast = ci === catLen - 1;
                      // Border logic: top border on first row, bottom border on last row, side borders always
                      const groupCellBorder = `border-l border-r border-black/10 ${isFirst ? "border-t border-black/10" : ""} ${isLast ? "border-b border-black/10" : ""}`;
                      return (
                        <tr key={`${group.key}-${ci}`} className="bg-white hover:bg-gray-50 transition-colors">
                          {/* No */}
                          <td className={`text-xs text-center align-top px-2 py-1.5 ${groupCellBorder}`}>
                            {isFirst ? gi + 1 : ""}
                          </td>
                          {/* Customer */}
                          <td className={`text-xs font-bold align-top px-2 py-1.5 ${groupCellBorder}`}>
                            {isFirst ? group.customer : ""}
                          </td>
                          {/* PIC */}
                          <td className={`text-xs align-top italic px-2 py-1.5 ${groupCellBorder}`}>
                            {isFirst ? group.pic : ""}
                          </td>
                          {/* Category */}
                          <td className="text-xs border border-black/10 px-2 py-1.5">
                            {cat.category}
                          </td>
                          {/* Remark (daily - latest) */}
                          <td className="text-xs border border-black/10 text-center break-words whitespace-normal px-2 py-1.5">
                            {cat.remarkDaily || ""}
                          </td>
                          {/* Amount */}
                          <td className="text-xs text-right border border-black/10 tabular-nums px-2 py-1.5">
                            {cat.forecastIdr > 0 ? fmtNum(cat.forecastIdr) : ""}
                          </td>
                          {/* Status per category */}
                          <td className="text-xs text-center border border-black/10 px-2 py-1.5">
                            {cat.status || ""}
                          </td>
                          {/* Amount IDR (group) */}
                          <td className={`text-xs text-right align-top tabular-nums font-semibold px-2 py-1.5 ${groupCellBorder}`}>
                            {isFirst && group.totalAmountIdr > 0 ? fmtNum(group.totalAmountIdr) : ""}
                          </td>
                          {/* Amount USD (group) */}
                          <td className={`text-xs text-right align-top tabular-nums font-semibold px-2 py-1.5 ${groupCellBorder}`}>
                            {isFirst && group.totalAmountUsd > 0 ? fmtNumUsd(Math.round(group.totalAmountUsd)) : ""}
                          </td>
                          {/* Remark monthly (group) */}
                          <td className={`text-xs align-top text-center break-words whitespace-normal px-2 py-1.5 ${groupCellBorder}`}>
                            {isFirst ? groupRemarkMonthly : ""}
                          </td>
                          {/* Status (group) */}
                          <td className={`text-xs text-center align-top px-2 py-1.5 ${groupCellBorder}`}>
                            {isFirst ? groupStatus : ""}
                          </td>
                        </tr>
                      );
                    });
                  })
                )}
                {groupedData.length > 0 && (
                  <tr className="bg-yellow-100 font-bold border-t-2">
                    <td colSpan={5} className="text-xs text-right border border-black/10 px-2 py-1.5">TOTAL</td>
                    <td className="text-xs text-right border border-black/10 tabular-nums px-2 py-1.5">{fmtNum(groupedData.reduce((s, g) => s + g.categories.reduce((cs, c) => cs + c.forecastIdr, 0), 0))}</td>
                    <td className="border border-black/10 px-2 py-1.5" />
                    <td className="text-xs text-right border border-black/10 tabular-nums font-bold px-2 py-1.5">{fmtNum(groupedData.reduce((s, g) => s + g.totalAmountIdr, 0))}</td>
                    <td className="text-xs text-right border border-black/10 tabular-nums font-bold px-2 py-1.5">{fmtNumUsd(Math.round(groupedData.reduce((s, g) => s + g.totalAmountUsd, 0)))}</td>
                    <td colSpan={2} className="border border-black/10 px-2 py-1.5" />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
