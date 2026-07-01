import { getQuotations, deleteQuotation } from "@/app/actions/service360"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MinimalTableShell } from "@/components/ui/minimal-table-shell"
import Link from "next/link"
import { Eye, Download, Trash2 } from "lucide-react"

export default async function QuotationsPage() {
  const quotations = await getQuotations()

  return (
    <div className="w-full p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Quotations</h1>
        <Link href="/dashboard/360-service/quotations/create">
          <Button>Create Quotation</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quotation List</CardTitle>
        </CardHeader>
        <CardContent>
          <MinimalTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map(({ quotation, customer }) => (
                  <TableRow key={quotation.id}>
                    <TableCell className="font-medium">{quotation.quotationNumber}</TableCell>
                    <TableCell>{new Date(quotation.quotationDate).toLocaleDateString()}</TableCell>
                    <TableCell>{customer?.customerName}</TableCell>
                    <TableCell>{Number(quotation.totalAmount).toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</TableCell>
                    <TableCell>{quotation.status}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/dashboard/360-service/quotations/${quotation.id}`}>
                          <Button variant="secondary" size="icon" className="h-8 w-8" title="Preview">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/dashboard/360-service/quotations/${quotation.id}?download=true`}>
                          <Button variant="outline" size="icon" className="h-8 w-8" title="Download PDF">
                            <Download className="h-4 w-4 text-teal-600" />
                          </Button>
                        </Link>
                        <form action={async () => {
                          "use server"
                          await deleteQuotation(quotation.id)
                        }}>
                          <Button variant="destructive" size="icon" className="h-8 w-8" title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {quotations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No quotations found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </MinimalTableShell>
        </CardContent>
      </Card>
    </div>
  )
}
