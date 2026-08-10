"use client";

import { Button } from "@/components/ui/button";
import { X, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { deleteSite, deleteSafetyShoesHistory } from "./actions";

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
