import React from "react";
import { fetchSafetyShoesMatrix } from "@/lib/apd-inventory-data";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ManualEntryModal } from "./manual-entry-modal";
import { EmployeeCrudModal } from "./employee-crud-modal";
import { SafetyShoesTableClient } from "./safety-shoes-table-client";
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
  }).from(employees).where(eq(employees.isActive, true));
  
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
              Matriks riwayat pengambilan sepatu safety Central Service per section & site.
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
              <h3 className="font-semibold leading-none tracking-tight">Data Inventory Khusus (Central Service)</h3>
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
        
        <div className="p-4 sm:p-5">
          <SafetyShoesTableClient
            rows={filteredRows}
            years={years}
            allSites={allSites}
          />
        </div>
      </div>
    </div>
  );
}
