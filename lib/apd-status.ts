export const APD_REQUEST_STATUSES = ["pending_approval", "proses_order", "complete", "cancel"] as const;

export type ApdRequestStatus = (typeof APD_REQUEST_STATUSES)[number];

export const APD_REQUEST_CATEGORIES = ["APD", "TOOLS", "MATERIAL"] as const;
export type ApdRequestCategory = (typeof APD_REQUEST_CATEGORIES)[number];

export const APD_REQUEST_STATUS_LABELS: Record<ApdRequestStatus, string> = {
  pending_approval: "Pending Approval",
  proses_order: "Proses Order",
  complete: "Complete",
  cancel: "Cancel",
};

export function normalizeApdRequestStatus(value: string): ApdRequestStatus | null {
  if (value === "pending" || value === "pending_approval") return "pending_approval";
  if (value === "approved" || value === "proses_order") return "proses_order";
  if (value === "completed" || value === "complete") return "complete";
  if (value === "cancelled" || value === "cancel") return "cancel";
  return null;
}

export function normalizeApdRequestCategory(value: string): ApdRequestCategory | null {
  const category = value.trim().toUpperCase();
  return APD_REQUEST_CATEGORIES.includes(category as ApdRequestCategory)
    ? (category as ApdRequestCategory)
    : null;
}
