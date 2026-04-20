import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyActivitySessionDocumentPanel } from "@/components/daily-activity-session-document-panel";
import { getServerSession } from "@/lib/auth-session";
import { getDailyActivitySessionDocumentData } from "@/lib/daily-activity-documents";

export default async function DailyActivityDocumentPage({
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
      <Card className="rounded-[1.5rem]">
        <CardHeader className="gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Document Workspace</Badge>
            <Badge variant="outline">{data.site.name}</Badge>
            <Badge variant="outline">{data.employee.name}</Badge>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl sm:text-3xl">Dokumen SPL Per User</CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-6">
              Lembar kerja harian yang sudah siap jadi PDF customer-facing, lengkap dengan tanda tangan karyawan,
              customer, dan checklist HR.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <DailyActivitySessionDocumentPanel data={data} />

      <Card className="rounded-[1.4rem]">
        <CardHeader>
          <CardTitle className="text-lg">Baris pekerjaan yang akan masuk dokumen</CardTitle>
          <CardDescription>Data diambil dari item checklist yang sudah dicentang pada session harian.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.items.length > 0 ? (
            data.items.map((item, index) => (
              <div
                key={item.id}
                className="rounded-[1rem] bg-surface-container-low px-4 py-3 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">
                      Row {index + 1} • {item.snapshotGroupName || "Checklist"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#082033]">{item.snapshotLabel}</p>
                    <p className="mt-1 text-sm text-[#486275]">{item.workSummary}</p>
                  </div>
                  <div className="text-right text-xs text-[#486275]">
                    <p>
                      {item.startLabel} - {item.endLabel}
                    </p>
                    <p>{item.durationLabel}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1rem] bg-surface-container-low px-4 py-5 text-sm text-muted-foreground">
              Belum ada item checked di session ini, jadi PDF akan kosong.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
