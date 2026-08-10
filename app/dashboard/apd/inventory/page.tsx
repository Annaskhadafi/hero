import { AdminPageShell } from "@/components/admin-page-shell";
import { ApdInventoryTable } from "@/components/apd-inventory-table";
import { fetchApdInventory } from "@/lib/apd-inventory-data";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export default async function ApdInventoryPage() {
  const currentEmployee = await getCurrentEmployee();
  
  if (!currentEmployee || !["admin", "superadmin"].includes(currentEmployee.role)) {
    redirect("/dashboard");
  }

  const rows = await fetchApdInventory();

  return (
    <AdminPageShell
      eyebrow="HSE • Alat Pelindung Diri"
      title="Inventory APD & Tools"
      description="Daftar aset dan APD yang sedang atau pernah dipinjamkan ke karyawan."
      actions={
        <div className="flex gap-2">
          <Link href="/dashboard/apd">
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" /> KEMBALI
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
