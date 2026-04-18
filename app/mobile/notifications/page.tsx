import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, ChevronRight } from "lucide-react";

import { getServerSession } from "@/lib/auth-session";
import { getMobileNotifications } from "@/lib/mobile-data";

function formatDate(value?: Date | null) {
  if (!value) return "-";

  return value.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });
}

export default async function MobileNotificationsPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const notifications = await getMobileNotifications(session.user.email);

  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Signal Queue</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">Notifications</h1>
      </section>

      <section className="space-y-3">
        {notifications.map((item) => (
          <article
            key={item.id}
            className="flex items-center gap-3 rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-[#e9f6fd] text-[#003f78]">
              <Bell className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-[#082033]">{item.eventType ?? item.channel}</p>
              <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#5d7485]">
                {item.payloadSnapshot || item.errorMessage || `${item.channel} ${item.status}`}
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#5d7485]">
              {formatDate(item.sentAt ?? item.createdAt)}
            </span>
          </article>
        ))}
        {notifications.length === 0 ? (
          <div className="rounded-[1.2rem] bg-white p-5 text-center text-sm font-semibold text-[#5d7485] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            Belum ada notifikasi untuk akun ini.
          </div>
        ) : null}
      </section>

      <Link
        href="/mobile/dashboard"
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#003f78] text-sm font-black text-white shadow-[0_14px_30px_rgba(0,63,120,0.2)] active:scale-[0.98]"
      >
        Kembali ke Dashboard
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}
