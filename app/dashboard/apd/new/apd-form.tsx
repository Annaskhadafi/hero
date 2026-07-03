"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadFile } from "@/app/actions/upload";
import { submitApdRequest } from "../actions";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const APD_ITEMS = [
  "Sepatu Safety",
  "Helm Safety",
  "Kacamata",
  "Sarung Tangan",
  "Earplug",
  "Baju Reflector",
  "Celana Jeans",
  "APD Khusus Ketinggian",
];

type ApdItemInput = {
  id: string;
  itemType: string;
  requestType: "baru" | "pergantian";
  quantity: number;
  notes: string;
  photoFile: File | null;
  photoUrl?: string;
};

export function ApdRequestForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ApdItemInput[]>([
    { id: crypto.randomUUID(), itemType: APD_ITEMS[0], requestType: "baru", quantity: 1, notes: "", photoFile: null },
  ]);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), itemType: APD_ITEMS[0], requestType: "baru", quantity: 1, notes: "", photoFile: null },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof ApdItemInput, value: any) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (items.length === 0) {
        throw new Error("Pilih minimal 1 item APD");
      }

      let signatureUrl = "";
      if (signatureFile) {
        const sigForm = new FormData();
        sigForm.append("file", signatureFile);
        const sigRes = await uploadFile(sigForm);
        if (sigRes.success) signatureUrl = sigRes.url as string;
      }

      // Upload photos for replacements
      const processedItems = await Promise.all(
        items.map(async (item) => {
          let photoUrl = "";
          if (item.requestType === "pergantian" && item.photoFile) {
            const fd = new FormData();
            fd.append("file", item.photoFile);
            const uploadRes = await uploadFile(fd);
            if (uploadRes.success) {
              photoUrl = uploadRes.url as string;
            } else {
              throw new Error("Gagal mengupload foto bukti pergantian");
            }
          } else if (item.requestType === "pergantian" && !item.photoFile) {
             throw new Error(`Foto bukti pergantian wajib diupload untuk item: ${item.itemType}`);
          }
          return {
            itemType: item.itemType,
            requestType: item.requestType,
            quantity: item.quantity,
            notes: item.notes,
            photoUrl,
          };
        })
      );

      const submitData = new FormData();
      submitData.append("notes", notes);
      submitData.append("signatureUrl", signatureUrl);
      submitData.append("items", JSON.stringify(processedItems));

      const res = await submitApdRequest(submitData);
      if (res.success) {
        toast.success("Permintaan APD berhasil diajukan!");
        router.push("/dashboard/apd");
      }
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Daftar Item APD</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2">
                <Plus className="size-4" /> Tambah Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={item.id} className="relative rounded-lg border bg-card p-4 shadow-sm">
                <div className="absolute right-4 top-4">
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-8 w-8 text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Jenis APD</Label>
                    <Select value={item.itemType} onValueChange={(val) => updateItem(item.id, "itemType", val)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APD_ITEMS.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Jenis Permintaan</Label>
                    <Select value={item.requestType} onValueChange={(val) => updateItem(item.id, "requestType", val)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baru">Baru</SelectItem>
                        <SelectItem value="pergantian">Pergantian</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Jumlah</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={item.quantity} 
                      onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)} 
                    />
                  </div>

                  <div className="space-y-2 lg:col-span-1">
                    <Label>Keterangan/Ukuran</Label>
                    <Input 
                      placeholder="Mis: Ukuran 42" 
                      value={item.notes} 
                      onChange={(e) => updateItem(item.id, "notes", e.target.value)} 
                    />
                  </div>
                </div>

                {item.requestType === "pergantian" && (
                  <div className="mt-4 space-y-2 border-t pt-4">
                    <Label className="text-destructive font-medium">Foto Barang Rusak/Lama (Wajib untuk Pergantian)</Label>
                    <Input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => updateItem(item.id, "photoFile", e.target.files?.[0] || null)} 
                      required
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Catatan Tambahan (Opsional)</Label>
            <Textarea 
              placeholder="Tuliskan catatan tambahan jika ada..." 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              rows={3} 
            />
          </div>

          <div className="space-y-2">
            <Label>Tanda Tangan Digital (Opsional)</Label>
            <p className="text-sm text-muted-foreground">Upload gambar tanda tangan Anda</p>
            <Input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setSignatureFile(e.target.files?.[0] || null)} 
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Kirim Permohonan
        </Button>
      </div>
    </form>
  );
}
