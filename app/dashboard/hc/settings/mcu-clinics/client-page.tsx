"use client";

import { useState } from "react";
import { IconPlus, IconTrash, IconSettings, IconBuilding } from "@tabler/icons-react";
import { toast } from "sonner";
import { saveMcuClinic, deleteMcuClinic } from "@/app/actions/hc-mcu-clinics";
import { AdminPageShell } from "@/components/admin-page-shell";
import { HcWorkspaceBanner } from "@/components/hc/hc-workspace-banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Clinic = {
  id: number; name: string; email: string; phone: string;
  address: string; city: string; contactPerson: string;
  paketOptions: string[] | null; isActive: boolean;
  createdAt: Date; updatedAt: Date;
};

type Props = { initialClinics: Clinic[] };

export function McuClinicsClient({ initialClinics }: Props) {
  const [clinics, setClinics] = useState(initialClinics);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Clinic | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", city: "",
    contactPerson: "", paketInput: "", isActive: true,
  });

  const openEdit = (c?: Clinic) => {
    if (c) {
      setEditing(c);
      setForm({
        name: c.name, email: c.email, phone: c.phone,
        address: c.address, city: c.city,
        contactPerson: c.contactPerson,
        paketInput: (c.paketOptions ?? []).join("\n"),
        isActive: c.isActive,
      });
    } else {
      setEditing(null);
      setForm({ name: "", email: "", phone: "", address: "", city: "", contactPerson: "", paketInput: "Paket Executive\nPaket Standar", isActive: true });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      toast.error("Clinic name and email are required");
      return;
    }
    setSaving(true);
    try {
      const paketOptions = form.paketInput.split("\n").map(s => s.trim()).filter(Boolean);
      const saved = await saveMcuClinic(editing?.id ?? null, {
        name: form.name, email: form.email, phone: form.phone,
        address: form.address, city: form.city,
        contactPerson: form.contactPerson,
        paketOptions, isActive: form.isActive,
      });
      if (editing) {
        setClinics(prev => prev.map(c => c.id === editing.id ? { ...c, ...saved } as Clinic : c));
      } else {
        setClinics(prev => [saved as Clinic, ...prev]);
      }
      toast.success(editing ? "Clinic updated" : "Clinic added");
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this clinic?")) return;
    try {
      await deleteMcuClinic(id);
      setClinics(prev => prev.filter(c => c.id !== id));
      toast.success("Clinic deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  return (
    <AdminPageShell eyebrow="HC Settings" title="MCU Clinics" description="Manage medical clinic partners for candidate MCU">
      <div className="space-y-6">
        <HcWorkspaceBanner title="Master Klinik MCU"
          description="Daftar klinik rekanan untuk Medical Check Up. Data ini akan muncul sebagai pilihan saat HR menjadwalkan MCU candidate." />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg"><IconBuilding className="w-5 h-5 inline mr-2" />Clinics</CardTitle>
            <Button onClick={() => openEdit()}><IconPlus className="w-4 h-4 mr-2" /> Add Clinic</Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clinics.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No clinics yet. Add one to get started.</TableCell></TableRow>
                )}
                {clinics.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email}</TableCell>
                    <TableCell>{c.city || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.contactPerson || "-"}</TableCell>
                    <TableCell><Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><IconSettings className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c.id)}><IconTrash className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Edit Clinic" : "Add Clinic"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Klinik Pramita" />
              </div>
              <div className="space-y-2">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@pramita.co.id" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="e.g. Balikpapan" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} placeholder="e.g. Dr. Sari (Admin)" />
            </div>
            <div className="space-y-2">
              <Label>MCU Package Options (one per line)</Label>
              <Textarea value={form.paketInput} onChange={e => setForm({ ...form, paketInput: e.target.value })} rows={3} placeholder="Paket Executive&#10;Paket Standar&#10;Paket Karyawan" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={c => setForm({ ...form, isActive: c })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
