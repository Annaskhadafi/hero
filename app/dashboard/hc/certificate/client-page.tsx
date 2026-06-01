"use client";

import { useState } from "react";
import { AdminPageShell } from "@/components/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { createCertificate, deleteCertificate, updateCertificate } from "@/app/actions/certificate";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Certificate = {
  id: number;
  employeeId: number | null;
  employeeName: string;
  certificateType: string;
  licenseNumber: string;
  issuedDate: Date;
  expiryDate: Date;
  status: string;
};

type EmployeeOption = {
  id: number;
  name: string;
};

export function CertificateClientPage({ 
  certificates: initialData, 
  employees 
}: { 
  certificates: Certificate[],
  employees: EmployeeOption[]
}) {
  const [data, setData] = useState<Certificate[]>(initialData);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Certificate | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [employeeId, setEmployeeId] = useState("");
  const [certificateType, setCertificateType] = useState("SIO");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [status, setStatus] = useState("Active");

  const resetForm = () => {
    setEmployeeId("");
    setCertificateType("SIO");
    setLicenseNumber("");
    setIssuedDate("");
    setExpiryDate("");
    setStatus("Active");
    setEditingItem(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Certificate) => {
    setEditingItem(item);
    setEmployeeId(item.employeeId ? item.employeeId.toString() : "");
    setCertificateType(item.certificateType);
    setLicenseNumber(item.licenseNumber);
    setIssuedDate(new Date(item.issuedDate).toISOString().split('T')[0]);
    setExpiryDate(new Date(item.expiryDate).toISOString().split('T')[0]);
    setStatus(item.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const selectedEmp = employees.find(emp => emp.id.toString() === employeeId);
      const payload = {
        employeeId,
        employeeName: selectedEmp?.name || "Unknown",
        certificateType,
        licenseNumber,
        issuedDate,
        expiryDate,
        status,
      };

      if (editingItem) {
        const updated = await updateCertificate(editingItem.id, payload);
        setData(data.map(d => d.id === editingItem.id ? updated : d));
      } else {
        const created = await createCertificate(payload);
        setData([...data, created].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()));
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus data sertifikat ini?")) {
      await deleteCertificate(id);
      setData(data.filter((r) => r.id !== id));
    }
  };

  const getExpiryStatus = (date: Date) => {
    const today = new Date();
    const expiry = new Date(date);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return { label: "Expired", color: "text-red-600", bg: "bg-red-100", icon: AlertTriangle };
    if (diffDays <= 60) return { label: "Expiring soon (" + diffDays + " days)", color: "text-amber-600", bg: "bg-amber-100", icon: AlertTriangle };
    return { label: "Valid", color: "text-emerald-600", bg: "bg-emerald-100", icon: CheckCircle2 };
  };

  return (
    <AdminPageShell
      eyebrow="HC • Certificates"
      title="Sertifikat SIO & POP"
      description="Kelola dan pantau masa berlaku lisensi operasional karyawan (SIO/POP)."
    >
      <div className="flex justify-end mb-4">
        <Button onClick={handleOpenAdd}>
          <Plus className="size-4 mr-2" />
          Tambah Sertifikat
        </Button>
      </div>

      <div className="grid gap-4">
        {data.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-xl border border-dashed text-muted-foreground">
            Belum ada data sertifikat.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.map((cert) => {
              const expStatus = getExpiryStatus(cert.expiryDate);
              const Icon = expStatus.icon;
              return (
                <Card key={cert.id} className="relative overflow-hidden">
                  <div className={"absolute top-0 left-0 w-1 h-full " + expStatus.bg.replace('bg-', 'bg-').replace('100', '500')} />
                  <CardContent className="p-5 pl-6 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge variant="secondary" className="mb-2">{cert.certificateType}</Badge>
                        <h3 className="font-semibold">{cert.employeeName}</h3>
                        <p className="text-sm text-muted-foreground font-mono mt-1">{cert.licenseNumber}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleOpenEdit(cert)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(cert.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Masa Berlaku</span>
                        <span className="font-medium">{new Date(cert.expiryDate).toLocaleDateString('id-ID')}</span>
                      </div>
                      <div className={"flex items-center gap-1.5 " + expStatus.color + " font-medium"}>
                        <Icon className="size-4" />
                        <span>{expStatus.label}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Ubah Sertifikat" : "Tambah Sertifikat Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Karyawan</Label>
              <select 
                required
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={employeeId} 
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <option value="">-- Pilih Karyawan --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jenis Sertifikat</Label>
                <select 
                  required
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={certificateType} 
                  onChange={(e) => setCertificateType(e.target.value)}
                >
                  <option value="SIO">SIO</option>
                  <option value="POP">POP</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Nomor Lisensi</Label>
                <Input 
                  required 
                  value={licenseNumber} 
                  onChange={(e) => setLicenseNumber(e.target.value)} 
                  placeholder="Contoh: SIO-12345" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal Terbit</Label>
                <Input 
                  required 
                  type="date" 
                  value={issuedDate} 
                  onChange={(e) => setIssuedDate(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Masa Berlaku (Expiry)</Label>
                <Input 
                  required 
                  type="date" 
                  value={expiryDate} 
                  onChange={(e) => setExpiryDate(e.target.value)} 
                />
              </div>
            </div>
            
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Menyimpan..." : "Simpan Data"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
