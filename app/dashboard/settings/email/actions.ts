"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  emailSmtpSettings,
  emailTemplates,
  hcNotificationConfig,
  hseSafetyNotificationConfig,
  notificationChannelSettings,
} from "@/db/schema/hero";
import { sendEmailViaSmtp, type EmailTransportSettings } from "@/lib/email-delivery";
import { EMAIL_TEMPLATE_PRESET_MAP, EMAIL_TEMPLATE_PRESETS } from "@/lib/email-template-presets";
import { getServerSession } from "@/lib/auth-session";
import {
  ensureHeroGovernanceSeedData,
  getEmailSmtpSettingsData,
  getPwaPushSettingsData,
} from "@/lib/hero-admin";
import { getEmployeeTargetByEmail, sendPushNotification } from "@/lib/push-notifications";

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

const pwaPushSettingsSchema = z.object({
  vapidPublicKey: z.string().trim().min(1, "VAPID Public Key wajib diisi."),
  vapidPrivateKey: z.string().trim().min(1, "VAPID Private Key wajib diisi."),
  pushSubject: z
    .string()
    .trim()
    .min(1, "Push Subject wajib diisi.")
    .refine(
      (value) =>
        value.startsWith("mailto:") ||
        z.string().url().safeParse(value).success,
      {
        message: "Push Subject harus berupa mailto: atau URL yang valid.",
      },
    ),
  serviceWorkerPath: z.string().trim().min(1, "Service Worker path wajib diisi."),
});

const emailTemplateSchema = z.object({
  intent: z.enum(["create", "update"]),
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1, "Template name is required.").max(120),
  templateCode: z
    .string()
    .trim()
    .min(1, "Template code is required.")
    .max(100)
    .regex(/^[a-z0-9_]+$/, "Kode template hanya boleh huruf kecil, angka, dan underscore."),
  templateType: z.string().trim().min(1, "Template type is required.").max(50),
  deliveryChannel: z.string().trim().min(1, "Delivery channel is required.").max(120),
  recipientScope: z.string().trim().min(1, "Recipient scope is required.").max(1000),
  ccEmail: z.string().trim().max(500).default(""),
  subject: z.string().trim().min(1, "Email subject is required.").max(200),
  htmlContent: z.string().default(""),
  textContent: z.string().default(""),
  isActive: z.preprocess((value) => value === "true" || value === true, z.boolean()),
});

const emailTemplateToggleSchema = z.object({
  id: z.coerce.number().int().positive(),
  isActive: z.preprocess((value) => value === "true" || value === true, z.boolean()),
});

const emailTemplatePresetSchema = z.object({
  templateCode: z
    .string()
    .trim()
    .min(1, "Kode template preset wajib diisi.")
    .regex(/^[a-z0-9_]+$/, "Kode template preset tidak valid."),
});

const emailTemplateTestSchema = z.object({
  templateId: z.coerce.number().int().positive(),
});

const hseSafetyNotificationSchema = z.object({
  recipientEmails: z.string().trim().default(""),
  ccEmails: z.string().trim().default(""),
  isActive: z.preprocess((value) => value === "true" || value === true, z.boolean()),
});

const humanCapitalNotificationSchema = z.object({
  recipientEmails: z.string().trim().default(""),
  ccEmails: z.string().trim().default(""),
  isActive: z.preprocess((value) => value === "true" || value === true, z.boolean()),
});

const INITIAL_STATE: EmailSettingsActionState = {
  status: "idle",
  message: "",
};

async function upsertEmailTemplateFromPreset(
  templateCode: string,
  options?: {
    keepExistingActive?: boolean;
  },
) {
  const preset = EMAIL_TEMPLATE_PRESET_MAP[templateCode];

  if (!preset) {
    throw new Error(`Preset template ${templateCode} tidak ditemukan.`);
  }

  const [existing] = await db
    .select({
      id: emailTemplates.id,
      isActive: emailTemplates.isActive,
    })
    .from(emailTemplates)
    .where(eq(emailTemplates.templateCode, templateCode))
    .limit(1);

  const nextValues = {
    name: preset.name,
    templateCode: preset.templateCode,
    templateType: preset.templateType,
    deliveryChannel: preset.deliveryChannel,
    recipientScope: preset.recipientScope,
    ccEmail: preset.ccEmail,
    subject: preset.subject,
    htmlContent: preset.htmlContent,
    textContent: preset.textContent,
    isActive:
      existing && options?.keepExistingActive !== false ? existing.isActive : true,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(emailTemplates).set(nextValues).where(eq(emailTemplates.id, existing.id));
    return { mode: "updated" as const, id: existing.id };
  }

  const [created] = await db
    .insert(emailTemplates)
    .values({
      ...nextValues,
      createdAt: new Date(),
    })
    .returning({ id: emailTemplates.id });

  return { mode: "created" as const, id: created.id };
}

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

async function getExistingPwaPushSettings() {
  await ensureHeroGovernanceSeedData();

  const [settings] = await db
    .select()
    .from(notificationChannelSettings)
    .where(eq(notificationChannelSettings.channel, "pwa_push"))
    .limit(1);

  if (settings) {
    return settings;
  }

  return getPwaPushSettingsData();
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
      message: "SMTP configuration saved successfully.",
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

export async function savePwaPushSettingsAction(
  _state: EmailSettingsActionState = INITIAL_STATE,
  formData: FormData,
): Promise<EmailSettingsActionState> {
  const parsed = pwaPushSettingsSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Konfigurasi PWA Push belum valid.",
    };
  }

  try {
    const existing = await getExistingPwaPushSettings();

    await db
      .update(notificationChannelSettings)
      .set({
        isEnabled: true,
        vapidPublicKey: parsed.data.vapidPublicKey,
        vapidPrivateKey: parsed.data.vapidPrivateKey,
        pushSubject: parsed.data.pushSubject,
        serviceWorkerPath: parsed.data.serviceWorkerPath,
        updatedAt: new Date(),
      })
      .where(eq(notificationChannelSettings.id, existing.id));

    revalidatePath("/dashboard/settings/email");

    return {
      status: "success",
      message: "PWA Push configuration saved successfully.",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menyimpan konfigurasi PWA Push.";
    return {
      status: "error",
      message,
    };
  }
}

export async function testPwaPushSettingsAction(
  _state: EmailSettingsActionState = INITIAL_STATE,
  formData: FormData,
): Promise<EmailSettingsActionState> {
  const parsed = pwaPushSettingsSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Konfigurasi PWA Push belum valid.",
    };
  }

  try {
    const session = await getServerSession();
    const email = session?.user?.email?.trim();

    if (!email) {
      return {
        status: "error",
        message: "Login dengan akun yang punya email agar test push bisa diarahkan.",
      };
    }

    const employee = await getEmployeeTargetByEmail(email);

    if (!employee) {
      return {
        status: "error",
        message: "Employee untuk akun login belum ditemukan.",
      };
    }

    const result = await sendPushNotification({
      employeeId: employee.id,
      category: "approval_requests",
      title: "HERO test push",
      body: "Konfigurasi PWA push aktif dan browser subscription terdeteksi.",
      url: "/mobile/notifications",
      tag: `hero-test-${employee.id}`,
      requirePreference: false,
      metadata: {
        source: "settings_email_test",
      },
    });

    if (result.status !== "sent") {
      return {
        status: "error",
        message: `Test push belum terkirim (${result.reason ?? "unknown"}). Pastikan browser sudah subscribe dan VAPID valid.`,
      };
    }

    return {
      status: "success",
      message: `Test push berhasil dikirim ke ${employee.email}.`,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Gagal mengirim test push.",
    };
  }
}

export async function saveEmailTemplateAction(
  _state: EmailSettingsActionState = INITIAL_STATE,
  formData: FormData,
): Promise<EmailSettingsActionState> {
  await ensureHeroGovernanceSeedData();

  const parsed = emailTemplateSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Template email belum valid.",
    };
  }

  const {
    intent,
    id,
    name,
    templateCode,
    templateType,
    deliveryChannel,
    recipientScope,
    ccEmail,
    subject,
    htmlContent,
    textContent,
    isActive,
  } = parsed.data;

  try {
    const existingWithCode = await db
      .select({ id: emailTemplates.id })
      .from(emailTemplates)
      .where(eq(emailTemplates.templateCode, templateCode))
      .limit(1);

    if (existingWithCode.length > 0 && existingWithCode[0]?.id !== id) {
      return {
        status: "error",
        message: "Template code is already used by another template.",
      };
    }

    if (intent === "create") {
      await db.insert(emailTemplates).values({
        name,
        templateCode,
        templateType,
        deliveryChannel,
        recipientScope,
        ccEmail,
        subject,
        htmlContent,
        textContent,
        isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      revalidatePath("/dashboard/settings/email");
      return {
        status: "success",
        message: "Email template created successfully.",
      };
    }

    if (!id) {
      return {
        status: "error",
        message: "ID template wajib ada untuk update.",
      };
    }

    await db
      .update(emailTemplates)
      .set({
        name,
        templateCode,
        templateType,
        deliveryChannel,
        recipientScope,
        ccEmail,
        subject,
        htmlContent,
        textContent,
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, id));

    revalidatePath("/dashboard/settings/email");
    return {
      status: "success",
      message: "Email template updated successfully.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan template email.";
    return {
      status: "error",
      message,
    };
  }
}

export async function toggleEmailTemplateActiveAction(
  _state: EmailSettingsActionState = INITIAL_STATE,
  formData: FormData,
): Promise<EmailSettingsActionState> {
  await ensureHeroGovernanceSeedData();

  const parsed = emailTemplateToggleSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Status template email belum valid.",
    };
  }

  try {
    await db
      .update(emailTemplates)
      .set({
        isActive: parsed.data.isActive,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, parsed.data.id));

    revalidatePath("/dashboard/settings/email");
    return {
      status: "success",
      message: parsed.data.isActive
        ? "Email template activated successfully."
        : "Email template deactivated successfully.",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mengubah status template email.";
    return {
      status: "error",
      message,
    };
  }
}

export async function restoreEmailTemplatePresetAction(
  _state: EmailSettingsActionState = INITIAL_STATE,
  formData: FormData,
): Promise<EmailSettingsActionState> {
  await ensureHeroGovernanceSeedData();

  const parsed = emailTemplatePresetSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Preset template belum valid.",
    };
  }

  try {
    await upsertEmailTemplateFromPreset(parsed.data.templateCode);
    revalidatePath("/dashboard/settings/email");

    return {
      status: "success",
      message: `Default preset ${parsed.data.templateCode} berhasil dipulihkan.`,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Gagal memulihkan default preset template.",
    };
  }
}

export async function syncEmailTemplatePresetsAction(
  _state: EmailSettingsActionState = INITIAL_STATE,
): Promise<EmailSettingsActionState> {
  await ensureHeroGovernanceSeedData();

  try {
    let createdCount = 0;
    let updatedCount = 0;

    for (const preset of EMAIL_TEMPLATE_PRESETS) {
      const result = await upsertEmailTemplateFromPreset(preset.templateCode);
      if (result.mode === "created") {
        createdCount += 1;
      } else {
        updatedCount += 1;
      }
    }

    revalidatePath("/dashboard/settings/email");

    return {
      status: "success",
      message: `Sync preset selesai. ${createdCount} dibuat, ${updatedCount} diperbarui.`,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Gagal sync preset template email.",
    };
  }
}

export async function sendTemplateTestAction(
  _state: EmailSettingsActionState = INITIAL_STATE,
  formData: FormData,
): Promise<EmailSettingsActionState> {
  const parsed = emailTemplateTestSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return {
      status: "error",
      message: "ID template tidak valid.",
    };
  }

  try {
    const session = await getServerSession();
    const recipient = session?.user?.email?.trim();

    if (!recipient) {
      return {
        status: "error",
        message: "Login dengan akun yang memiliki alamat email untuk test template.",
      };
    }

    const smtpConfig = await getExistingSmtpSettings();

    const transportSettings: EmailTransportSettings = {
      host: smtpConfig.host,
      port: smtpConfig.port,
      encryption: smtpConfig.encryption,
      username: smtpConfig.username,
      passwordSecret: smtpConfig.passwordSecret,
      fromEmail: smtpConfig.fromEmail,
      fromName: smtpConfig.fromName,
      replyToEmail: smtpConfig.replyToEmail,
      timeoutSeconds: smtpConfig.timeoutSeconds,
    };

    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, parsed.data.templateId))
      .limit(1);

    if (!template) {
      return {
        status: "error",
        message: "Template tidak ditemukan.",
      };
    }

    const subject = `[TEST] ${template.subject}`;
    const htmlNotice = `<div style="padding:8px 12px;margin-bottom:16px;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;font-size:13px;color:#92400e;"><strong>EMAIL TEST — Template: ${template.name}</strong><br>Email ini dikirim untuk tujuan pengujian template. Placeholder <code>{{variable}}</code> tidak akan dirender.</div>`;
    const textNotice = `[EMAIL TEST — Template: ${template.name}]\nEmail ini dikirim untuk tujuan pengujian template.\n\n`;

    const html = template.htmlContent
      ? `${htmlNotice}${template.htmlContent}`
      : `${htmlNotice}<p>Template tidak memiliki HTML content.</p>`;
    const text = template.textContent
      ? `${textNotice}${template.textContent}`
      : `${textNotice}Template tidak memiliki text content.`;

    await sendEmailViaSmtp(transportSettings, {
      to: recipient,
      subject,
      html,
      text,
      templateName: template.name,
      templateCode: template.templateCode,
      actorEmail: session?.user?.email ?? null,
    });

    revalidatePath("/dashboard/settings/email");

    return {
      status: "success",
      message: `Test template "${template.name}" berhasil dikirim ke ${recipient}.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengirim test template.";
    return {
      status: "error",
      message: `Test template gagal: ${message}`,
    };
  }
}

export async function saveHseSafetyNotificationConfigAction(
  _state: EmailSettingsActionState = INITIAL_STATE,
  formData: FormData,
): Promise<EmailSettingsActionState> {
  await ensureHeroGovernanceSeedData();

  const parsed = hseSafetyNotificationSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Konfigurasi penerima HSE Safety belum valid.",
    };
  }

  try {
    const [existing] = await db
      .select({ id: hseSafetyNotificationConfig.id })
      .from(hseSafetyNotificationConfig)
      .limit(1);

    const values = {
      recipientEmails: parsed.data.recipientEmails,
      ccEmails: parsed.data.ccEmails,
      isActive: parsed.data.isActive,
      updatedAt: new Date(),
    };

    if (existing) {
      await db
        .update(hseSafetyNotificationConfig)
        .set(values)
        .where(eq(hseSafetyNotificationConfig.id, existing.id));
    } else {
      await db.insert(hseSafetyNotificationConfig).values(values);
    }

    revalidatePath("/dashboard/settings/email");

    return {
      status: "success",
      message: "Penerima HSE Safety berhasil disimpan.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Gagal menyimpan penerima HSE Safety.",
    };
  }
}

export async function saveHumanCapitalNotificationConfigAction(
  _state: EmailSettingsActionState = INITIAL_STATE,
  formData: FormData,
): Promise<EmailSettingsActionState> {
  await ensureHeroGovernanceSeedData();

  const parsed = humanCapitalNotificationSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Konfigurasi penerima Human Capital belum valid.",
    };
  }

  try {
    const [existing] = await db
      .select({ id: hcNotificationConfig.id })
      .from(hcNotificationConfig)
      .limit(1);

    const values = {
      recipientEmails: parsed.data.recipientEmails,
      ccEmails: parsed.data.ccEmails,
      isActive: parsed.data.isActive,
      updatedAt: new Date(),
    };

    if (existing) {
      await db.update(hcNotificationConfig).set(values).where(eq(hcNotificationConfig.id, existing.id));
    } else {
      await db.insert(hcNotificationConfig).values(values);
    }

    revalidatePath("/dashboard/settings/email");

    return {
      status: "success",
      message: "Penerima Human Capital berhasil disimpan.",
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Gagal menyimpan penerima Human Capital.",
    };
  }
}
