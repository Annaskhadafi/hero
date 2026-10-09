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
  const v = value.toLowerCase().replace(" ", "_");
  if (v === "pending" || v === "pending_approval") return "pending_approval";
  if (v === "approved" || v === "proses_order") return "proses_order";
  if (v === "completed" || v === "complete") return "complete";
  if (v === "cancelled" || v === "cancel") return "cancel";
  return null;
}

export function normalizeApdRequestCategory(value: string): ApdRequestCategory | null {
  const category = value.trim().toUpperCase();
  return APD_REQUEST_CATEGORIES.includes(category as ApdRequestCategory)
    ? (category as ApdRequestCategory)
    : null;
}

export const APD_ITEMS = [
  "Safety Glasses",
  "Masker",
  "Ear Plug",
  "Sarung Tangan Ansel",
  "Safety Shoes",
  "Safety Boot Petrova",
  "Helmet Kuning",
  "Helmet Putih",
  "Padlock Merah",
  "Padlock Kuning",
  "Sisor",
  "Tali Kacamata",
  "Chin Strap",
  "Dalaman Helm",
  "Sarung Tangan Dotting",
  "Safety Goggles",
  "Apron",
  "Face Shield Helmet",
  "Sunbrim Helmet",
] as const;

export const APD_SIZE_OPTIONS = [
  "5. (Uk 38)",
  "5,5. (Uk 39)",
  "6. (Uk 40)",
  "7. (Uk 41)",
  "8. (Uk 42)",
  "9. (Uk 43)",
  "9,5. (Uk 44)",
  "10. (Uk 45)",
  "11. (Uk 46)",
] as const;


export type ApproverOption = {
  id: number;
  name: string;
  role?: string;
  employeeSn?: string | null;
  email?: string;
  jobTitle?: string;
  departmentName?: string | null;
  sectionName?: string | null;
};

