export const MARITAL_STATUS_OPTIONS = [
  "Single On Site",
  "Married On Site",
] as const;

export type MaritalStatusOption = (typeof MARITAL_STATUS_OPTIONS)[number];

export function formatMaritalStatus(status?: string | null): string {
  if (!status || status === 'none' || status === 'Belum Diisi' || status.trim() === '') {
    return 'Single On Site';
  }
  if (status === 'Married On Site' || status === 'Single On Site') {
    return status;
  }
  // Fallback map standard marital statuses if legacy data exists
  if (status.toLowerCase().includes('menikah') && !status.toLowerCase().includes('belum')) {
    return 'Married On Site';
  }
  return 'Single On Site';
}


