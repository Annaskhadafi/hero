"use server";

import { and, eq, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  employees,
  hseIncidents,
  hseObservations,
  notificationDeliveries,
  notificationEvents,
  sites,
} from "@/db/schema/hero";
import { auth } from "@/lib/auth";
import { sendEmailViaSmtp } from "@/lib/email-delivery";
import { ensureHeroGovernanceSeedData, getEmailSmtpSettingsData } from "@/lib/hero-admin";
import type {
  EmergencyIncidentSyncPayload,
  HseObservationSyncPayload,
  QueuedFilePayload,
} from "@/lib/offline-sync";
import { uploadAnyFileToS3 } from "@/lib/s3-storage";

async function getAuthenticatedEmployee() {
  await ensureHeroGovernanceSeedData();

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.email) {
    throw new Error("Login session not found.");
  }

  const [employee] = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      siteId: employees.siteId,
      directManagerId: employees.directManagerId,
      siteName: sites.name,
    })
    .from(employees)
    .innerJoin(sites, eq(employees.siteId, sites.id))
    .where(sql`lower(${employees.email}) = ${session.user.email.trim().toLowerCase()}`)
    .limit(1);

  if (!employee) {
    throw new Error("Employee profile not found.");
  }

  return employee;
}

const MAX_OFFLINE_IMAGE_BYTES = 5 * 1024 * 1024;

function dataUrlToFile(file: QueuedFilePayload, fallbackName: string) {
  const matches = file.dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Offline photo payload is invalid.");
  }

  const [, mimeType, base64] = matches;
  const resolvedType = (file.type || mimeType).trim();

  if (!resolvedType.startsWith("image/")) {
    throw new Error("Emergency file must be an image.");
  }

  if (file.size > MAX_OFFLINE_IMAGE_BYTES) {
    throw new Error("Emergency photo size max 5MB.");
  }

  const buffer = Buffer.from(base64, "base64");

  return new File([buffer], file.name || fallbackName, {
    type: resolvedType,
  });
}

function normalizeSyncText(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}

function normalizeCoordinate(value: string) {
  return value.trim();
}

async function createNotificationDelivery(input: {
  recipient: string;
  channel: string;
  eventType: string;
  payloadSnapshot: string;
  status: string;
  errorMessage?: string;
}) {
  const [event] = await db
    .insert(notificationEvents)
    .values({
      channel: input.channel,
      eventType: input.eventType,
      recipient: input.recipient,
      payloadSnapshot: input.payloadSnapshot,
      deliveryStatus: input.status,
      deliveredAt: input.status === "sent" ? new Date() : null,
    })
    .returning({ id: notificationEvents.id });

  await db.insert(notificationDeliveries).values({
    notificationEventId: event.id,
    deliveryChannel: input.channel,
    recipient: input.recipient,
    status: input.status,
    errorMessage: input.errorMessage,
    sentAt: input.status === "sent" ? new Date() : null,
  });
}

async function resolveEmergencyRecipients(employee: {
  id: number;
  siteId: number;
  directManagerId: number | null;
}) {
  const recipients = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
    })
    .from(employees)
    .where(
      and(
        eq(employees.siteId, employee.siteId),
        eq(employees.isActive, true),
        or(
          eq(employees.id, employee.directManagerId ?? -1),
          sql`lower(${employees.accessRole}) in ('site admin', 'super admin', 'hc manager')`,
          sql`lower(${employees.role}) like '%manager%'`,
          sql`lower(${employees.role}) like '%supervisor%'`,
        ),
      ),
    );

  const seen = new Set<string>();

  return recipients.filter((recipient) => {
    const key = recipient.email.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function sendEmergencyAlerts(input: {
  incidentId: number;
  siteName: string;
  reporterName: string;
  reporterEmail: string;
  title: string;
  type: string;
  impact: string;
  location: string;
  notes: string;
  recipients: Array<{ email: string; name: string }>;
}) {
  if (input.recipients.length === 0) {
    return "no_recipient";
  }

  const payloadSnapshot = JSON.stringify({
    incidentId: input.incidentId,
    title: input.title,
    type: input.type,
    impact: input.impact,
    location: input.location,
  });

  const smtpSettings = await getEmailSmtpSettingsData();
  const canSendEmail = smtpSettings.host.trim().length > 0 && smtpSettings.fromEmail.trim().length > 0;
  let sentCount = 0;

  for (const recipient of input.recipients) {
    await createNotificationDelivery({
      recipient: recipient.email,
      channel: "bell",
      eventType: "emergency_incident_reported",
      payloadSnapshot,
      status: "queued",
    });

    if (!canSendEmail) {
      await createNotificationDelivery({
        recipient: recipient.email,
        channel: "email",
        eventType: "emergency_incident_reported",
        payloadSnapshot,
        status: "queued",
        errorMessage: "SMTP belum dikonfigurasi.",
      });
      continue;
    }

    const subject = `[HERO] Emergency alert - ${input.siteName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2 style="margin-bottom: 12px;">Emergency incident reported</h2>
        <p><strong>Site:</strong> ${input.siteName}</p>
        <p><strong>Reporter:</strong> ${input.reporterName}</p>
        <p><strong>Title:</strong> ${input.title}</p>
        <p><strong>Type:</strong> ${input.type}</p>
        <p><strong>Impact:</strong> ${input.impact}</p>
        <p><strong>Location:</strong> ${input.location}</p>
        <p><strong>Notes:</strong> ${input.notes || "-"}</p>
      </div>
    `;
    const text = [
      "Emergency incident reported",
      `Site: ${input.siteName}`,
      `Reporter: ${input.reporterName}`,
      `Title: ${input.title}`,
      `Type: ${input.type}`,
      `Impact: ${input.impact}`,
      `Location: ${input.location}`,
      `Notes: ${input.notes || "-"}`,
    ].join("\n");

    try {
      await sendEmailViaSmtp(smtpSettings, {
        to: recipient.email,
        subject,
        html,
        text,
        templateName: "Emergency Incident Alert",
        templateCode: "emergency_incident_alert",
        actorEmail: input.reporterEmail,
      });

      await createNotificationDelivery({
        recipient: recipient.email,
        channel: "email",
        eventType: "emergency_incident_reported",
        payloadSnapshot,
        status: "sent",
      });
      sentCount += 1;
    } catch (error) {
      await createNotificationDelivery({
        recipient: recipient.email,
        channel: "email",
        eventType: "emergency_incident_reported",
        payloadSnapshot,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Email alert failed.",
      });
    }
  }

  return sentCount > 0 ? "sent" : "queued";
}

export async function submitHseObservationFromPayload(payload: HseObservationSyncPayload) {
  const employee = await getAuthenticatedEmployee();
  const title = normalizeSyncText(payload.title, 160);
  const category = normalizeSyncText(payload.category, 80);
  const severity = normalizeSyncText(payload.severity, 40);
  const location = normalizeSyncText(payload.location, 160);
  const notes = normalizeSyncText(payload.notes, 1200);
  const latitude = normalizeCoordinate(payload.latitude);
  const longitude = normalizeCoordinate(payload.longitude);

  const [record] = await db
    .insert(hseObservations)
    .values({
      siteId: employee.siteId,
      employeeId: employee.id,
      category,
      title,
      location,
      severity,
      status: "open",
      notes: [
        notes,
        latitude && longitude
          ? `GPS ${latitude}, ${longitude}`
          : null,
      ]
        .filter(Boolean)
        .join(" | "),
      observedAt: new Date(),
    })
    .returning({ id: hseObservations.id });

  revalidatePath("/mobile/hse");
  revalidatePath("/dashboard/hse");

  return {
    id: record.id,
    message: "HSE observation saved successfully.",
  };
}

export async function submitEmergencyIncidentFromPayload(payload: EmergencyIncidentSyncPayload) {
  const employee = await getAuthenticatedEmployee();
  const clientRequestId = normalizeSyncText(payload.clientRequestId ?? "", 120);
  const title = normalizeSyncText(payload.title, 160);
  const type = normalizeSyncText(payload.type, 80);
  const impact = normalizeSyncText(payload.impact, 80);
  const status = normalizeSyncText(payload.status, 40);
  const unitNumber = normalizeSyncText(payload.unitNumber, 80) || "-";
  const location = normalizeSyncText(payload.location, 160);
  const notes = normalizeSyncText(payload.notes, 1200);
  const latitude = normalizeCoordinate(payload.latitude);
  const longitude = normalizeCoordinate(payload.longitude);
  if (clientRequestId) {
    const [existingIncident] = await db
      .select({
        id: hseIncidents.id,
        alertStatus: hseIncidents.alertStatus,
      })
      .from(hseIncidents)
      .where(
        and(
          eq(hseIncidents.employeeId, employee.id),
          eq(hseIncidents.clientRequestId, clientRequestId),
        ),
      )
      .limit(1);

    if (existingIncident) {
      return {
        id: existingIncident.id,
        alertStatus: existingIncident.alertStatus,
        message: "Emergency report sudah pernah disinkronkan sebelumnya.",
      };
    }
  }

  let photoUrl = "";

  if (payload.photo) {
    const file = dataUrlToFile(payload.photo, `emergency-${Date.now()}.jpg`);
    const uploaded = await uploadAnyFileToS3(file, "emergency-reports");
    photoUrl = uploaded.url;
  }

  const [incident] = await db
    .insert(hseIncidents)
    .values({
      siteId: employee.siteId,
      employeeId: employee.id,
      type,
      title,
      unitNumber,
      impact,
      location,
      latitude,
      longitude,
      notes,
      photoUrl,
      clientRequestId: clientRequestId || null,
      alertStatus: "pending",
      status,
      reportedAt: new Date(),
    })
    .returning({ id: hseIncidents.id });

  const recipients = await resolveEmergencyRecipients(employee);
  const alertStatus = await sendEmergencyAlerts({
    incidentId: incident.id,
    siteName: employee.siteName,
    reporterName: employee.name,
    reporterEmail: employee.email,
    title: payload.title,
    type: payload.type,
    impact: payload.impact,
    location: payload.location,
    notes: payload.notes,
    recipients,
  });

  await db
    .update(hseIncidents)
    .set({
      alertStatus,
    })
    .where(eq(hseIncidents.id, incident.id));

  revalidatePath("/mobile/hse");
  revalidatePath("/dashboard/hse");

  return {
    id: incident.id,
    alertStatus,
    message:
      alertStatus === "sent"
        ? "Emergency report tersimpan dan alert supervisor/management sudah dikirim."
        : "Emergency report tersimpan. Alert masuk queue untuk supervisor/management.",
  };
}
