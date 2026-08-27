import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, Plus, ArrowRight } from "lucide-react";
import { getServerSession } from "@/lib/auth-session";
import { fetchApdRequests } from "@/lib/apd-data";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { APD_REQUEST_STATUS_LABELS, normalizeApdRequestStatus } from "@/lib/apd-status";

function statusBadgeClass(status: string) {
  const n = normalizeApdRequestStatus(status);
  if (n === "complete" || n === "proses_order") return "bg-emerald-50 text-emerald-700";
  if (n === "pending_approval") return "bg-amber-50 text-amber-700";
  if (n === "cancel") return "bg-rose-50 text-rose-700";
  return "bg-blue-50 text-blue-700";
}

export default async function MobileMaterialPage() {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");

  const currentEmployee = await getCurrentEmployee();
  if (!currentEmployee) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-5 text-sm text-gray-500">
        Data employee belum tersedia untuk akun ini.
      </div>
    );
  }

  const allRequests = await fetchApdRequests(currentEmployee.id);
  const requests = allRequests.filter(r => (r.requestCategory || "APD") === "MATERIAL");
  const pendingCount = requests.filter(r => normalizeApdRequestStatus(r.status) === "pending_approval").length;
  const orderCount = requests.filter(r => normalizeApdRequestStatus(r.status) === "proses_order").length;
  const completeCount = requests.filter(r => normalizeApdRequestStatus(r.status) === "complete").length;

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <section className="rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-amber-200">HSE &bull; REQUEST MATERIAL</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight">Request Material</h1>
          </div>
          <Link
            prefetch={false}
            href="/mobile/material/new"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 active:scale-95 transition-transform"
            aria-label="Ajukan Material"
          >
            <Plus className="size-5 text-amber-200" />
          </Link>
        </div>

        <div className="mt-4 rounded-xl bg-white/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-medium text-amber-100">
                <Package className="size-3" /> Material Request
              </span>
              <p className="mt-3 text-3xl font-bold leading-none">{requests.length}</p>
              <p className="mt-2 text-sm text-amber-200">
                Total request material Anda
              </p>
            </div>
            <Link
              prefetch={false}
              href="/mobile/material/new"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-xs font-semibold text-amber-700 active:scale-95 transition-transform"
            >
              Ajukan <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-white/10 px-3 py-2 text-center">
              <p className="text-[10px] font-medium text-amber-200">Menunggu Approval</p>
              <p className="mt-0.5 text-base font-bold text-amber-300">{pendingCount}</p>
            </div>
            <div className="rounded-lg bg-white/10 px-3 py-2 text-center">
              <p className="text-[10px] font-medium text-amber-200">Proses Order</p>
              <p className="mt-0.5 text-base font-bold text-sky-300">{orderCount}</p>
            </div>
            <div className="rounded-lg bg-white/10 px-2 py-2 text-center">
              <p className="text-[10px] font-medium text-amber-200">Complete</p>
              <p className="mt-0.5 text-base font-bold text-emerald-300">{completeCount}</p>
            </div>
          </div>
        </div>
      </section>

      {/* List */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Riwayat Pengajuan Material</h2>
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">{requests.length} tiket</span>
        </div>

        {requests.length > 0 ? (
          <div className="space-y-3">
            {requests.map((request) => (
              <Link 
                key={request.id} 
                href={`/mobile/apd/${request.id}`}
                className="block active:scale-[0.98] transition-transform"
              >
                <article className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{request.requestNumber}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <h2 className="text-sm font-semibold leading-tight text-gray-900">Request Material</h2>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{request.requestDate?.toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
                    </div>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium shrink-0 uppercase tracking-wider ${statusBadgeClass(request.status)}`}>
                      {APD_REQUEST_STATUS_LABELS[normalizeApdRequestStatus(request.status) ?? "pending_approval"] ?? request.status}
                    </span>
                  </div>

                  {request.notes ? (
                    <div className="mt-3 rounded-lg bg-gray-50 p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Catatan</p>
                      <p className="mt-0.5 text-xs text-gray-700 line-clamp-2">{request.notes}</p>
                    </div>
                  ) : null}
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">Belum ada riwayat pengajuan material.</div>
        )}
      </section>
    </div>
  );
}
