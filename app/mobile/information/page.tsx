import { getHistoricalBroadcastsForMobile } from "@/app/actions/broadcast";
import { InformationClient } from "./information-client";
import { getServerSession } from "@/lib/auth-session";
import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function MobileInformationPage() {
  const session = await getServerSession();
  const history = await getHistoricalBroadcastsForMobile();

  let canCreate = false;
  if (session?.user?.email) {
    const [emp] = await db
      .select({ accessRole: employees.accessRole })
      .from(employees)
      .where(eq(employees.email, session.user.email))
      .limit(1);
    const role = emp?.accessRole;
    canCreate = role === "Super Admin" || role === "HC Manager";
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-black text-[#003f78]">Informasi HO</h1>
        <p className="text-xs text-muted-foreground">
          Kumpulan informasi penting, pengumuman, dan broadcast resmi dari Head Office.
        </p>
      </div>

      <InformationClient initialHistory={history} canCreate={canCreate} />
    </div>
  );
}
