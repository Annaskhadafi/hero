import { getCustomersAction } from "@/app/actions/customer-management"
import { CustomerManagementWorkspace } from "@/components/customer-management-workspace"

export const metadata = {
  title: "Customer Management | HERO",
  description: "Manage your customer database, contact information, and shipping addresses.",
}

export default async function CustomersPage() {
  const result = await getCustomersAction()

  return (
    <CustomerManagementWorkspace
      initialCustomers={result.data || []}
      initialStats={result.stats || { totalCustomers: 0, newThisMonth: 0 }}
      categories={result.categories || []}
    />
  )
}
