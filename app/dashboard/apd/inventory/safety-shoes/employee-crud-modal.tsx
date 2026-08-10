"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Pencil } from "lucide-react";
import { addEmployeeFast, updateEmployeeFast } from "./actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function EmployeeCrudModal({
  employee,
  sites,
}: {
  employee?: { id: number; name: string; employeeSn: string; siteName: string };
  sites: { id: number; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Default values
  const defaultSite = employee
    ? sites.find((s) => s.name === employee.siteName)?.id?.toString()
    : sites[0]?.id?.toString();

  const [name, setName] = useState(employee?.name || "");
  const [employeeSn, setEmployeeSn] = useState(employee?.employeeSn || "");
  const [siteId, setSiteId] = useState<string>(defaultSite || "");

  const isEdit = !!employee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !employeeSn || !siteId) return;

    setIsLoading(true);
    try {
      if (isEdit && employee) {
        await updateEmployeeFast(employee.id, {
          name,
          employeeSn,
          siteId: parseInt(siteId, 10),
        });
      } else {
        await addEmployeeFast({
          name,
          employeeSn,
          siteId: parseInt(siteId, 10),
        });
      }
      setOpen(false);
      
      // Reset form if it's add
      if (!isEdit) {
        setName("");
        setEmployeeSn("");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Tambah Karyawan Baru
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Karyawan" : "Tambah Karyawan Baru (Central Service)"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama"
              />
            </div>
            
            <div className="space-y-2">
              <Label>SN Karyawan</Label>
              <Input
                type="text"
                required
                value={employeeSn}
                onChange={(e) => setEmployeeSn(e.target.value)}
                placeholder="Misal: SN12345"
              />
            </div>

            <div className="space-y-2">
              <Label>Site / Lokasi</Label>
              <Select value={siteId} onValueChange={setSiteId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id.toString()}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
