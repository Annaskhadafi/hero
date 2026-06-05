import { getContractReviews } from "@/app/actions/contract-review"
import { ContractReviewClientPage } from "./client-page"
import { db } from "@/db"
import { hrEmployees } from "@/db/schema/hero"
import { eq } from "drizzle-orm"

export const metadata = {
  title: "Employee Contract Review - HC",
}

export default async function ContractReviewPage() {
  const reviewsResult = await getContractReviews()
  const reviews = reviewsResult.success ? reviewsResult.data : []
  
  const employees = await db
    .select({
      id: hrEmployees.id,
      name: hrEmployees.fullName,
      employeeId: hrEmployees.employeeId,
      department: hrEmployees.departmentId, // simplify for now
    })
    .from(hrEmployees)
    .where(eq(hrEmployees.isActive, true))

  return (
    <ContractReviewClientPage 
      reviews={reviews as any[]} 
      employees={employees} 
    />
  )
}
