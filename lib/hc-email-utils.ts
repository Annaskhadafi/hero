const PLACEHOLDERS: Record<string, string> = {
  candidateName: "Nama kandidat",
  jobTitle: "Nama posisi/lowongan",
  companyName: "Nama perusahaan",
  date: "Tanggal (misal: Senin, 12 Juni 2026)",
  time: "Waktu (misal: 09:00 WITA)",
  location: "Lokasi atau link meeting",
  interviewer: "Nama pewawancara",
  testLink: "Link tes online",
  duration: "Durasi dalam menit",
  clinicName: "Nama klinik MCU",
  clinicAddress: "Alamat klinik",
  clinicCity: "Kota klinik",
  paket: "Paket MCU",
};

export function getAvailablePlaceholders() {
  return PLACEHOLDERS;
}

export function renderHcTemplate(template: { subject: string; body: string }, vars: Record<string, string>) {
  let subject = template.subject;
  let body = template.body;
  for (const [key, value] of Object.entries(vars)) {
    const token = `{${key}}`;
    subject = subject.replaceAll(token, value);
    body = body.replaceAll(token, value);
  }
  return { subject, body };
}

export const HC_TEMPLATE_CODES = [
  "interview_invitation", "test_assigned", "application_received",
  "mcu_pengantar", "mcu_invitation",
];
