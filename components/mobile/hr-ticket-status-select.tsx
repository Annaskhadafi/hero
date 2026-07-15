"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTicketStatus } from "@/app/actions/hr-counseling";
import { HR_TICKET_STATUSES } from "@/lib/hr-ticket-status";

export function HrTicketStatusSelect({ sessionId, status }: { sessionId: number; status: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <select
      aria-label="Ubah status tiket"
      value={status}
      disabled={pending}
      onChange={(event) => startTransition(async () => {
        await updateTicketStatus(sessionId, event.target.value);
        router.refresh();
      })}
      className="h-9 max-w-[155px] rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-700 outline-none"
    >
      {HR_TICKET_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
    </select>
  );
}
