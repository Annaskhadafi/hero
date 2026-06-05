import { db } from "@/db";
import { hcOnlineTests } from "@/db/schema/hero";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PublicTestRegistrationClient } from "./client-page";

export default async function PublicTestRegistrationPage({ params }: { params: Promise<{ testId: string }> }) {
  const resolvedParams = await params;
  const testId = parseInt(resolvedParams.testId);
  
  if (isNaN(testId)) return notFound();

  const [test] = await db.select().from(hcOnlineTests).where(eq(hcOnlineTests.id, testId)).limit(1);

  if (!test) return notFound();
  if (!test.isActive) {
    return (
      <div className="min-h-screen bg-muted/20 py-12 px-4 flex flex-col items-center justify-center">
        <div className="bg-background border shadow-sm rounded-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Test Unavailable</h1>
          <p className="text-muted-foreground">This test is no longer active or has been closed by the administrator.</p>
        </div>
      </div>
    );
  }

  return <PublicTestRegistrationClient test={test} />;
}
