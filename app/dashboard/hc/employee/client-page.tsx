"use client";

import { useState } from "react";
import { AdminPageShell } from "@/components/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, CalendarClock, Download } from "lucide-react";
import { updateEmployeeContract } from "@/app/actions/employee";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Employee = {
  id: number;
  employeeId: string;
  fullName: string;
  joinDate: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  accountStatus: string;
};

export function EmployeeClientPage({ employees: initialData }: { employees: Employee[] }) {
  const [data, setData] = useState<Employee[]>(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [joinDate, setJoinDate] = useState("");
  const [contractStart, setContractStart] = useState("");
  const [contractEnd, setContractEnd] = useState("");
  
  // Filter state
  const [filterType, setFilterType] = useState("ALL");

  const handleOpenEdit = (item: Employee) => {
    setEditingItem(item);
    setJoinDate(item.joinDate || "");
    setContractStart(item.contractStart || "");
    setContractEnd(item.contractEnd || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    setIsLoading(true);
    try {
      const payload = {
        joinDate: joinDate || null,
        contractStart: contractStart || null,
        contractEnd: contractEnd || null,
      };

      const updated = await updateEmployeeContract(editingItem.id, payload);
      setData(data.map(d => d.id === editingItem.id ? {
        ...d,
        joinDate: updated.joinDate ? updated.joinDate.toString() : null,
        contractStart: updated.contractStart ? updated.contractStart.toString() : null,
        contractEnd: updated.contractEnd ? updated.contractEnd.toString() : null,
      } : d));
      
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  };

  const getContractStatus = (endStr: string | null) => {
    if (!endStr) return null;
    
    const today = new Date();
    const end = new Date(endStr);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { label: "Kontrak Habis", color: "text-red-600", bg: "bg-red-100" };
    if (diffDays <= 30) return { label: "Habis < 30 Hari", color: "text-amber-600", bg: "bg-amber-100" };
    return { label: "Aktif", color: "text-emerald-600", bg: "bg-emerald-100" };
  };

  const filteredData = data.filter(emp => {
    if (filterType === "ALL") return true;
    if (filterType === "NO_CONTRACT") return !emp.contractEnd;
    
    const status = getContractStatus(emp.contractEnd);
    if (!status) return false;
    
    if (filterType === "EXPIRED" && status.label === "Kontrak Habis") return true;
    if (filterType === "EXPIRING" && status.label === "Habis < 30 Hari") return true;
    return false;
  });

  return (
    <AdminPageShell
      eyebrow="HC • Employee Data"
      title="Data Karyawan & Kontrak"
      description="Kelola tanggal bergabung dan masa kontrak karyawan untuk manajemen PKWT/PKWTT."
    >
      <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
        <div className="flex gap-2 items-center">
          <Label className="whitespace-nowrap mr-2">Filter Kontrak:</Label>
          <select 
            className="flex h-10 w-full sm:w-48 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">Semua Karyawan</option>
            <option value="EXPIRING">Habis {"<"} 30 Hari</option>
            <option value="EXPIRED">Kontrak Habis</option>
            <option value="NO_CONTRACT">Belum Diatur</option>
          </select>
        </div>
        <Button variant="outline">
          <Download className="size-4 mr-2" />
          Export Data
        </Button>
      </div>

      <div className="grid gap-4">
        {filteredData.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed text-muted-foreground">
            Tidak ada data karyawan yang sesuai filter.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border bg-card">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">ID / NIK</th>
                  <th className="px-4 py-3 font-medium">Nama Lengkap</th>
                  <th className="px-4 py-3 font-medium">Join Date</th>
                  <th className="px-4 py-3 font-medium">Masa Kontrak</th>
                  <th className="px-4 py-3 font-medium text-center">Status Kontrak</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredData.map((emp) => {
                  const status = getContractStatus(emp.contractEnd);
                  
                  return (
                    <tr key={emp.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-mono">{emp.employeeId}</td>
                      <td className="px-4 py-3 font-medium">{emp.fullName}</td>
                      <td className="px-4 py-3">
                        {emp.joinDate ? new Date(emp.joinDate).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {emp.contractStart && emp.contractEnd ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span>{new Date(emp.contractStart).toLocaleDateString('id-ID')}</span>
                            <span>→</span>
                            <span className="font-semibold">{new Date(emp.contractEnd).toLocaleDateString('id-ID')}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Belum diset</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {status ? (
                          <Badge variant="outline" className={status.color + " " + status.bg + " border-transparent"}>
                            {status.label}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Kosong</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(emp)}>
                          <Pencil className="size-4 mr-2" /> Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Data Kontrak</DialogTitle>
          </DialogHeader>
          <div className="py-2 pb-4">
            <h3 className="font-semibold">{editingItem?.fullName}</h3>
            <p className="text-sm text-muted-foreground">NIK: {editingItem?.employeeId}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Join Date (Tanggal Bergabung)</Label>
              <Input 
                type="date" 
                value={joinDate ? new Date(joinDate).toISOString().split('T')[0] : ''} 
                onChange={(e) => setJoinDate(e.target.value)} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label>Mulai Kontrak</Label>
                <Input 
                  type="date" 
                  value={contractStart ? new Date(contractStart).toISOString().split('T')[0] : ''} 
                  onChange={(e) => setContractStart(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Berakhir Kontrak</Label>
                <Input 
                  type="date" 
                  value={contractEnd ? new Date(contractEnd).toISOString().split('T')[0] : ''} 
                  onChange={(e) => setContractEnd(e.target.value)} 
                />
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
