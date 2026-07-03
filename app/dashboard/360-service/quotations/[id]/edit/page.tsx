import { getCustomers, getItems, getQuotationById } from "@/app/actions/service360"
import { QuotationForm } from "../../create/quotation-form"
import { db } from "@/db"
import { sites } from "@/db/schema/hero"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { getS3ObjectReadUrl } from "@/lib/s3-storage"

export const dynamic = "force-dynamic"

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = parseInt(resolvedParams.id)
  if (isNaN(id)) return notFound()

  const quotation = await getQuotationById(id)
  if (!quotation) return notFound()

  const customers = await getCustomers()
  const items = await getItems()
  const siteList = await db.select().from(sites)

  const initialSignatureReadableUrl = quotation.fromSignatureUrl ? await getS3ObjectReadUrl(quotation.fromSignatureUrl) : null;

  return (
    <div className="w-full p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/360-service/quotations">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Edit Quotation {quotation.quotationNumber}</h1>
        </div>
      </div>
      
      <QuotationForm 
        customers={customers} 
        items={items} 
        siteList={siteList} 
        initialQuotationNumber={quotation.quotationNumber}
        initialData={quotation}
        initialSignatureReadableUrl={initialSignatureReadableUrl}
        isEdit={true}
      />
    </div>
  )
}
