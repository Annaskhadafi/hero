import { getCustomersAction } from "@/app/actions/customer-management"
import { CustomerManagementWorkspace } from "@/components/customer-management-workspace"
import { getCurrentMenuPermission } from "@/lib/hero-access"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Customer Management | HERO",
  description: "Manage your customer database, contact information, and shipping addresses.",
}

export default async function CustomersPage() {
  const permission = await getCurrentMenuPermission('customers')
  if (!permission.canView) redirect('/dashboard')

  const result = await getCustomersAction()

  return (
    <CustomerManagementWorkspace
      initialCustomers={result.data || []}
      initialStats={result.stats || { totalCustomers: 0, newThisMonth: 0 }}
      categories={result.categories || []}
    />
  )
}
