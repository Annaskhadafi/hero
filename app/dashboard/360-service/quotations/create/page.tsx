import { getCustomers, getItems, generateNextQuotationNumber } from "@/app/actions/service360"
import { QuotationForm } from "./quotation-form"
import { db } from "@/db"
import { sites } from "@/db/schema/hero"

export default async function CreateQuotationPage() {
  const customers = await getCustomers()
  const items = await getItems()
  const siteList = await db.select().from(sites)
  const nextQuotationNumber = await generateNextQuotationNumber()

  return (
    <div className="w-full p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Create Quotation</h1>
      </div>
      
      <QuotationForm customers={customers} items={items} siteList={siteList} initialQuotationNumber={nextQuotationNumber} />
    </div>
  )
}
