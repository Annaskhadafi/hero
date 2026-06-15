"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function GroupLabelStyleManager({ color }: { color: string }) {
  const router = useRouter();
  const [currentColor, setCurrentColor] = useState(color);
  const [isPending, setIsPending] = useState(false);

  const save = useCallback(async () => {
    setIsPending(true);
    try {
      const res = await fetch("/api/menu/group-label-color", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: currentColor }),
      });

      if (res.ok) {
        toast.success("Warna group label berhasil diupdate");
        router.refresh();
      } else {
        toast.error("Gagal update warna");
      }
    } finally {
      setIsPending(false);
    }
  }, [currentColor, router]);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Warna Group Label</CardTitle>
        <CardDescription>
          Atur warna teks untuk semua sub-group di sidebar (contoh: "HR Operational", "Training Center", "Safety Management", dll).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Label className="text-sm">Warna Teks</Label>
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="w-10 h-10 cursor-pointer rounded-lg border"
          />
          <span className="text-sm text-muted-foreground font-mono">{currentColor}</span>
          <Button
            size="sm"
            onClick={save}
            disabled={isPending || currentColor === color}
            className="rounded-full"
          >
            {isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
