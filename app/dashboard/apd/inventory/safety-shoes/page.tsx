import React from "react";
import { fetchSafetyShoesMatrix } from "@/lib/apd-inventory-data";
import { format } from "date-fns";
import { SizeInputCell, AttachmentCell } from "./safety-shoes-cell-actions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ManualEntryModal } from "./manual-entry-modal";
import { EmployeeCrudModal } from "./employee-crud-modal";
import { DeleteSiteButton, DeleteSafetyShoesButton } from "./safety-shoes-client-buttons";
import { db } from "@/db";
import { sites, employees } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

export const metadata = {
  title: "Inventory Sepatu Safety | Hero",
};

export default async function SafetyShoesInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const { rows, years } = await fetchSafetyShoesMatrix();
  const allSites = await db.select({ id: sites.id, name: sites.name }).from(sites).where(eq(sites.isActive, true));
  const allEmployees = await db.select({
    id: employees.id,
    name: employees.name,
    employeeSn: employees.employeeSn,
    role: employees.role,
  }).from(employees);
  
  // Create a unique list of site names, prioritizing the ones from the DB.
  // Create a unique list of site names, prioritizing the ones from the DB.
  const uniqueSites = Array.from(new Set(allSites.map((s) => s.name))).sort();
  
  const selectedSite = resolvedSearchParams.site || uniqueSites[0] || "";

  // Filter rows by selected site
  const filteredRows = selectedSite 
    ? rows.filter(r => r.siteName === selectedSite)
    : rows;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/apd/inventory">
            <Button variant="ghost" size="sm" className="h-8">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Inventory Sepatu Safety
            </h1>
            <p className="text-muted-foreground">
              Matriks riwayat pengambilan sepatu safety karyawan per tahun.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <EmployeeCrudModal sites={allSites} />
          <ManualEntryModal employees={allEmployees} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-4 border-b border-border p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold leading-none tracking-tight">Data Inventory Khusus</h3>
              <span className="surface-chip inline-flex h-8 w-fit items-center rounded-full px-3 text-xs font-semibold text-muted-foreground">
                {filteredRows.length} karyawan
              </span>
            </div>
          </div>
          
          {/* Site Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {uniqueSites.map((siteName) => (
              <Link key={siteName} href={`?site=${encodeURIComponent(siteName)}`}>
                <Button 
                  variant={selectedSite === siteName ? "default" : "outline"} 
                  size="sm"
                  className="rounded-full"
                >
                  {siteName}
                </Button>
              </Link>
            ))}
          </div>
        </div>
        
        <div className="p-0">
          <div className="w-full overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="h-10 px-4 text-left font-medium">NO</th>
                  <th className="h-10 px-4 text-left font-medium">Nama</th>
                  <th className="h-10 px-4 text-left font-medium">SN</th>
                  <th className="h-10 px-4 text-left font-medium">Site</th>
                  <th className="h-10 px-4 text-left font-medium">Dept</th>
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
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8 + (years.length * 2)} className="p-8 text-center text-muted-foreground">
                      Belum ada data pengambilan sepatu safety di site ini.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, index) => (
                    <tr key={row.employeeId} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4 align-middle">{index + 1}</td>
                      <td className="p-4 align-middle font-medium">{row.employeeName}</td>
                      <td className="p-4 align-middle">{row.employeeSn}</td>
                      <td className="p-4 align-middle">{row.siteName}</td>
                      <td className="p-4 align-middle text-muted-foreground">{row.departmentName}</td>
                      <td className="p-4 align-middle">
                        {row.latestAssetId ? (
                          <SizeInputCell assetId={row.latestAssetId} initialSize={row.size || ""} />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-4 align-middle">
                        {row.latestAssetId ? (
                          <AttachmentCell assetId={row.latestAssetId} initialUrl={row.attachmentUrl} />
                        ) : (
                          "-"
                        )}
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
                          <EmployeeCrudModal 
                            sites={allSites} 
                            employee={{
                              id: row.employeeId,
                              name: row.employeeName,
                              employeeSn: row.employeeSn,
                              siteName: row.siteName
                            }} 
                          />
                          <DeleteSafetyShoesButton employeeId={row.employeeId} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
