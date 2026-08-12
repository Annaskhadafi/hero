"use client";

import { Button } from "@/components/ui/button";
import { X, Trash2, Loader2, CalendarPlus } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deleteSite, deleteSafetyShoesHistory, updateAssetAttachment, addManualSafetyShoes } from "./actions";

export function DeleteSiteButton({ siteName }: { siteName: string }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-4 w-4 ml-1 hover:bg-destructive/20 hover:text-destructive rounded-full"
      disabled={isLoading}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm(`Sembunyikan site ${siteName}?`)) {
          setIsLoading(true);
          try {
            await deleteSite(siteName);
          } finally {
            setIsLoading(false);
          }
        }
      }}
    >
      {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
    </Button>
  );
}

export function DeleteSafetyShoesButton({ employeeId }: { employeeId: number }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-destructive hover:bg-destructive/10"
      disabled={isLoading}
      onClick={async () => {
        if (confirm("Reset data sepatu safety untuk karyawan ini? Namanya akan hilang dari tabel ini.")) {
          setIsLoading(true);
          try {
            await deleteSafetyShoesHistory(employeeId);
          } finally {
            setIsLoading(false);
          }
        }
      }}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </Button>
  );
}

export function DeleteAttachmentButton({ assetId }: { assetId: number }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-orange-500 hover:bg-orange-500/10"
      disabled={isLoading}
      title="Hapus Bukti (Attachment)"
      onClick={async () => {
        if (confirm("Hapus bukti penerimaan ini?")) {
          setIsLoading(true);
          try {
            await updateAssetAttachment(assetId, null);
          } finally {
            setIsLoading(false);
          }
        }
      }}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
    </Button>
  );
}

export function AddManualDateButton({ employeeId }: { employeeId: number }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [assignedAt, setAssignedAt] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-blue-500 hover:bg-blue-500/10"
          title="Tambah Tanggal Manual"
        >
          <CalendarPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!assignedAt) return;
            setIsLoading(true);
            try {
              await addManualSafetyShoes({
                employeeId,
                assignedAt: new Date(assignedAt),
              });
              setOpen(false);
              setAssignedAt("");
            } finally {
              setIsLoading(false);
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>Tambah Tanggal Penerimaan Sepatu</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="date"
              value={assignedAt}
              onChange={(e) => setAssignedAt(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}