export type CandidateApplicationIdentity = {
  fullName?: string;
  email?: string;
  phone?: string;
};

const NAME_KEYS = ["fullName", "candidateName", "name", "nama", "namaLengkap", "nama_lengkap"];
const EMAIL_KEYS = ["email", "emailAddress", "alamatEmail", "alamat_email"];
const PHONE_KEYS = ["handphone", "phone", "mobilePhone", "mobile_phone", "whatsapp", "wa", "homePhone"];

function cleanText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

function pickText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = cleanText(record[key]);
    if (value) return value;
  }
  return "";
}

function normalizeEmail(value: string) {
  const match = value.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  return match?.[0]?.toLowerCase() ?? "";
}

function isSafeName(value: string) {
  if (!value || value.length > 160) return false;
  if (value.startsWith("{") || value.startsWith("[")) return false;
  if (value.includes("@") || value.includes("data:image") || value.includes("base64,")) return false;
  if (/^https?:\/\//i.test(value)) return false;
  return true;
}

function mergeIdentity(current: CandidateApplicationIdentity, next: CandidateApplicationIdentity) {
  return {
    fullName: next.fullName || current.fullName,
    email: next.email || current.email,
    phone: next.phone || current.phone,
  };
}

export function hasCandidateApplicationIdentity(identity: CandidateApplicationIdentity) {
  return Boolean(identity.fullName || identity.email || identity.phone);
}

export function mergeCandidateApplicationIdentity(
  current: CandidateApplicationIdentity,
  next: CandidateApplicationIdentity
) {
  return mergeIdentity(current, next);
}

export function extractCandidateIdentityFromApplicationFormJson(answerText: string): CandidateApplicationIdentity {
  const raw = answerText.trim();
  if (!raw || (!raw.startsWith("{") && !raw.startsWith("["))) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return {};

    const record = parsed as Record<string, unknown>;
    const fullName = pickText(record, NAME_KEYS);
    const email = normalizeEmail(pickText(record, EMAIL_KEYS));
    const phone = pickText(record, PHONE_KEYS);

    return {
      ...(isSafeName(fullName) ? { fullName } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
    };
  } catch {
    return {};
  }
}

export function extractCandidateIdentityFromAnswer(questionText: string, answerText: string): CandidateApplicationIdentity {
  const fromJson = extractCandidateIdentityFromApplicationFormJson(answerText);
  if (hasCandidateApplicationIdentity(fromJson)) return fromJson;

  const label = questionText.toLowerCase().replace(/<[^>]*>/g, "");
  const value = cleanText(answerText);
  if (!value || value.startsWith("{") || value.startsWith("[")) return {};

  const hasName =
    label.includes("nama") &&
    !label.includes("perusahaan") &&
    !label.includes("sekolah") &&
    !label.includes("universitas") &&
    !label.includes("produk");
  const hasEmail = label.includes("email") || label.includes("surel") || label.includes("mail") || label.includes("@");
  const hasPhone =
    label.includes("telepon") ||
    label.includes("hp") ||
    label.includes("whatsapp") ||
    label.includes("no.") ||
    label.includes("kontak") ||
    label.includes("nomor") ||
    /\bwa\b/.test(label);

  return {
    ...(hasName && isSafeName(value) ? { fullName: value } : {}),
    ...(hasEmail ? { email: normalizeEmail(value) } : {}),
    ...(hasPhone ? { phone: value } : {}),
  };
}
