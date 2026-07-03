import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { getServerSession } from "@/lib/auth-session";
import { fetchApdRequestById } from "@/lib/apd-data";

function StatusBadge({ status }: { status: string }) {
  const n = status.toLowerCase();
  let bg = "bg-blue-50 text-blue-700";
  if (n.includes("approved") || n.includes("completed")) bg = "bg-emerald-50 text-emerald-700";
  if (n.includes("pending")) bg = "bg-amber-50 text-amber-700";
  if (n.includes("reject")) bg = "bg-rose-50 text-rose-700";
  
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium uppercase tracking-wider ${bg}`}>
      {status}
    </span>
  );
}

export default async function MobileApdDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return notFound();

  const request = await fetchApdRequestById(id);
  if (!request) return notFound();

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <section className="rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              prefetch={false}
              href="/mobile/apd"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 active:scale-95 transition-transform"
              aria-label="Kembali"
            >
              <ArrowLeft className="size-5 text-blue-200" />
            </Link>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-blue-200">Detail Tiket</p>
              <h1 className="mt-0.5 text-lg font-bold tracking-tight">{request.requestNumber}</h1>
            </div>
          </div>
          <Link
            prefetch={false}
            href={`/print/apd/${id}`}
            target="_blank"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 active:scale-95 transition-transform"
            aria-label="Cetak PDF"
          >
            <Printer className="size-5 text-blue-200" />
          </Link>
        </div>
      </section>

      {/* Info Pemohon */}
      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Informasi Pemohon</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Nama</p>
            <p className="font-semibold text-gray-900 mt-0.5">{request.employeeName}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Status</p>
            <div className="mt-0.5"><StatusBadge status={request.status} /></div>
          </div>
          <div>
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Departemen</p>
            <p className="font-semibold text-gray-900 mt-0.5">{request.departmentName ?? "-"}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Lokasi Kerja</p>
            <p className="font-semibold text-gray-900 mt-0.5">{request.siteName}</p>
          </div>
        </div>
      </section>

      {/* Detail Item APD */}
      <section>
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Detail Item APD</h2>
        <div className="space-y-3">
          {request.items.map((item) => (
            <article key={item.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <p className="font-bold text-gray-900">{item.itemType}</p>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 capitalize">
                  {item.requestType}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Jumlah</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{item.quantity}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Keterangan</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{item.notes || "-"}</p>
                </div>
              </div>
              {item.photoUrl && (
                <div className="mt-2 w-full h-32 relative rounded-lg overflow-hidden border border-gray-200">
                  <Image src={item.photoUrl} alt={`Foto ${item.itemType}`} fill className="object-cover" />
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* Informasi Tambahan */}
      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-4">
        <div>
          <h2 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">Catatan Tambahan</h2>
          <p className="text-sm font-medium text-gray-900">{request.notes || "-"}</p>
        </div>
        {request.signatureUrl && (
          <div>
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">Tanda Tangan Pemohon</h2>
            <div className="w-full max-w-[200px] h-24 relative rounded-lg overflow-hidden border border-gray-200 bg-white">
              <Image src={request.signatureUrl} alt="Tanda Tangan" fill className="object-contain" />
            </div>
          </div>
        )}
      </section>

      {/* Status Approval */}
      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Status Approval</h2>
        {request.approvalHistory && request.approvalHistory.length > 0 ? (
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 before:h-full before:w-0.5 before:bg-gray-100">
            {request.approvalHistory.map((step) => (
              <div key={step.id} className="relative flex items-start gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white bg-slate-50 shrink-0 z-10 shadow-sm mt-1">
                  {step.status === "approved" && <div className="size-2.5 rounded-full bg-emerald-500" />}
                  {step.status === "rejected" && <div className="size-2.5 rounded-full bg-rose-500" />}
                  {step.status === "pending" && <div className="size-2.5 rounded-full bg-amber-500 animate-pulse" />}
                </div>
                
                <div className="flex-1 rounded-lg border border-gray-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-sm text-gray-900">{step.approverName || "Approver"}</div>
                    <time className="text-[10px] text-gray-500">
                      {step.resolvedAt ? step.resolvedAt.toLocaleString("id-ID") : "Menunggu"}
                    </time>
                  </div>
                  <div className="text-xs text-gray-600 capitalize">
                    Status: <strong className={step.status === 'approved' ? 'text-emerald-600' : step.status === 'rejected' ? 'text-rose-600' : 'text-amber-600'}>{step.status}</strong>
                  </div>
                  {step.decisionNote && (
                    <div className="mt-2 text-xs italic text-gray-600 border-l-2 border-gray-200 pl-2">
                      "{step.decisionNote}"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 text-center py-4">Belum ada rute approval yang berjalan.</p>
        )}
      </section>
    </div>
  );
}
