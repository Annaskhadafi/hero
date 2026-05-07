"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  createMasterGoods,
  updateMasterGoods,
  deleteMasterGoods,
  createMasterLocation,
  updateMasterLocation,
  deleteMasterLocation,
  createMasterRecipient,
  updateMasterRecipient,
  deleteMasterRecipient,
  createMasterSite,
  updateMasterSite,
  deleteMasterSite,
  type MasterGoodsRecord,
  type MasterLocationRecord,
  type MasterRecipientRecord,
  type MasterSiteRecord,
} from "@/app/actions/cargo-master";

// === Master Goods Dialog ===
type MasterGoodsDialogProps = {
  mode: "create" | "edit";
  data?: MasterGoodsRecord;
  trigger?: React.ReactNode;
};

export function MasterGoodsDialog({ mode, data, trigger }: MasterGoodsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      goodsName: formData.get("goodsName") as string,
      category: formData.get("category") as string,
      brand: formData.get("brand") as string,
      unit: formData.get("unit") as string,
      weight: formData.get("weight") as string,
      dimensions: formData.get("dimensions") as string,
      hsCode: formData.get("hsCode") as string,
      description: formData.get("description") as string,
      notes: formData.get("notes") as string,
      isActive: true,
    };

    const result = mode === "create" 
      ? await createMasterGoods(payload)
      : await updateMasterGoods(data!.id, payload);

    setLoading(false);

    if (result.status === "success") {
      alert(result.message);
      setOpen(false);
      window.location.reload();
    } else {
      alert(result.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="default" className="h-8 px-2.5 text-xs">
            <Plus className="mr-1 h-3 w-3" />
            Tambah
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Tambah" : "Edit"} Master Data Barang</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Tambahkan" : "Edit"} data barang untuk referensi cargo manifest.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goodsName">Nama Barang *</Label>
                <Input id="goodsName" name="goodsName" defaultValue={data?.goodsName} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Input id="category" name="category" defaultValue={data?.category} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" name="brand" defaultValue={data?.brand} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input id="unit" name="unit" defaultValue={data?.unit || "pcs"} placeholder="pcs" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Berat</Label>
                <Input id="weight" name="weight" defaultValue={data?.weight} placeholder="10 kg" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dimensions">Dimensi</Label>
                <Input id="dimensions" name="dimensions" defaultValue={data?.dimensions} placeholder="100x50x30 cm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hsCode">HS Code</Label>
                <Input id="hsCode" name="hsCode" defaultValue={data?.hsCode} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea id="description" name="description" defaultValue={data?.description} rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea id="notes" name="notes" defaultValue={data?.notes} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// === Master Location Dialog ===
type MasterLocationDialogProps = {
  mode: "create" | "edit";
  data?: MasterLocationRecord;
  trigger?: React.ReactNode;
};

export function MasterLocationDialog({ mode, data, trigger }: MasterLocationDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      locationName: formData.get("locationName") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      province: formData.get("province") as string,
      country: formData.get("country") as string,
      postalCode: formData.get("postalCode") as string,
      contactPerson: formData.get("contactPerson") as string,
      contactPhone: formData.get("contactPhone") as string,
      notes: formData.get("notes") as string,
      isActive: true,
    };

    const result = mode === "create"
      ? await createMasterLocation(payload)
      : await updateMasterLocation(data!.id, payload);

    setLoading(false);

    if (result.status === "success") {
      alert(result.message);
      setOpen(false);
      window.location.reload();
    } else {
      alert(result.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="default" className="h-8 px-2.5 text-xs">
            <Plus className="mr-1 h-3 w-3" />
            Tambah
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Tambah" : "Edit"} Master Data Lokasi</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Tambahkan" : "Edit"} data lokasi tujuan untuk referensi cargo manifest.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="locationName">Nama Lokasi *</Label>
              <Input id="locationName" name="locationName" defaultValue={data?.locationName} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <Textarea id="address" name="address" defaultValue={data?.address} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Kota</Label>
                <Input id="city" name="city" defaultValue={data?.city} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Provinsi</Label>
                <Input id="province" name="province" defaultValue={data?.province} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Negara</Label>
                <Input id="country" name="country" defaultValue={data?.country || "Indonesia"} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Kode Pos</Label>
                <Input id="postalCode" name="postalCode" defaultValue={data?.postalCode} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input id="contactPerson" name="contactPerson" defaultValue={data?.contactPerson} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Phone</Label>
                <Input id="contactPhone" name="contactPhone" defaultValue={data?.contactPhone} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea id="notes" name="notes" defaultValue={data?.notes} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// === Master Recipient Dialog ===
type MasterRecipientDialogProps = {
  mode: "create" | "edit";
  data?: MasterRecipientRecord;
  trigger?: React.ReactNode;
};

export function MasterRecipientDialog({ mode, data, trigger }: MasterRecipientDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      recipientName: formData.get("recipientName") as string,
      companyName: formData.get("companyName") as string,
      contactPerson: formData.get("contactPerson") as string,
      contactPhone: formData.get("contactPhone") as string,
      contactEmail: formData.get("contactEmail") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      province: formData.get("province") as string,
      postalCode: formData.get("postalCode") as string,
      notes: formData.get("notes") as string,
      isActive: true,
    };

    const result = mode === "create"
      ? await createMasterRecipient(payload)
      : await updateMasterRecipient(data!.id, payload);

    setLoading(false);

    if (result.status === "success") {
      alert(result.message);
      setOpen(false);
      window.location.reload();
    } else {
      alert(result.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="default" className="h-8 px-2.5 text-xs">
            <Plus className="mr-1 h-3 w-3" />
            Tambah
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Tambah" : "Edit"} Master Data Penerima</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Tambahkan" : "Edit"} data penerima barang untuk referensi cargo manifest.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipientName">Nama Penerima *</Label>
                <Input id="recipientName" name="recipientName" defaultValue={data?.recipientName} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Perusahaan</Label>
                <Input id="companyName" name="companyName" defaultValue={data?.companyName} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input id="contactPerson" name="contactPerson" defaultValue={data?.contactPerson} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Phone</Label>
                <Input id="contactPhone" name="contactPhone" defaultValue={data?.contactPhone} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email</Label>
                <Input id="contactEmail" name="contactEmail" type="email" defaultValue={data?.contactEmail} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Alamat</Label>
              <Textarea id="address" name="address" defaultValue={data?.address} rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Kota</Label>
                <Input id="city" name="city" defaultValue={data?.city} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Provinsi</Label>
                <Input id="province" name="province" defaultValue={data?.province} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Kode Pos</Label>
                <Input id="postalCode" name="postalCode" defaultValue={data?.postalCode} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea id="notes" name="notes" defaultValue={data?.notes} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// === Row Actions ===
type MasterGoodsRowActionsProps = {
  row: MasterGoodsRecord;
};

export function MasterGoodsRowActions({ row }: MasterGoodsRowActionsProps) {
  const handleDelete = async () => {
    if (!confirm("Yakin hapus barang ini?")) return;
    const result = await deleteMasterGoods(row.id);
    if (result.status === "success") {
      alert(result.message);
      window.location.reload();
    } else {
      alert(result.message);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <MasterGoodsDialog
          mode="edit"
          data={row}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          }
        />
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Hapus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// === Master Site Dialog ===
type MasterSiteDialogProps = {
  mode: "create" | "edit";
  data?: MasterSiteRecord;
  trigger?: React.ReactNode;
};

export function MasterSiteDialog({ mode, data, trigger }: MasterSiteDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      siteName: formData.get("siteName") as string,
      location: formData.get("location") as string,
      notes: formData.get("notes") as string,
      isActive: true,
    };

    const result = mode === "create" 
      ? await createMasterSite(payload)
      : await updateMasterSite(data!.id, payload);

    setLoading(false);

    if (result.status === "success") {
      alert(result.message);
      setOpen(false);
      window.location.reload();
    } else {
      alert(result.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="default" className="h-8 px-2.5 text-xs">
            <Plus className="mr-1 h-3 w-3" />
            Tambah
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Tambah" : "Edit"} Master Data Site</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Tambahkan" : "Edit"} data site untuk referensi cargo manifest.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="siteName">Nama Site *</Label>
              <Input id="siteName" name="siteName" defaultValue={data?.siteName} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Lokasi</Label>
              <Input id="location" name="location" defaultValue={data?.location} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" defaultValue={data?.notes} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type MasterSiteRowActionsProps = {
  row: MasterSiteRecord;
};

export function MasterSiteRowActions({ row }: MasterSiteRowActionsProps) {
  const handleDelete = async () => {
    if (!confirm("Yakin hapus site ini?")) return;
    const result = await deleteMasterSite(row.id);
    if (result.status === "success") {
      alert(result.message);
      window.location.reload();
    } else {
      alert(result.message);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <MasterSiteDialog
          mode="edit"
          data={row}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          }
        />
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Hapus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type MasterLocationRowActionsProps = {
  row: MasterLocationRecord;
};

export function MasterLocationRowActions({ row }: MasterLocationRowActionsProps) {
  const handleDelete = async () => {
    if (!confirm("Yakin hapus lokasi ini?")) return;
    const result = await deleteMasterLocation(row.id);
    if (result.status === "success") {
      alert(result.message);
      window.location.reload();
    } else {
      alert(result.message);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <MasterLocationDialog
          mode="edit"
          data={row}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          }
        />
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Hapus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type MasterRecipientRowActionsProps = {
  row: MasterRecipientRecord;
};

export function MasterRecipientRowActions({ row }: MasterRecipientRowActionsProps) {
  const handleDelete = async () => {
    if (!confirm("Yakin hapus penerima ini?")) return;
    const result = await deleteMasterRecipient(row.id);
    if (result.status === "success") {
      alert(result.message);
      window.location.reload();
    } else {
      alert(result.message);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <MasterRecipientDialog
          mode="edit"
          data={row}
          trigger={
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          }
        />
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Hapus
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
