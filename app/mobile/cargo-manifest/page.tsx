import { redirect } from "next/navigation";
import { ArrowLeft, Package, Clock, MapPin, CheckCircle2, MoreVertical } from "lucide-react";
import Link from "next/link";

import { getServerSession } from "@/lib/auth-session";
import { getCargoManifests } from "@/app/actions/cargo-manifest";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { Badge } from "@/components/ui/badge";

export default async function MobileCargoManifestPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const manifests = await getCargoManifests();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/mobile/dashboard"
          className="flex size-9 items-center justify-center rounded-xl bg-white text-[#003f78] shadow-sm active:scale-95"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black tracking-tight text-[#003461]">Cargo Manifest</h1>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#486275]">Logistik & Pengiriman</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#486275]">Total</p>
          <p className="mt-1 text-2xl font-black text-[#003f78]">{manifests.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#486275]">Delivered</p>
          <p className="mt-1 text-2xl font-black text-[#003f78]">
            {manifests.filter((m) => m.status === "delivered").length}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {manifests.map((m) => (
          <div
            key={m.id}
            className="rounded-[1.25rem] bg-white p-4 shadow-[0_8px_20px_rgba(8,32,51,0.04)] active:scale-[0.98]"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="font-mono text-[10px] font-black tracking-wider text-[#003f78]">
                  {m.manifestNumber}
                </p>
                <h3 className="font-black text-[#082033]">{m.attention || "No Attention"}</h3>
              </div>
              <AdminStatusBadge value={m.status} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-y-3 border-t border-dashed border-[#d8e8f3] pt-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#486275]">
                  <Clock className="size-3" />
                  DATE
                </div>
                <p className="text-xs font-black text-[#082033]">{m.date}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#486275]">
                  <Package className="size-3" />
                  TRANSPORT
                </div>
                <p className="text-xs font-black text-[#082033]">{m.transportVia || "—"}</p>
              </div>
              <div className="col-span-2 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#486275]">
                  <MapPin className="size-3" />
                  DESTINATION
                </div>
                <p className="text-xs font-black text-[#082033]">{m.finalDestination || "—"}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[#f6fbff] px-3 py-2">
              <p className="text-[10px] font-bold text-[#486275]">
                {m.items.length} Items included
              </p>
              <button className="text-[10px] font-black uppercase tracking-wider text-[#003f78]">
                Detail
              </button>
            </div>
          </div>
        ))}

        {manifests.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <Package className="mx-auto size-8 text-[#d8e8f3]" />
            <p className="mt-3 text-sm font-bold text-[#486275]">Belum ada data manifest.</p>
          </div>
        )}
      </div>
    </div>
  );
}
