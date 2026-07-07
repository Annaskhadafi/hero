"use client";

import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Search, ArrowUpDown } from "lucide-react";

const fmtIdr = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

const fmtUsd = (v: number) =>
  "$" + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const fmtPct = (v: number) => v.toFixed(1);

function CategoryScoreCard({
  label,
  forecast,
  actual,
  colorClass,
  textClass,
}: {
  label: string;
  forecast: number;
  actual: number;
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
          <span className="text-base font-black tracking-tight">{fmtIdr(forecast)}</span>
        </div>
        <div className="flex flex-col text-right">
          <span className="text-[10px] text-primary/70 font-bold uppercase">Revenue</span>
          <span className="text-lg font-black text-primary tracking-tighter">{fmtIdr(actual)}</span>
        </div>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full w-[calc(100%-8px)] ml-2 overflow-hidden mt-3">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: Math.min(p, 100) + "%" }} />
      </div>
    </div>
  );
}

export function ReportClientPage({
  periods,
  dailyItems,
}: {
  periods: any[];
  dailyItems: any[];
}) {
  const [selectedPeriodId, setSelectedPeriodId] = useState(periods[0]?.id?.toString() || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"customer" | "actual">("customer");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

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

  const totals = useMemo(() => {
    let serviceFc = 0, serviceAct = 0;
    let repairFc = 0, repairAct = 0;
    let retreadFc = 0, retreadAct = 0;

    filtered.forEach((w: any) => {
      const item = w.item;
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

    return { serviceFc, serviceAct, repairFc, repairAct, retreadFc, retreadAct };
  }, [filtered]);

  const tableData = useMemo(() => {
    const rows: any[] = [];
    filtered.forEach((w: any) => {
      const customer = w.item.customer;
      const pic = w.item.picSales;
      w.actuals?.forEach((a: any) => {
        rows.push({
          customer,
          pic,
          amountIdr: Number(a.amountIdr),
          amountUsd: Number(a.amountUsd),
          remark: a.remark || "",
          category: a.category || "Service",
          id: a.id,
        });
      });
    });

    rows.sort((a, b) => {
      const valA = sortField === "customer" ? a.customer.toLowerCase() : a.amountIdr;
      const valB = sortField === "customer" ? b.customer.toLowerCase() : b.amountIdr;
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }, [filtered, sortField, sortOrder]);

  const toggleSort = (field: "customer" | "actual") => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortOrder("asc"); }
  };

  const totalRowIdr = tableData.reduce((s, r) => s + r.amountIdr, 0);
  const totalRowUsd = tableData.reduce((s, r) => s + r.amountUsd, 0);

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
        <div className="relative w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search customer or PIC..."
            className="pl-9 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CategoryScoreCard
          label="Forecast Service"
          forecast={totals.serviceFc}
          actual={totals.serviceAct}
          colorClass="bg-blue-500"
          textClass="text-blue-700"
        />
        <CategoryScoreCard
          label="Forecast Repair"
          forecast={totals.repairFc}
          actual={totals.repairAct}
          colorClass="bg-amber-500"
          textClass="text-amber-700"
        />
        <CategoryScoreCard
          label="Forecast Retread"
          forecast={totals.retreadFc}
          actual={totals.retreadAct}
          colorClass="bg-emerald-500"
          textClass="text-emerald-700"
        />
      </div>

      <div className="border-2 border-primary/10 bg-white rounded-lg overflow-hidden">
        <div className="bg-[#0052CC] text-white py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Waiting Document {periods.find((p) => p.id.toString() === selectedPeriodId)?.monthYear || ""}
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
          <div className="overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-yellow-400 hover:bg-yellow-400">
                  <TableHead className="text-black font-bold text-xs w-[30px]">No</TableHead>
                  <TableHead
                    className="text-black font-bold text-xs cursor-pointer hover:bg-yellow-500"
                    onClick={() => toggleSort("customer")}
                  >
                    <div className="flex items-center gap-1">
                      Customer <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-black font-bold text-xs">PIC</TableHead>
                  <TableHead
                    className="text-black font-bold text-xs cursor-pointer hover:bg-yellow-500"
                    onClick={() => toggleSort("actual")}
                  >
                    <div className="flex items-center gap-1">
                      Amount IDR <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-black font-bold text-xs">Amount USD</TableHead>
                  <TableHead className="text-black font-bold text-xs">Remark</TableHead>
                  <TableHead className="text-black font-bold text-xs">Job</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No actuals data for this period
                    </TableCell>
                  </TableRow>
                ) : (
                  tableData.map((row, i) => (
                    <TableRow key={row.id} className="bg-white hover:bg-gray-50 transition-colors">
                      <TableCell className="text-xs font-medium text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-xs font-bold">{row.customer}</TableCell>
                      <TableCell className="text-xs">{row.pic}</TableCell>
                      <TableCell className="text-xs font-bold text-green-700">{fmtIdr(row.amountIdr)}</TableCell>
                      <TableCell className="text-xs">{fmtUsd(row.amountUsd)}</TableCell>
                      <TableCell className="text-xs max-w-[250px] truncate" title={row.remark}>
                        {row.remark || "\u2014"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase " +
                            (row.category === "Service"
                              ? "bg-blue-100 text-blue-700"
                              : row.category === "Repair"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700")
                          }
                        >
                          {row.category}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {tableData.length > 0 && (
                  <TableRow className="bg-white font-bold border-t-2">
                    <TableCell colSpan={3} className="text-xs text-right">TOTAL</TableCell>
                    <TableCell className="text-xs text-green-700">{fmtIdr(totalRowIdr)}</TableCell>
                    <TableCell className="text-xs">{fmtUsd(totalRowUsd)}</TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
