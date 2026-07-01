import { getCustomers, createCustomer, deleteCustomer } from "@/app/actions/service360"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MinimalTableShell } from "@/components/ui/minimal-table-shell"

export default async function CustomersPage() {
  const customers = await getCustomers()

  return (
    <div className="w-full p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Master Data Customer</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Add New Customer</CardTitle>
            <CardDescription>Enter the details for a new customer.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={async (formData) => {
              "use server"
              const customerName = formData.get("customerName") as string
              if (customerName) {
                await createCustomer({ customerName })
              }
            }} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Customer Name</label>
                <Input name="customerName" required placeholder="e.g. PT Maju Bersama" />
              </div>
              <Button type="submit" className="w-full">Save Customer</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Customer List</CardTitle>
          </CardHeader>
          <CardContent>
            <MinimalTableShell label="Customers">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.customerName}</TableCell>
                      <TableCell>{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <form action={async () => {
                          "use server"
                          await deleteCustomer(c.id)
                        }}>
                          <Button variant="destructive" size="sm">Delete</Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                  {customers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No customers found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </MinimalTableShell>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
