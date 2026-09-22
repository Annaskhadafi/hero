"use client";

import React, { useState, useMemo } from "react";
import { SafetyShoesMatrixRow } from "@/lib/apd-inventory-data";
import { format } from "date-fns";
import { SizeInputCell, AttachmentCell } from "./safety-shoes-cell-actions";
import { EditSafetyShoesDatesModal } from "./edit-safety-shoes-dates-modal";
import { 
  DeleteSafetyShoesButton, 
  DeleteAttachmentButton,
  AddManualDateButton
} from "./safety-shoes-client-buttons";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Layers, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SafetyShoesTableClient({
  rows,
  years,
  allSites,
}: {
  rows: SafetyShoesMatrixRow[];
  years: number[];
  allSites: { id: number; name: string }[];
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const getNormalizedSection = (sectionName?: string | null) => {
    const raw = (sectionName || "").trim();
    const lower = raw.toLowerCase();
    if (!raw || raw === "-" || lower.includes("mvc") || lower.includes("other") || lower.includes("tanpa")) {
      return "Service Operation MVC Others";
    }
    return raw;
  };

  const searchedRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase().trim();
    return rows.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(q) ||
        r.employeeSn.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  const groupedSections = useMemo(() => {
    return searchedRows.reduce((acc, row) => {
      const sec = getNormalizedSection(row.sectionName);
      if (!acc[sec]) acc[sec] = [];
      acc[sec].push(row);
      return acc;
    }, {} as Record<string, SafetyShoesMatrixRow[]>);
  }, [searchedRows]);

  const sectionKeys = useMemo(() => {
    return Object.keys(groupedSections).sort((a, b) => a.localeCompare(b));
  }, [groupedSections]);

  const renderTable = (rowsToRender: SafetyShoesMatrixRow[]) => (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr className="border-b border-border">
            <th className="h-10 px-4 text-left font-medium">NO</th>
            <th className="h-10 px-4 text-left font-medium">Nama</th>
            <th className="h-10 px-4 text-left font-medium">SN</th>
            <th className="h-10 px-4 text-left font-medium">Site</th>
            <th className="h-10 px-4 text-left font-medium">Section</th>
            <th className="h-10 px-4 text-left font-medium">Size</th>
            <th className="h-10 px-4 text-left font-medium">Attachment</th>
            {years.map((y) => (
              <th key={y} colSpan={2} className="h-10 px-4 text-center font-medium border-l border-border/50">
                {y}
              </th>
            ))}
            <th className="h-10 px-4 text-center font-medium border-l border-border/50">Aksi</th>
          </tr>
          <tr className="border-b border-border text-xs">
            <th colSpan={7}></th>
            {years.map((y) => (
              <React.Fragment key={`sub-${y}`}>
                <th className="h-8 px-2 font-medium border-l border-border/50 text-center">I</th>
                <th className="h-8 px-2 font-medium border-l border-border/50 text-center">II</th>
              </React.Fragment>
            ))}
            <th className="p-0 border-l border-border/50"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {rowsToRender.length === 0 ? (
            <tr>
              <td colSpan={8 + (years.length * 2)} className="p-8 text-center text-muted-foreground">
                {searchQuery ? `Tidak ada karyawan yang cocok dengan pencarian "${searchQuery}".` : "Belum ada data karyawan Central Service di section/site ini."}
              </td>
            </tr>
          ) : (
            rowsToRender.map((row, index) => (
              <tr key={row.employeeId} className="hover:bg-muted/50 transition-colors">
                <td className="p-4 align-middle font-medium text-muted-foreground">{index + 1}</td>
                <td className="p-4 align-middle font-medium">{row.employeeName}</td>
                <td className="p-4 align-middle">{row.employeeSn}</td>
                <td className="p-4 align-middle">{row.siteName}</td>
                <td className="p-4 align-middle text-muted-foreground">
                  {row.sectionName && row.sectionName !== "-" ? row.sectionName : "Others"}
                </td>
                <td className="p-4 align-middle">
                  <SizeInputCell 
                    employeeId={row.employeeId} 
                    assetId={row.latestAssetId} 
                    initialSize={row.size || ""} 
                  />
                </td>
                <td className="p-4 align-middle">
                  <AttachmentCell 
                    employeeId={row.employeeId} 
                    assetId={row.latestAssetId} 
                    initialUrl={row.attachmentUrl} 
                  />
                </td>
                {years.map((y) => {
                  const datesArray = row.history[y.toString()] || [];
                  const date1 = datesArray[0];
                  const date2 = datesArray[1];
                  return (
                    <React.Fragment key={y}>
                      <td className="p-2 align-middle text-center border-l border-border/50 whitespace-nowrap">
                        {date1 ? format(date1, "dd-MMM-yy") : "-"}
                      </td>
                      <td className="p-2 align-middle text-center border-l border-border/50 whitespace-nowrap">
                        {date2 ? format(date2, "dd-MMM-yy") : "-"}
                      </td>
                    </React.Fragment>
                  );
                })}
                <td className="p-4 align-middle border-l border-border/50">
                  <div className="flex items-center justify-center gap-1">
                    <EditSafetyShoesDatesModal 
                      employee={{
                        id: row.employeeId,
                        name: row.employeeName,
                        employeeSn: row.employeeSn,
                        records: row.records,
                      }} 
                    />
                    <AddManualDateButton employeeId={row.employeeId} />
                    {row.latestAssetId && row.attachmentUrl && (
                      <DeleteAttachmentButton assetId={row.latestAssetId} />
                    )}
                    <DeleteSafetyShoesButton employeeId={row.employeeId} />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Search Input Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari nama karyawan atau SN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-sm rounded-lg"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {searchQuery && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Ditemukan: <strong className="text-foreground">{searchedRows.length}</strong> dari {rows.length} karyawan
          </span>
        )}
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="all">
            <Layers className="size-4" />
            Semua Section
            <Badge className="ml-1 rounded-full border-0 bg-muted text-muted-foreground">
              {searchedRows.length}
            </Badge>
          </TabsTrigger>
          {sectionKeys.map((secName) => (
            <TabsTrigger key={secName} value={secName}>
              <Layers className="size-4" />
              {secName}
              <Badge className="ml-1 rounded-full border-0 bg-muted text-muted-foreground">
                {groupedSections[secName]?.length || 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="p-0 border rounded-lg overflow-hidden mt-3">
          {renderTable(searchedRows)}
        </TabsContent>

        {sectionKeys.map((secName) => (
          <TabsContent key={secName} value={secName} className="p-0 border rounded-lg overflow-hidden mt-3">
            {renderTable(groupedSections[secName] || [])}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
