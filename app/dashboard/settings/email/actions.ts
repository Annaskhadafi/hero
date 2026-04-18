"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { emailSmtpSettings } from "@/db/schema/hero";
import { sendEmailViaSmtp, type EmailTransportSettings } from "@/lib/email-delivery";
import { getServerSession } from "@/lib/auth-session";
import { ensureHeroGovernanceSeedData, getEmailSmtpSettingsData } from "@/lib/hero-admin";

export type EmailSettingsActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const smtpSettingsSchema = z.object({
  smtpHost: z.string().trim().min(1, "Host SMTP wajib diisi."),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpEncryption: z.string().trim().min(1).default("tls"),
  smtpUser: z.string().trim().default(""),
  smtpPassword: z.string().default(""),
  fromEmail: z.string().trim().email("From Email harus valid."),
  fromName: z.string().trim().min(1, "From Name wajib diisi."),
  replyToEmail: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? "")
    .refine((value) => value === "" || z.string().email().safeParse(value).success, {
      message: "Reply-To Email harus valid.",
    }),
  testRecipient: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? "")
    .refine((value) => value === "" || z.string().email().safeParse(value).success, {
      message: "Penerima test email harus berupa alamat email yang valid.",
    }),
});

const INITIAL_STATE: EmailSettingsActionState = {
  status: "idle",
  message: "",
};

async function getExistingSmtpSettings() {
  await ensureHeroGovernanceSeedData();

  const [settings] = await db
    .select()
    .from(emailSmtpSettings)
    .orderBy(desc(emailSmtpSettings.isActive), desc(emailSmtpSettings.updatedAt), desc(emailSmtpSettings.id))
    .limit(1);

  if (settings) {
    return settings;
  }

  const fallback = await getEmailSmtpSettingsData();
  return {
    ...fallback,
    passwordSecret: fallback.passwordSecret,
  };
}

function buildTransportSettings(
  values: z.infer<typeof smtpSettingsSchema>,
  existingSettings: {
    passwordSecret: string;
    timeoutSeconds: number;
  },
): EmailTransportSettings {
  return {
    host: values.smtpHost,
    port: values.smtpPort,
    encryption: values.smtpEncryption.toLowerCase(),
    username: values.smtpUser,
    passwordSecret: values.smtpPassword.trim() || existingSettings.passwordSecret,
    fromEmail: values.fromEmail,
    fromName: values.fromName,
    replyToEmail: values.replyToEmail,
    timeoutSeconds: existingSettings.timeoutSeconds,
  };
}

export async function saveEmailSmtpSettingsAction(
  _state: EmailSettingsActionState = INITIAL_STATE,
  formData: FormData,
): Promise<EmailSettingsActionState> {
  const parsed = smtpSettingsSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Konfigurasi SMTP belum valid.",
    };
  }

  try {
    const existing = await getExistingSmtpSettings();
    const nextSettings = buildTransportSettings(parsed.data, existing);

    await db
      .update(emailSmtpSettings)
      .set({
        host: nextSettings.host,
        port: nextSettings.port,
        encryption: nextSettings.encryption,
        username: nextSettings.username,
        passwordSecret: nextSettings.passwordSecret,
        fromEmail: nextSettings.fromEmail,
        fromName: nextSettings.fromName,
        replyToEmail: nextSettings.replyToEmail,
        updatedAt: new Date(),
      })
      .where(eq(emailSmtpSettings.id, existing.id));

    revalidatePath("/dashboard/settings/email");

    return {
      status: "success",
      message: "Konfigurasi SMTP berhasil disimpan.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan konfigurasi SMTP.";
    return {
      status: "error",
      message,
    };
  }
}

export async function sendEmailTestAction(
  _state: EmailSettingsActionState = INITIAL_STATE,
  formData: FormData,
): Promise<EmailSettingsActionState> {
  const parsed = smtpSettingsSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Konfigurasi SMTP belum valid.",
    };
  }

  try {
    const session = await getServerSession();
    const existing = await getExistingSmtpSettings();
    const transportSettings = buildTransportSettings(parsed.data, existing);
    const recipient = parsed.data.testRecipient || session?.user?.email?.trim() || "";

    if (!recipient) {
      return {
        status: "error",
        message: "Isi penerima test email atau login dengan akun yang memiliki alamat email.",
      };
    }

    await sendEmailViaSmtp(transportSettings, {
      to: recipient,
      subject: `SMTP test HERO - ${transportSettings.fromName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
          <h2 style="margin-bottom: 12px;">SMTP test berhasil diproses</h2>
          <p>Email ini dikirim dari halaman Delivery / SMTP Settings HERO.</p>
          <p><strong>Host:</strong> ${transportSettings.host}:${transportSettings.port}</p>
          <p><strong>Encryption:</strong> ${transportSettings.encryption}</p>
          <p><strong>From:</strong> ${transportSettings.fromName} &lt;${transportSettings.fromEmail}&gt;</p>
          <p style="font-size: 12px; color: #64748b;">Waktu kirim: ${new Date().toLocaleString("id-ID")}</p>
        </div>
      `,
      text: [
        "SMTP test HERO",
        "",
        "Email ini dikirim dari halaman Delivery / SMTP Settings HERO.",
        `Host: ${transportSettings.host}:${transportSettings.port}`,
        `Encryption: ${transportSettings.encryption}`,
        `From: ${transportSettings.fromName} <${transportSettings.fromEmail}>`,
      ].join("\n"),
      templateName: "SMTP Test Email",
      templateCode: "smtp_test_email",
      actorEmail: session?.user?.email ?? null,
    });

    revalidatePath("/dashboard/settings/email");

    return {
      status: "success",
      message: `Test email berhasil dikirim ke ${recipient}.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengirim test email.";
    return {
      status: "error",
      message: `Test email gagal: ${message}`,
    };
  }
}
