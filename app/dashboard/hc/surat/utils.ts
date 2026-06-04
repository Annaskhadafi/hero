export function formatJabatan(section?: string | null, fallbackJobTitle?: string | null): string {
  if (!section) return fallbackJobTitle || '______________________'
  const s = section.toLowerCase()
  if (s.includes('repair')) return 'Repairman'
  if (s.includes('service')) return 'Serviceman'
  if (s.includes('technical')) return 'Technical Engineer'
  if (s.includes('sale')) return 'Business Consultant'
  return section
}
