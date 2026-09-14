import { AdminPageShell } from "@/components/admin-page-shell";
import { ApdInventoryTable } from "@/components/apd-inventory-table";
import { fetchApdInventory } from "@/lib/apd-inventory-data";
import { getCurrentMenuPermission } from "@/lib/hero-access";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, FileText, Wrench } from "lucide-react";

export default async function ApdInventoryPage() {
  const currentEmployee = await getCurrentEmployee();
  const inventoryPermission = await getCurrentMenuPermission('hse_inventaris');
  
  const canManageLegacy = currentEmployee && ["admin", "superadmin"].includes(currentEmployee.role);
  
  if (!canManageLegacy && !inventoryPermission.canView) {
    redirect("/dashboard");
  }

  const rows = await fetchApdInventory();

  return (
    <AdminPageShell
      eyebrow="HSE • Alat Pelindung Diri"
      title="Inventory APD & Tools"
      description="Daftar aset dan APD yang sedang atau pernah dipinjamkan ke karyawan."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/apd">
            <Button variant="outline">
              <ChevronLeft className="mr-1.5 h-4 w-4" /> KEMBALI
            </Button>
          </Link>
          <Link href="/dashboard/apd/reports/apd">
            <Button variant="outline" className="border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
              <FileText className="mr-1.5 h-4 w-4 text-emerald-600" /> Laporan Bulanan APD
            </Button>
          </Link>
          <Link href="/dashboard/apd/reports/material-tools">
            <Button variant="outline" className="border-blue-600/30 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40">
              <Wrench className="mr-1.5 h-4 w-4 text-blue-600" /> Laporan Bulanan Material &amp; Tools
            </Button>
          </Link>
          <Link href="/dashboard/apd/inventory/safety-shoes">
            <Button variant="default">Matrix Sepatu Safety</Button>
          </Link>
        </div>
      }
    >
      <ApdInventoryTable data={rows} />
    </AdminPageShell>
  );
}
