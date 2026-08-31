"use client";

import * as React from "react";
import { startTransition, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  BellRing,
  BriefcaseBusiness,
  Check,
  CheckCheck,
  ChevronDown,
  FileSignature,
  ShieldAlert,
  Sparkles,
  Smartphone,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";

type NotificationPreferences = {
  pushEnabled: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  approvalRequestsEnabled: boolean;
  shiftRemindersEnabled: boolean;
  hseAlertsEnabled: boolean;
  pointsUpdatesEnabled: boolean;
};

type NotificationRow = {
  id: number;
  channel: string;
  recipient?: string | null;
  status: string;
  eventType: string | null;
  deliveryStatus?: string | null;
  payloadSnapshot?: string | null;
  createdAt: string;
  sentAt: string | null;
  errorMessage?: string | null;
  title?: string;
  body?: string;
  href?: string;
  readAt?: string | null;
  isRead?: boolean;
};

type NotificationApiPayload = {
  notifications: NotificationRow[];
  preferences: NotificationPreferences | null;
  pushPublicKey: string;
  pushConfigured: boolean;
  activeSubscriptions: number;
};

const categoryCards = [
  {
    key: "approvalRequestsEnabled",
    label: "Approval requests",
    description: "Push saat request baru atau reminder SLA masuk.",
    category: "approval_requests",
    icon: BellRing,
  },
  {
    key: "shiftRemindersEnabled",
    label: "Shift reminders",
    description: "Pengingat masuk shift dan attendance.",
    category: "shift_reminders",
    icon: BriefcaseBusiness,
  },
  {
    key: "hseAlertsEnabled",
    label: "HSE alerts",
    description: "Alert observasi/incident site yang perlu perhatian.",
    category: "hse_alerts",
    icon: ShieldAlert,
  },
  {
    key: "pointsUpdatesEnabled",
    label: "Points updates",
    description: "Perubahan poin, streak, dan leaderboard HERO.",
    category: "points_updates",
    icon: Sparkles,
  },
] as const;

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type NotificationPayload = Record<string, unknown> & {
  title?: unknown;
  body?: unknown;
  requestNumber?: unknown;
  activityTitle?: unknown;
  dueAt?: unknown;
  decision?: unknown;
  stepLevel?: unknown;
  mode?: unknown;
  groupStatus?: unknown;
  type?: unknown;
  impact?: unknown;
  location?: unknown;
};

function asText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function parsePayload(raw?: string | null) {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as NotificationPayload;
    }
  } catch {
    return { body: raw };
  }

  return null;
}

function humanizeToken(value?: string | null) {
  if (!value) return "";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatNotificationTitle(item: NotificationRow) {
  if (item.title?.trim()) {
    return item.title.trim();
  }

  const payload = parsePayload(item.payloadSnapshot);
  const payloadTitle = asText(payload?.title);
  if (payloadTitle) return payloadTitle;

  switch (item.eventType) {
    case "spl_assigned":
      return "SPL baru siap dikerjakan";
    case "step_assigned":
      return "Approval menunggu review";
    case "step_decision":
      return "Keputusan approval";
    case "approval_group_status":
    case "parallel_any_status":
      return "Status grup approval";
    case "submitted":
      return "Pengajuan terkirim";
    case "emergency_incident_reported":
      return "Emergency incident";
    case "points_updated":
      return "Update poin HERO";
    case "hse_observation_created":
      return "Alert observasi HSE";
    case "hse_observation_status_changed":
      return "Update observasi HSE";
    case "hse_incident_created":
      return "Incident HSE baru";
    case "hse_incident_status_changed":
      return "Update incident HSE";
    default:
      return humanizeToken(item.eventType ?? item.channel) || "Update HERO";
  }
}

function formatNotificationBody(item: NotificationRow) {
  if (item.body?.trim()) {
    return item.body.trim();
  }

  const payload = parsePayload(item.payloadSnapshot);
  const payloadBody = asText(payload?.body);
  if (payloadBody) return payloadBody;

  const requestNumber = asText(payload?.requestNumber);
  const activityTitle = asText(payload?.activityTitle);
  const dueAt = asText(payload?.dueAt);
  const decision = humanizeToken(asText(payload?.decision));
  const stepLevel = asText(payload?.stepLevel);
  const mode = humanizeToken(asText(payload?.mode));
  const groupStatus = humanizeToken(asText(payload?.groupStatus));
  const title = asText(payload?.title);
  const type = humanizeToken(asText(payload?.type));
  const impact = asText(payload?.impact);
  const location = asText(payload?.location);

  switch (item.eventType) {
    case "spl_assigned":
      return payloadBody || "Ada SPL baru yang perlu diisi evidence kerja lapangan.";
    case "step_assigned": {
      const titlePart = activityTitle ? ` untuk ${activityTitle}` : "";
      const duePart = dueAt ? ` Batas waktu ${formatDate(dueAt)}.` : "";
      return `${requestNumber || "Request baru"} menunggu review${titlePart}.${duePart}`;
    }
    case "step_decision": {
      const titlePart = activityTitle ? ` untuk ${activityTitle}` : "";
      const decisionPart = decision ? decision.toLowerCase() : "baru";
      return `${requestNumber || "Request"} mendapat keputusan ${decisionPart}${titlePart}.`;
    }
    case "approval_group_status":
    case "parallel_any_status": {
      const stepPart = stepLevel ? `Step ${stepLevel}` : "Approval";
      const modePart = mode ? ` (${mode})` : "";
      const statusPart = groupStatus ? ` status ${groupStatus.toLowerCase()}` : " diperbarui";
      return `${stepPart}${modePart}${statusPart}.`;
    }
    case "emergency_incident_reported": {
      const titlePart = title || "Incident baru";
      const typePart = type ? ` - ${type}` : "";
      const locationPart = location ? ` di ${location}` : "";
      const impactPart = impact ? ` Dampak: ${impact}.` : "";
      return `${titlePart}${typePart}${locationPart}.${impactPart}`;
    }
    default:
      return (
        [requestNumber, activityTitle || title, location, impact].filter(Boolean).join(" - ") ||
        item.errorMessage ||
        `Status ${humanizeToken(item.status).toLowerCase()} via ${humanizeToken(item.channel)}.`
      );
  }
}

function getNotificationDisplayKey(item: NotificationRow) {
  return [
    item.eventType ?? item.channel,
    item.title || item.payloadSnapshot || item.errorMessage || "",
    item.body || "",
    formatDate(item.sentAt ?? item.createdAt),
  ].join("|");
}

function getNotificationActionLabel(item: NotificationRow) {
  if (item.eventType?.startsWith("spl_")) {
    return item.eventType === "spl_assigned" || item.eventType === "spl_approved" ? "Kerjakan" : "Lihat SPL";
  }

  if ((item.href || "").includes("/approval")) {
    return "Review";
  }

  return "Open";
}

function getNotificationIcon(item: NotificationRow) {
  switch (item.eventType) {
    case "spl_assigned":
      return FileSignature;
    case "points_updated":
      return Sparkles;
    case "hse_observation_created":
    case "hse_observation_status_changed":
    case "hse_incident_created":
    case "hse_incident_status_changed":
    case "emergency_incident_reported":
      return ShieldAlert;
    case "step_assigned":
    case "step_decision":
      return BellRing;
    default:
      return Bell;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; ++index) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

async function getPushServiceWorkerRegistration() {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}

export function MobileNotificationsCenter({
  initialData,
}: {
  initialData: NotificationApiPayload;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window === "undefined" || typeof Notification === "undefined"
      ? "default"
      : Notification.permission,
  );
  const [feedback, setFeedback] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotificationActionBusy, setIsNotificationActionBusy] = useState(false);

  const refreshData = React.useCallback(async () => {
    const response = await fetch("/api/mobile/notifications", { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const next = (await response.json()) as NotificationApiPayload;
    startTransition(() => setData(next));
  }, []);

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }

    const interval = window.setInterval(() => {
      void refreshData();
    }, 20000);

    return () => window.clearInterval(interval);
  }, [refreshData]);

  async function runNotificationAction(action: "mark-read" | "clear", options?: { ids?: number[]; scope?: "all" }) {
    setIsNotificationActionBusy(true);
    setFeedback("");

    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          ids: options?.ids,
          scope: options?.scope,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Aksi notifikasi gagal.");
      }

      await refreshData();
      window.dispatchEvent(new Event("hero:notifications-updated"));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Aksi notifikasi gagal.");
    } finally {
      setIsNotificationActionBusy(false);
    }
  }

  async function updatePreferences(patch: Partial<NotificationPreferences>) {
    setIsBusy(true);
    setFeedback("");

    try {
      const response = await fetch("/api/mobile/notifications/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Gagal menyimpan preferensi.");
      }

      const payload = (await response.json()) as { preferences: NotificationPreferences };
      startTransition(() =>
        setData((current) => ({
          ...current,
          preferences: payload.preferences,
        })),
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Gagal menyimpan preferensi.");
    } finally {
      setIsBusy(false);
    }
  }

  async function enablePush() {
    if (typeof Notification === "undefined") {
      setFeedback("Browser ini belum mendukung Notification API.");
      return;
    }

    if (!("serviceWorker" in navigator)) {
      setFeedback("Browser ini belum mendukung service worker untuk web push.");
      return;
    }

    if (!data.pushConfigured || !data.pushPublicKey) {
      setFeedback("VAPID push belum diisi admin. Lengkapi PWA Push Settings dulu.");
      return;
    }

    setIsBusy(true);
    setFeedback("");

    try {
      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);

      if (nextPermission !== "granted") {
        setFeedback("Izin notifikasi belum diberikan browser.");
        return;
      }

      const registration = await getPushServiceWorkerRegistration();
      if (!registration) {
        setFeedback("Service worker push belum siap. Refresh halaman lalu coba lagi.");
        return;
      }

      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.pushPublicKey),
        }));

      const response = await fetch("/api/push/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "subscribe",
          subscription: subscription.toJSON(),
          deviceLabel: navigator.platform || "Browser",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Gagal menyimpan subscription.");
      }

      await updatePreferences({ pushEnabled: true });
      await refreshData();
      setFeedback("Push notifications aktif di device ini.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Gagal mengaktifkan push.");
    } finally {
      setIsBusy(false);
    }
  }

  async function disablePush() {
    setIsBusy(true);
    setFeedback("");

    try {
      const registrations = "serviceWorker" in navigator
        ? await navigator.serviceWorker.getRegistrations()
        : [];
      const registration = registrations[0];
      const subscription = registration ? await registration.pushManager.getSubscription() : null;

      if (subscription) {
        await fetch("/api/push/subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "unsubscribe",
            subscription: subscription.toJSON(),
          }),
        });

        await subscription.unsubscribe();
      }

      await updatePreferences({ pushEnabled: false });
      await refreshData();
      setFeedback("Push notifications dimatikan untuk device ini.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Gagal mematikan push.");
    } finally {
      setIsBusy(false);
    }
  }

  async function sendTestPush(category: (typeof categoryCards)[number]["category"]) {
    setIsBusy(true);
    setFeedback("");

    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ category }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        throw new Error(payload.message ?? "Test push gagal.");
      }

      setFeedback("Test push terkirim.");
      await refreshData();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Test push gagal.");
    } finally {
      setIsBusy(false);
    }
  }

  const preferences = data.preferences;
  const visibleNotifications = data.notifications.filter((item, index, notifications) => {
    const displayKey = getNotificationDisplayKey(item);
    return notifications.findIndex((candidate) => getNotificationDisplayKey(candidate) === displayKey) === index;
  });
  const unreadCount = visibleNotifications.filter((item) => !item.isRead).length;
  const unreadSplNotifications = visibleNotifications.filter(
    (item) => item.eventType === "spl_assigned" && !item.isRead,
  );

  async function openNotification(item: NotificationRow) {
    if (!item.isRead) {
      await runNotificationAction("mark-read", { ids: [item.id] });
    }

    router.push(item.href || "/mobile/notifications");
  }

  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Signal Queue</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">Notifikasi Saya</h1>
      </section>

      <section className="rounded-[1.35rem] bg-[#003f78] p-5 text-white shadow-[0_20px_42px_rgba(0,63,120,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge className="border-0 bg-white/16 text-white">
              <Smartphone className="mr-1 size-3" />
              Web Push
            </Badge>
            <p className="mt-3 text-2xl font-black tracking-tight">
              {data.pushConfigured ? "Realtime alerts ready" : "Push config pending"}
            </p>
            <p className="mt-2 max-w-[18rem] text-sm font-medium leading-6 text-[#d9ebf8]">
              Approval, shift, HSE, dan points update bisa dikirim ke device aktif.
            </p>
          </div>
          <div className="rounded-[1.2rem] bg-white/10 px-4 py-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#b9dff6]">Devices</p>
            <p className="mt-2 text-3xl font-black leading-none">{data.activeSubscriptions}</p>
            <p className="mt-2 text-[11px] font-semibold text-[#d9ebf8]">Permission: {permission}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={isBusy || !data.pushConfigured}
            onClick={() => void enablePush()}
            className="min-h-12 rounded-2xl bg-white text-[#003f78] hover:bg-white/90"
          >
            Enable push
          </Button>
          <Button
            type="button"
            disabled={isBusy}
            onClick={() => void disablePush()}
            variant="outline"
            className="min-h-12 rounded-2xl border-white/30 bg-transparent text-white hover:bg-white/10"
          >
            Disable push
          </Button>
        </div>
      </section>

      {feedback ? (
        <div className="rounded-[1.1rem] bg-[#e9f6fd] px-4 py-3 text-sm font-semibold text-[#003f78]">
          {feedback}
        </div>
      ) : null}

      {unreadSplNotifications.length > 0 ? (
        <section className="rounded-[1.35rem] bg-[#5a2200] p-4 text-white shadow-[0_20px_42px_rgba(90,34,0,0.22)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f7d7bf]">SPL Alert</p>
              <h2 className="mt-1 text-lg font-black leading-tight">
                {unreadSplNotifications.length} SPL perlu evidence
              </h2>
              <p className="mt-2 text-xs font-semibold leading-5 text-[#f4e4d7]">
                {formatNotificationBody(unreadSplNotifications[0])}
              </p>
            </div>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/14 text-white">
              <FileSignature className="size-5" />
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={isNotificationActionBusy}
              onClick={() => void openNotification(unreadSplNotifications[0])}
              className="min-h-12 rounded-2xl bg-white px-4 text-[#5a2200] hover:bg-white/90"
            >
              Kerjakan sekarang
              <ArrowRight className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isNotificationActionBusy}
              onClick={() =>
                void runNotificationAction("mark-read", {
                  ids: unreadSplNotifications.map((item) => item.id),
                })
              }
              className="min-h-12 rounded-2xl border-white/30 bg-transparent px-4 text-white hover:bg-white/10"
            >
              Tandai dibaca
            </Button>
          </div>
        </section>
      ) : null}

      <Collapsible open={isSettingsOpen} onOpenChange={setIsSettingsOpen} className="space-y-3">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded-[1.2rem] bg-white px-4 py-3 text-left shadow-[0_14px_32px_rgba(8,32,51,0.08)]"
          >
            <span>
              <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">
                Setting Notifikasi
              </span>
              <span className="mt-1 block text-sm font-black text-[#082033]">Kategori alert per user</span>
            </span>
            <ChevronDown
              className={`size-5 shrink-0 text-[#003f78] transition-transform ${isSettingsOpen ? "rotate-180" : ""}`}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3">
          {preferences ? (
            <>
              <article className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[#082033]">Push notifications</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[#486275]">
                      Kirim alert ke browser/mobile yang sudah subscribe.
                    </p>
                  </div>
                  <Switch
                    checked={preferences.pushEnabled}
                    disabled={isBusy}
                    onCheckedChange={(checked) => void updatePreferences({ pushEnabled: checked })}
                  />
                </div>
              </article>

              {categoryCards.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.key}
                    className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#e9f6fd] text-[#003f78]">
                          <Icon className="size-5" />
                        </span>
                        <div>
                          <p className="text-sm font-black text-[#082033]">{item.label}</p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-[#486275]">{item.description}</p>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void sendTestPush(item.category)}
                            className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-[#003f78]"
                          >
                            Send test
                          </button>
                        </div>
                      </div>
                      <Switch
                        checked={preferences[item.key]}
                        disabled={isBusy}
                        onCheckedChange={(checked) => {
                          const patch = {
                            [item.key]: checked,
                          } as Partial<NotificationPreferences>;
                          void updatePreferences(patch);
                        }}
                      />
                    </div>
                  </article>
                );
              })}
            </>
          ) : (
            <div className="rounded-[1.2rem] bg-white p-5 text-sm font-semibold text-[#486275] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
              Employee profile belum tersedia. Preference belum bisa dipakai.
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Recent Alerts</p>
            <p className="mt-1 text-xs font-semibold text-[#486275]">
              {unreadCount} unread · {visibleNotifications.length} total
            </p>
          </div>
          {visibleNotifications.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isNotificationActionBusy || unreadCount === 0}
                onClick={() => void runNotificationAction("mark-read", { scope: "all" })}
                className="h-9 rounded-xl border-0 bg-white px-3 text-[11px] font-black uppercase tracking-[0.1em] text-[#003f78] shadow-[0_10px_24px_rgba(8,32,51,0.08)]"
              >
                <CheckCheck className="size-4" />
                Read all
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isNotificationActionBusy}
                onClick={() => void runNotificationAction("clear", { scope: "all" })}
                className="h-9 rounded-xl border-0 bg-white px-3 text-[11px] font-black uppercase tracking-[0.1em] text-[#5a2200] shadow-[0_10px_24px_rgba(8,32,51,0.08)]"
              >
                <Trash2 className="size-4" />
                Clear
              </Button>
            </div>
          ) : null}
        </div>
        {visibleNotifications.map((item) => (
          <article
            key={item.id}
            className="flex items-start gap-3 rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)]"
          >
            <span
              className={`flex size-11 items-center justify-center rounded-2xl ${
                item.eventType === "spl_assigned"
                  ? "bg-[#f6dfcf] text-[#5a2200]"
                  : "bg-[#e9f6fd] text-[#003f78]"
              }`}
            >
              {(() => {
                const Icon = getNotificationIcon(item);
                return <Icon className="size-5" />;
              })()}
            </span>
            <div className="min-w-0 flex-1 space-y-3">
              <button
                type="button"
                disabled={isNotificationActionBusy || !item.href}
                onClick={() => void openNotification(item)}
                className="w-full text-left disabled:cursor-default"
              >
                <p className="text-sm font-black text-[#082033]">{formatNotificationTitle(item)}</p>
                <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#486275]">
                  {formatNotificationBody(item)}
                </p>
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">
                  {formatDate(item.sentAt ?? item.createdAt)}
                </p>
              </button>
              {item.href ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isNotificationActionBusy}
                  onClick={() => void openNotification(item)}
                  className={`h-9 rounded-xl border-0 px-3 text-[11px] font-black uppercase tracking-[0.08em] shadow-[0_10px_24px_rgba(8,32,51,0.08)] ${
                    item.eventType === "spl_assigned"
                      ? "bg-[#5a2200] text-white hover:bg-[#6b2a00]"
                      : "bg-[#e9f6fd] text-[#003f78] hover:bg-[#dceef9]"
                  }`}
                >
                  {getNotificationActionLabel(item)}
                  <ArrowRight className="size-4" />
                </Button>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {item.isRead ? (
                <Badge className="border-0 bg-[#eaf4fb] text-[#003f78]">Read</Badge>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isNotificationActionBusy}
                  onClick={() => void runNotificationAction("mark-read", { ids: [item.id] })}
                  className="h-8 rounded-xl px-2 text-[11px] font-black text-[#003f78]"
                >
                  <Check className="size-4" />
                  Read
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isNotificationActionBusy}
                onClick={() => void runNotificationAction("clear", { ids: [item.id] })}
                className="h-8 rounded-xl px-2 text-[11px] font-black text-[#5a2200]"
              >
                <Trash2 className="size-4" />
                Clear
              </Button>
            </div>
          </article>
        ))}
        {visibleNotifications.length === 0 ? (
          <div className="rounded-[1.2rem] bg-white p-5 text-center text-sm font-semibold text-[#486275] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            Belum ada notifikasi untuk akun ini.
          </div>
        ) : null}
      </section>
    </div>
  );
}
