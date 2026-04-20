import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DailyActivitySessionDocumentPanel } from "@/components/daily-activity-session-document-panel";
import { Badge } from "@/components/ui/badge";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivitySessionDocumentData } from "@/lib/daily-activity-documents";

export default async function MobileActivityDocumentPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const { sessionId } = await params;
  const data = await getDailyActivitySessionDocumentData(Number(sessionId), session.user.email);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <Link
          prefetch={false}
          href="/mobile/activity"
          className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#486275]"
        >
          <ArrowLeft className="size-4" />
          Back to activity
        </Link>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">User Document</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">Dokumen SPL User</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className="border-0 bg-[#eaf4fb] text-[9px] font-black uppercase tracking-[0.14em] text-[#003f78]">
              {data.sessionCode}
            </Badge>
            <Badge className="border-0 bg-[#fff1cf] text-[9px] font-black uppercase tracking-[0.14em] text-[#8a5a00]">
              {data.employee.name}
            </Badge>
          </div>
        </div>
      </section>

      <DailyActivitySessionDocumentPanel data={data} compact />
    </div>
  );
}
