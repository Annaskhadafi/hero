import { redirect } from "next/navigation"
import { db } from "@/db"
import { employees } from "@/db/schema/hero"
import { eq } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-session"
import { getBroadcastCategories } from "@/app/actions/broadcast"
import { BroadcastCreateForm } from "./broadcast-create-form"

export const dynamic = "force-dynamic"

export default async function MobileBroadcastCreatePage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect("/sign-in")

  const [emp] = await db
    .select({ accessRole: employees.accessRole })
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1)

  const role = emp?.accessRole
  const canCreate = role === "Super Admin" || role === "HC Manager"

  if (!canCreate) redirect("/mobile/information")

  const categories = await getBroadcastCategories()

  return (
    <div className="space-y-5 pb-12">
      <BroadcastCreateForm categories={categories} />
    </div>
  )
}
