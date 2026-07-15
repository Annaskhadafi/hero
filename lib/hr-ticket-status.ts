export const HR_TICKET_STATUSES = [
  { value: "open", label: "Diajukan", className: "bg-sky-100 text-sky-700" },
  { value: "in_review", label: "Sedang Ditinjau", className: "bg-amber-100 text-amber-700" },
  { value: "in_progress", label: "Sedang Diproses", className: "bg-indigo-100 text-indigo-700" },
  { value: "waiting_user", label: "Menunggu Tanggapan", className: "bg-orange-100 text-orange-700" },
  { value: "resolved", label: "Selesai Ditangani", className: "bg-emerald-100 text-emerald-700" },
  { value: "closed", label: "Ditutup", className: "bg-slate-100 text-slate-600" },
  { value: "rejected", label: "Ditolak", className: "bg-rose-100 text-rose-700" },
  { value: "cancelled", label: "Dibatalkan", className: "bg-slate-100 text-slate-500" },
] as const;

export type HrTicketStatus = (typeof HR_TICKET_STATUSES)[number]["value"];

export function getHrTicketStatus(status: string) {
  return HR_TICKET_STATUSES.find((item) => item.value === status) ?? HR_TICKET_STATUSES[0];
}

export function isHrTicketStatus(status: string): status is HrTicketStatus {
  return HR_TICKET_STATUSES.some((item) => item.value === status);
}
