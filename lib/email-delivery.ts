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

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type EmailDeliveryPayload = {
  to: string;
  cc?: string | string[];
  subject: string;
  html?: string;
  text: string;
  format?: string | null;
  templateName?: string | null;
  templateCode?: string | null;
  actorEmail?: string | null;
  attachments?: EmailAttachment[];
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

function cleanEmailContent(html?: string) {
  return html || undefined
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
    ccEmail: Array.isArray(payload.cc) ? payload.cc.join(", ") : payload.cc ?? null,
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

export async function logEmailDeliveryRecord(data: {
  actorEmail?: string | null;
  toEmail: string;
  ccEmail?: string | null;
  fromEmail?: string | null;
  templateName?: string | null;
  templateCode?: string | null;
  subject: string;
  status: "sent" | "failed" | "pending";
  errorMessage?: string | null;
  htmlContent?: string | null;
  textContent?: string | null;
}) {
  await db.insert(emailDeliveryLogs).values({
    employeeId: await resolveActorEmployeeId(data.actorEmail),
    deliveryChannel: "email",
    toEmail: data.toEmail,
    ccEmail: data.ccEmail ?? null,
    fromEmail: data.fromEmail ?? "system@hero.chitra.com",
    templateName: data.templateName ?? "CS Forecast Daily Report",
    templateCode: data.templateCode ?? "cs_forecast_daily_report",
    subject: data.subject,
    status: data.status,
    errorMessage: data.errorMessage ?? null,
    htmlContent: data.htmlContent ?? null,
    textContent: data.textContent ?? null,
    sentAt: data.status === "sent" ? new Date() : null,
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
    const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 10)}@${settings.fromEmail.split("@")[1] || "herochitra.com"}>`;
    const isPlainText = payload.format === "plain_text";
    const result = await transporter.sendMail({
      from: formatFromAddress(settings),
      to: payload.to,
      cc: Array.isArray(payload.cc) ? payload.cc.join(", ") : payload.cc,
      replyTo: settings.replyToEmail.trim() || undefined,
      subject: payload.subject,
      ...(isPlainText
        ? { text: payload.text }
        : { html: payload.html, text: payload.text }),
      messageId,
      attachments: payload.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType || "application/pdf",
      })),
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
