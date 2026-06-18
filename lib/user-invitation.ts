import { randomBytes } from "crypto";
import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { eq } from "drizzle-orm";
import { getPublicAppUrl } from "@/lib/auth-config";
import { buildWorkflowEmailContent, sendWorkflowEmail } from "@/lib/workflow-email";

export function generateInvitationToken() {
  return randomBytes(32).toString("hex");
}

export function generateVerificationToken() {
  return randomBytes(32).toString("hex");
}

export async function createUserInvitation(params: {
  employeeId: number;
  expiresInHours?: number;
}) {
  const token = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (params.expiresInHours ?? 72));

  await db
    .update(employees)
    .set({
      invitationToken: token,
      invitationExpiresAt: expiresAt,
    })
    .where(eq(employees.id, params.employeeId));

  return { token, expiresAt };
}

export async function verifyInvitationToken(token: string) {
  const [employee] = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      invitationExpiresAt: employees.invitationExpiresAt,
      invitationAcceptedAt: employees.invitationAcceptedAt,
    })
    .from(employees)
    .where(eq(employees.invitationToken, token))
    .limit(1);

  if (!employee) {
    return { valid: false, reason: "invalid_token" as const };
  }

  if (employee.invitationAcceptedAt) {
    return { valid: false, reason: "already_accepted" as const };
  }

  if (employee.invitationExpiresAt && employee.invitationExpiresAt < new Date()) {
    return { valid: false, reason: "expired" as const };
  }

  return { valid: true, employee };
}

export async function acceptInvitation(params: {
  token: string;
  password: string;
}) {
  const verification = await verifyInvitationToken(params.token);

  if (!verification.valid) {
    throw new Error(`Invitation ${verification.reason}`);
  }

  if (!verification.employee) {
    throw new Error("Employee not found");
  }

  await db
    .update(employees)
    .set({
      invitationAcceptedAt: new Date(),
      invitationToken: null,
      invitationExpiresAt: null,
    })
    .where(eq(employees.id, verification.employee.id));

  return verification.employee;
}

export async function createEmailVerification(params: {
  employeeId: number;
  expiresInHours?: number;
}) {
  const token = generateVerificationToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (params.expiresInHours ?? 24));

  await db
    .update(employees)
    .set({
      emailVerificationToken: token,
      emailVerificationExpiresAt: expiresAt,
    })
    .where(eq(employees.id, params.employeeId));

  return { token, expiresAt };
}

export async function verifyEmail(token: string) {
  const [employee] = await db
    .select({
      id: employees.id,
      emailVerificationExpiresAt: employees.emailVerificationExpiresAt,
    })
    .from(employees)
    .where(eq(employees.emailVerificationToken, token))
    .limit(1);

  if (!employee) {
    return { valid: false, reason: "invalid_token" as const };
  }

  if (
    employee.emailVerificationExpiresAt &&
    employee.emailVerificationExpiresAt < new Date()
  ) {
    return { valid: false, reason: "expired" as const };
  }

  await db
    .update(employees)
    .set({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    })
    .where(eq(employees.id, employee.id));

  return { valid: true, employeeId: employee.id };
}

export function getInvitationUrl(token: string, baseUrl?: string) {
  const base = baseUrl ?? getPublicAppUrl();
  return `${base}/auth/accept-invitation?token=${token}`;
}

export function getVerificationUrl(token: string, baseUrl?: string) {
  const base = baseUrl ?? getPublicAppUrl();
  return `${base}/auth/verify-email?token=${token}`;
}

export async function sendUserInvitationEmail(params: {
  email: string;
  name: string;
  invitationToken: string;
  verificationToken?: string | null;
}) {
  const invitationUrl = getInvitationUrl(params.invitationToken);
  const verificationUrl = params.verificationToken ? getVerificationUrl(params.verificationToken) : null;
  const content = buildWorkflowEmailContent({
    title: "Undangan akun HERO",
    greeting: `Halo ${params.name},`,
    intro: "Akun HERO Anda sudah dibuat. Silakan terima undangan untuk melanjutkan aktivasi akun.",
    details: [
      verificationUrl ? `Verifikasi email: ${verificationUrl}` : null,
      "Jika ini akun pertama Anda, gunakan menu Forgot Password setelah menerima undangan untuk membuat password login.",
    ],
    ctaLabel: "Terima Undangan",
    ctaUrl: invitationUrl,
  });

  await sendWorkflowEmail({
    to: params.email,
    templateCode: "user_invitation",
    templateName: "User Invitation",
    variables: {
      userName: params.name,
      invitationLink: invitationUrl,
      verificationLink: verificationUrl ?? "",
    },
    fallbackSubject: "Undangan akun HERO",
    fallbackHtml: content.html,
    fallbackText: content.text,
  });
}

export async function issueUserInvitation(params: { employeeId: number; email: string; name: string }) {
  const invitation = await createUserInvitation({ employeeId: params.employeeId });
  const verification = await createEmailVerification({ employeeId: params.employeeId });

  await sendUserInvitationEmail({
    email: params.email,
    name: params.name,
    invitationToken: invitation.token,
    verificationToken: verification.token,
  });

  return {
    invitationToken: invitation.token,
    verificationToken: verification.token,
    invitationExpiresAt: invitation.expiresAt,
    verificationExpiresAt: verification.expiresAt,
  };
}
