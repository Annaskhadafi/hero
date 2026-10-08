export const MARITAL_STATUS_OPTIONS = [
  "Belum Menikah (TK)",
  "Menikah (K/0)",
  "Menikah Anak 1 (K/1)",
  "Menikah Anak 2 (K/2)",
  "Menikah Anak 3 (K/3)",
] as const;

export type MaritalStatusOption = (typeof MARITAL_STATUS_OPTIONS)[number];

export function formatMaritalStatus(status?: string | null): string {
  if (!status || status === 'none' || status === 'Belum Diisi' || status.trim() === '') {
    return 'Belum Menikah (TK)';
  }
  return status;
}

