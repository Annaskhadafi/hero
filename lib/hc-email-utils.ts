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

export function stripHtmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<li>/gi, "\n• ")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<td[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function renderHcTemplate(
  template: { subject: string; body: string; format?: string | null },
  vars: Record<string, string>
) {
  let subject = template.subject;
  let body = template.body;
  for (const [key, value] of Object.entries(vars)) {
    const token = `{${key}}`;
    subject = subject.replaceAll(token, value);
    body = body.replaceAll(token, value);
  }

  const isPlainText = template.format === "plain_text";
  return {
    subject,
    body: isPlainText ? stripHtmlToPlainText(body) : body,
    html: isPlainText ? undefined : body,
    text: isPlainText ? stripHtmlToPlainText(body) : stripHtmlToPlainText(body),
  };
}

export const HC_TEMPLATE_CODES = [
  "interview_invitation", "test_assigned", "application_received",
  "mcu_pengantar", "mcu_invitation",
];
