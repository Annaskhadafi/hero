import { redirect } from "next/navigation";
import { Clock3, ClipboardList, Users2 } from "lucide-react";

import { manageOvertimeCommandLetterAction } from "@/app/dashboard/activity-hub/actions";
import { OvertimeCommandLetterComposer } from "@/components/overtime-command-letter-composer";
import { Badge } from "@/components/ui/badge";
import { getServerSession } from "@/lib/auth-session";
import { getOvertimeRequestWorkspaceData } from "@/lib/overtime-request-data";

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase();

  if (["draft", "submitted"].includes(normalized)) {
    return "border-0 bg-[#fff1cf] text-[#8a5a00]";
  }

  if (["approved", "closed"].includes(normalized)) {
    return "border-0 bg-[#dff4e8] text-[#14532d]";
  }

  return "border-0 bg-[#eaf4fb] text-[#003f78]";
}

export default async function MobileOvertimePage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const data = await getOvertimeRequestWorkspaceData(session.user.email);
  if (!data) {
    return null;
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Leader Workspace</p>
        <h1 className="text-2xl font-black tracking-tight text-[#003461]">Pengajuan Lembur</h1>
        <p className="text-sm font-semibold leading-6 text-[#486275]">
          Pilih bawahan, assign checklist library, lalu simpan SPL dari mobile.
        </p>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_30px_rgba(8,32,51,0.08)]">
          <Users2 className="size-5 text-[#003f78]" />
          <p className="mt-3 text-2xl font-black text-[#082033]">{data.team.length}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">Bawahan</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_30px_rgba(8,32,51,0.08)]">
          <ClipboardList className="size-5 text-[#003f78]" />
          <p className="mt-3 text-2xl font-black text-[#082033]">{data.splDocuments.length}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">SPL</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_30px_rgba(8,32,51,0.08)]">
          <Clock3 className="size-5 text-[#5a2200]" />
          <p className="mt-3 text-2xl font-black text-[#082033]">{data.metrics.totalAssignedLines}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">Checklist</p>
        </div>
      </section>

      <section className="rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Akses Leader</p>
            <p className="mt-1 text-sm font-black text-[#082033]">{data.lead.name}</p>
          </div>
          <Badge className={data.canCreateRequests ? "border-0 bg-[#dff4e8] text-[#14532d]" : "border-0 bg-[#fff1cf] text-[#8a5a00]"}>
            {data.canCreateRequests ? "Aktif" : "Butuh Setting"}
          </Badge>
        </div>
      </section>

      <section className="rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Form Pengajuan</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#486275]">
            Tambah line sesuai bawahan dan checklist kerja yang mau dikerjakan saat lembur.
          </p>
        </div>

        {data.canCreateRequests && data.team.length > 0 ? (
          <OvertimeCommandLetterComposer
            action={manageOvertimeCommandLetterAction}
            intent="create"
            submitLabel="Simpan Pengajuan"
            routeTemplates={data.splOptions.routeTemplates}
            libraryActivities={data.splOptions.libraryActivities}
            teamMembers={data.team.map((member) => ({
              id: member.id,
              name: member.name,
              role: member.jobTitle || member.role,
            }))}
          />
        ) : (
          <div className="rounded-[1rem] bg-[#fff8e8] px-4 py-4 text-sm font-semibold leading-6 text-[#8a5a00]">
            {data.team.length === 0
              ? "Belum ada bawahan aktif. Pengajuan belum bisa dibuat."
              : "Leader ini belum aktif di setting pengajuan lembur."}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Riwayat SPL</p>
          <Badge className="border-0 bg-[#eaf4fb] text-[9px] font-black uppercase tracking-[0.14em] text-[#003f78]">
            {data.splDocuments.length} dokumen
          </Badge>
        </div>

        {data.splDocuments.length > 0 ? (
          data.splDocuments.map((document) => (
            <article
              key={document.id}
              className="rounded-[1.25rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#486275]">
                    {document.splNumber}
                  </p>
                  <h2 className="mt-1 text-base font-black leading-tight text-[#082033]">{document.title}</h2>
                  <p className="mt-2 text-xs font-semibold text-[#486275]">
                    {document.workDate.toLocaleDateString("id-ID")} • {document.workerCount} worker
                  </p>
                </div>
                <Badge className={statusBadgeClass(document.status)}>{document.status}</Badge>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-xs font-semibold text-[#486275]">
                <div className="rounded-[0.9rem] bg-[#f6fbff] px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">Line</p>
                  <p className="mt-1 text-sm text-[#082033]">{document.lineCount}</p>
                </div>
                <div className="rounded-[0.9rem] bg-[#f6fbff] px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">Progress</p>
                  <p className="mt-1 text-sm text-[#082033]">{document.progressPercent}%</p>
                </div>
                <div className="rounded-[0.9rem] bg-[#f6fbff] px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">Point</p>
                  <p className="mt-1 text-sm text-[#082033]">{document.plannedPointsTotal}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {document.items.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-[0.9rem] bg-[#f6fbff] px-3 py-3">
                    <p className="text-sm font-semibold text-[#082033]">{item.lineLabel}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[#486275]">
                      {item.assignedEmployeeName ?? "Belum pilih"} • {item.plannedPoints} pts
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[1.25rem] bg-white p-5 text-center text-sm font-semibold text-[#486275] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            Belum ada pengajuan lembur.
          </div>
        )}
      </section>
    </div>
  );
}
