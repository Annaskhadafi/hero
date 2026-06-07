import { Suspense } from "react";
import { db } from "@/db";
import { hcOnlineTestGroups, hcOnlineTestGroupItems, hcOnlineTests } from "@/db/schema/hero";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import ClientPage from "./client-page";

function ClientPageWrapper({ group, items }: { group: any; items: any[] }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ClientPage group={group} items={items} />
    </Suspense>
  );
}

export default async function TestGroupPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const groups = await db.select()
    .from(hcOnlineTestGroups)
    .where(eq(hcOnlineTestGroups.slug, resolvedParams.slug))
    .limit(1);
    
  const group = groups[0];

  if (!group || !group.isActive) {
    notFound();
  }

  const items = await db.select({
    id: hcOnlineTestGroupItems.id,
    sortOrder: hcOnlineTestGroupItems.sortOrder,
    test: hcOnlineTests,
  })
  .from(hcOnlineTestGroupItems)
  .innerJoin(hcOnlineTests, eq(hcOnlineTestGroupItems.testId, hcOnlineTests.id))
  .where(eq(hcOnlineTestGroupItems.groupId, group.id))
  .orderBy(asc(hcOnlineTestGroupItems.sortOrder));

  return <ClientPageWrapper group={group} items={items} />;
}
