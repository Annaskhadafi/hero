"use client";

import { useState } from "react";
import { AdminPageShell } from "@/components/admin-page-shell";
import { HcWorkspaceBanner, hcTableRowClassName } from "@/components/hc/hc-workspace-banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Download } from "lucide-react";

type EngineerData = {
  id: number;
  employeeId: string;
  fullName: string;
  department: string | null;
  section: string | null;
  site: string | null;
  workLocation: string | null;
  position: string | null;
  joinDate: string | null;
  isActive: boolean;
};

export function TechnicalEngineerClientPage({ employees }: { employees: EngineerData[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLocation, setFilterLocation] = useState("ALL");

  const filteredData = employees.filter((emp) => {
    const matchesSearch = emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
                          
    if (!matchesSearch) return false;
    
    if (filterLocation !== "ALL") {
      const loc = (emp.workLocation || emp.site || "").toLowerCase();
      if (filterLocation === "ONSITE" && (loc.includes("ho") || loc.includes("head office"))) return false;
      if (filterLocation === "HO" && !loc.includes("ho") && !loc.includes("head office")) return false;
    }
    
    return true;
  });

  return (
    <AdminPageShell
      eyebrow="HC • Technical Engineer"
      title="Data Technical Engineer"
      description="Daftar khusus untuk memantau data karyawan departemen Repair/Maintenance."
    >
      <HcWorkspaceBanner
        title="Technical Engineer Roster"
        description="Roster teknisi Repair/Maintenance dibuat fokus: pencarian cepat, lokasi kerja, dan status aktif dalam satu tampilan ringan."
        items={[
          { label: "Total", value: employees.length, tone: "slate" },
          { label: "On-site", value: employees.filter((employee) => (employee.workLocation || employee.site || "").toLowerCase().includes("site")).length, tone: "emerald" },
          { label: "HO", value: employees.filter((employee) => (employee.workLocation || employee.site || "").toLowerCase().includes("ho")).length, tone: "sky" },
        ]}
      />

      <div className="mb-4 flex flex-col justify-between gap-4 rounded-[1.1rem] bg-white p-3 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10)] sm:flex-row">
        <div className="flex gap-4 items-center flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari nama atau NIK..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <select 
            className="flex h-10 w-full sm:w-48 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            value={filterLocation} 
            onChange={(e) => setFilterLocation(e.target.value)}
          >
            <option value="ALL">Semua Lokasi</option>
            <option value="ONSITE">On-Site</option>
            <option value="HO">Head Office (HO)</option>
          </select>
        </div>
        <Button variant="outline">
          <Download className="size-4 mr-2" />
          Export Data
        </Button>
      </div>

      <div className="grid gap-4">
        {filteredData.length === 0 ? (
          <div className="flex flex-col h-40 items-center justify-center rounded-xl border border-dashed text-muted-foreground">
            <MapPin className="size-8 mb-2 opacity-20" />
            <p>Tidak ada data Technical Engineer yang ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border bg-card">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Karyawan</th>
                  <th className="px-4 py-3 font-medium">Departemen / Section</th>
                  <th className="px-4 py-3 font-medium">Posisi / Level</th>
                  <th className="px-4 py-3 font-medium text-center">Lokasi Kerja</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredData.map((emp) => (
                  <tr key={emp.id} className={hcTableRowClassName}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{emp.fullName}</div>
                      <div className="text-xs text-muted-foreground font-mono">{emp.employeeId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{emp.department || '-'}</div>
                      <div className="text-xs text-muted-foreground">{emp.section || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {emp.position || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {emp.workLocation || emp.site || 'TBA'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {emp.isActive ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary">Inaktif</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPageShell>
  );
}
