"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { importPointEventsAction } from "@/app/dashboard/admin-actions";
import { AdminImportDialog } from "@/components/admin/admin-import-dialog";
import { Button } from "@/components/ui/button";

export function PointEventImportButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <AdminImportDialog
      title="Import point events"
      description="Upload CSV/XLSX event poin. Mapping minimal: Employee, Category, Label, Points. Date opsional."
      fields={[
        { key: "employee", label: "Employee", required: true },
        { key: "category", label: "Category", required: true },
        { key: "label", label: "Label", required: true },
        { key: "points", label: "Points", required: true },
        { key: "date", label: "Date" },
      ]}
      trigger={
        <Button type="button" variant="outline" size="dense" disabled={isPending}>
          Import
        </Button>
      }
      onConfirm={(payload) => {
        startTransition(async () => {
          const result = await importPointEventsAction(payload);
          if (result.status === "success") {
            toast.success(result.message);
            return;
          }

          toast.error(result.message);
        });
      }}
    />
  );
}
