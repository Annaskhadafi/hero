"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SearchableEmployeeSelect } from "@/components/searchable-employee-select";
import { addManualSafetyShoes } from "./actions";
import { UploadCloud, Loader2 } from "lucide-react";

export function ManualEntryModal({
  employees = [],
}: {
  employees?: { id: number; name: string; employeeSn?: string | null; role?: string | null }[];
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [assignedAt, setAssignedAt] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !assignedAt) return;

    setIsLoading(true);
    try {
      let attachmentUrl = undefined;
      
      if (file) {
        const res = await fetch("/api/uploads/activity-presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            activityId: `safety-shoes-${Date.now()}`,
          }),
        });
        const { uploadUrl, url } = await res.json();
        
        await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });
        attachmentUrl = url;
      }

      await addManualSafetyShoes({
        employeeId,
        assignedAt: new Date(assignedAt),
        size: size || undefined,
        attachmentUrl,
      });
      
      setOpen(false);
      setEmployeeId(null);
      setAssignedAt("");
      setSize("");
      setFile(null);
    } catch (err) {
      console.error("Failed to add data", err);
      alert("Gagal menyimpan data manual");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Tambah Data</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tambah Data Sepatu Safety Manual</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Karyawan</Label>
              <SearchableEmployeeSelect
                employees={employees as any}
                value={employeeId?.toString() || ""}
                onValueChange={(val: string) => setEmployeeId(parseInt(val, 10))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Tanggal Penyerahan</Label>
              <Input 
                type="date" 
                required
                value={assignedAt}
                onChange={(e) => setAssignedAt(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Size (Ukuran)</Label>
              <Input 
                type="text" 
                placeholder="Misal: 42"
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Bukti Penyerahan (Opsional)</Label>
              <div className="flex items-center gap-2">
                <Input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <UploadCloud className="mr-2 h-4 w-4" />
                  {file ? file.name : "Pilih File"}
                </Button>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={!employeeId || !assignedAt || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Data"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
