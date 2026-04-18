import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emailDeliveryLogs, employees } from "@/db/schema/hero";

export type EmailTransportSettings = {
  host: string;
  port: number;
  encryption: string;
  username: string;
  passwordSecret: string;
  fromEmail: string;
  fromName: string;
  replyToEmail: string;
  timeoutSeconds: number;
};

export type EmailDeliveryPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
  templateName?: string | null;
  templateCode?: string | null;
  actorEmail?: string | null;
};

function usesSecureTransport(encryption: string, port: number) {
  const normalizedEncryption = encryption.trim().toLowerCase();
  return normalizedEncryption === "ssl" || normalizedEncryption === "smtps" || port === 465;
}

function formatFromAddress(settings: EmailTransportSettings) {
  const fromName = settings.fromName.trim();

  if (!fromName) {
    return settings.fromEmail;
  }

  return `"${fromName.replaceAll('"', '\\"')}" <${settings.fromEmail}>`;
}

async function resolveActorEmployeeId(actorEmail?: string | null) {
  if (!actorEmail?.trim()) {
    return null;
  }

  const [employee] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.email, actorEmail.trim().toLowerCase()))
    .limit(1);

  return employee?.id ?? null;
}

async function logEmailDelivery(
  payload: EmailDeliveryPayload,
  settings: EmailTransportSettings,
  status: "sent" | "failed",
  errorMessage?: string,
) {
  await db.insert(emailDeliveryLogs).values({
    employeeId: await resolveActorEmployeeId(payload.actorEmail),
    deliveryChannel: "email",
    toEmail: payload.to,
    fromEmail: settings.fromEmail,
    templateName: payload.templateName ?? "Email Test SMTP",
    templateCode: payload.templateCode ?? "smtp_test_email",
    subject: payload.subject,
    status,
    errorMessage,
    htmlContent: payload.html,
    textContent: payload.text,
    sentAt: status === "sent" ? new Date() : null,
  });
}

export async function sendEmailViaSmtp(
  settings: EmailTransportSettings,
  payload: EmailDeliveryPayload,
) {
  if (!settings.host.trim()) {
    throw new Error("Host SMTP belum diisi.");
  }

  if (!settings.fromEmail.trim()) {
    throw new Error("From Email belum diisi.");
  }

  const secure = usesSecureTransport(settings.encryption, settings.port);
  const transporter = nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure,
    auth:
      settings.username.trim() || settings.passwordSecret.trim()
        ? {
            user: settings.username,
            pass: settings.passwordSecret,
          }
        : undefined,
    connectionTimeout: settings.timeoutSeconds * 1000,
    greetingTimeout: settings.timeoutSeconds * 1000,
    socketTimeout: settings.timeoutSeconds * 1000,
  });

  try {
    const result = await transporter.sendMail({
      from: formatFromAddress(settings),
      to: payload.to,
      replyTo: settings.replyToEmail.trim() || undefined,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    await logEmailDelivery(payload, settings, "sent");

    return {
      accepted: result.accepted,
      rejected: result.rejected,
      messageId: result.messageId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown SMTP error";
    await logEmailDelivery(payload, settings, "failed", message);
    throw error;
  }
}

