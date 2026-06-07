"use server";

import { db } from "@/db";
import { hcEmailTemplates, emailDeliveryLogs } from "@/db/schema/hero";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { HC_TEMPLATE_CODES } from "@/lib/hc-email-utils";

export type HcEmailTemplateData = {
  name: string;
  type: string;
  subject: string;
  body: string;
  isActive?: boolean;
};

async function ensureHcEmailTemplatesTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_hc_email_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  } catch {
    // table already exists or race condition, ignore
  }
}

export async function getHcEmailTemplates() {
  await ensureHcEmailTemplatesTable();
  return await db.select().from(hcEmailTemplates).orderBy(desc(hcEmailTemplates.createdAt));
}

export async function getHcEmailTemplateByType(type: string) {
  await ensureHcEmailTemplatesTable();
  const [tmpl] = await db
    .select()
    .from(hcEmailTemplates)
    .where(eq(hcEmailTemplates.type, type))
    .limit(1);
  return tmpl ?? null;
}

export async function ensureHcEmailTable() {
  await ensureHcEmailTemplatesTable();
}

export async function saveHcEmailTemplate(id: number | null, data: HcEmailTemplateData) {
  await ensureHcEmailTemplatesTable();
  if (id) {
    const [updated] = await db
      .update(hcEmailTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(hcEmailTemplates.id, id))
      .returning();
    revalidatePath("/dashboard/hc/settings/email-templates");
    return updated;
  }
  const [created] = await db.insert(hcEmailTemplates).values(data).returning();
  revalidatePath("/dashboard/hc/settings/email-templates");
  return created;
}

export async function deleteHcEmailTemplate(id: number) {
  await ensureHcEmailTemplatesTable();
  await db.delete(hcEmailTemplates).where(eq(hcEmailTemplates.id, id));
  revalidatePath("/dashboard/hc/settings/email-templates");
  return { success: true };
}

export async function getHcEmailDeliveryLogs(limit = 20) {
  const logs = await db
    .select({
      id: emailDeliveryLogs.id,
      toEmail: emailDeliveryLogs.toEmail,
      subject: emailDeliveryLogs.subject,
      templateCode: emailDeliveryLogs.templateCode,
      templateName: emailDeliveryLogs.templateName,
      status: emailDeliveryLogs.status,
      errorMessage: emailDeliveryLogs.errorMessage,
      sentAt: emailDeliveryLogs.sentAt,
      createdAt: emailDeliveryLogs.createdAt,
    })
    .from(emailDeliveryLogs)
    .where(inArray(emailDeliveryLogs.templateCode, HC_TEMPLATE_CODES))
    .orderBy(desc(emailDeliveryLogs.createdAt))
    .limit(limit);

  return logs;
}
