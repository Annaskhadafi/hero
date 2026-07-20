import { getQuotations } from '@/app/actions/service360'
import { Button } from '@/components/ui/button'
import { calculateQuotationTotal } from '@/lib/service360-quotation-total'
import Link from 'next/link'
import { QuotationsSummaryTable } from './quotations-summary-table'

export default async function QuotationsPage() {
  const quotations = await getQuotations()
  const rows = quotations.map(({ quotation, customer }) => {
    const subTotalBeforeDiscount = Number(quotation.subTotal)
    const { discountedSubTotal, grandTotal } = calculateQuotationTotal(
      subTotalBeforeDiscount,
      Number(quotation.taxRate),
      quotation.discountType,
      Number(quotation.discountValue),
    )

    return {
      id: quotation.id,
      quotationNumber: quotation.quotationNumber,
      quotationDate: quotation.quotationDate,
      customerName: customer?.customerName ?? '',
      poNumber: quotation.poNumber ?? '',
      totalAmount: grandTotal,
      subTotal: discountedSubTotal,
      site: quotation.projectName ?? '',
      period: quotation.poPeriod ?? '',
      status: quotation.status,
      poFileUrl: quotation.poFileUrl ?? '',
    }
  })

  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Quotations</h1>
        <Link href="/dashboard/360-service/quotations/create">
          <Button>Create Quotation</Button>
        </Link>
      </div>

      <QuotationsSummaryTable rows={rows} />
    </div>
  )
}
