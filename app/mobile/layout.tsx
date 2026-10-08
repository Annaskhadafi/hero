import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/mobile-app-shell";
import { getServerSession } from "@/lib/auth-session";
import { getMobileNotificationCount } from "@/lib/mobile-data";
import { MobileBroadcastPopup } from "@/components/mobile/mobile-broadcast-popup";
import { getEligibleBroadcastsForMobile } from "@/app/actions/broadcast";
import { getSidebarDataForUser } from "@/lib/hero-admin";
import { buildMobileAllowedLinks } from "@/lib/mobile-access";
import { FaceRegistrationReminderPopup } from "@/components/face-registration-reminder-popup";
import { getEmployeeDisplayDataByEmail } from "@/lib/hero-admin";
import { getUserMobilePermissions } from "@/lib/mobile-permissions";
import { MobilePermissionProvider } from "@/components/mobile/permission-provider";

import { isRedirectError } from "next/dist/client/components/redirect-error";

import "@/app/dashboard/theme.css";

export const metadata: Metadata = {
  title: "HERO Mobile",
  description: "Mobile workspace for HERO field operations.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f6fbff",
};

export const dynamic = "force-dynamic";

export default async function MobileLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  let notificationCount = 0;
  let eligibleBroadcasts: Awaited<ReturnType<typeof getEligibleBroadcastsForMobile>> = [];
  let allowedLinks: ReturnType<typeof buildMobileAllowedLinks> = buildMobileAllowedLinks([]);
  let permissions = {};
  let isFaceRegistered = true;
  let employeeId = null;
  let siteId = null;

  const email = session.user.email;

  const timeoutFallback = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]);
  };

  try {
    const [notifRes, broadcastRes, sidebarRes, permRes, empRes] = await Promise.allSettled([
      email ? timeoutFallback(getMobileNotificationCount(email), 3500, 0) : Promise.resolve(0),
      timeoutFallback(getEligibleBroadcastsForMobile(), 3500, []),
      email ? timeoutFallback(getSidebarDataForUser(email), 3500, { navMain: [], navSecondary: [], documents: [] } as any) : Promise.resolve({ navMain: [], navSecondary: [], documents: [] }),
      email ? timeoutFallback(getUserMobilePermissions(email), 3500, {}) : Promise.resolve({}),
      email ? timeoutFallback(getEmployeeDisplayDataByEmail(email, session.user.id), 3500, null) : Promise.resolve(null),
    ]);

    if (notifRes.status === "fulfilled") notificationCount = notifRes.value;
    if (broadcastRes.status === "fulfilled") eligibleBroadcasts = broadcastRes.value;

    if (sidebarRes.status === "fulfilled" && sidebarRes.value) {
      const sidebarData = sidebarRes.value;
      allowedLinks = buildMobileAllowedLinks([
        ...(sidebarData.navMain || []),
        ...(sidebarData.navSecondary || []),
        ...(sidebarData.documents || []),
      ]);
    }

    if (permRes.status === "fulfilled" && permRes.value) permissions = permRes.value;

    if (empRes.status === "fulfilled" && empRes.value) {
      const empData = empRes.value;
      if (empData && (empData.isActive === false || empData.employmentStatus === "inactive")) {
        redirect("/sign-in?error=account_deactivated");
      }
      isFaceRegistered = !!(empData?.faceRegisteredAt || empData?.faceRarayRegisteredAt);
      employeeId = empData?.id;
      siteId = empData?.siteId;
    }
  } catch (err) {
    if (isRedirectError(err) || (err as any)?.digest?.includes("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("[mobile/layout] Parallel layout fetch error:", err);
  }

  return (
    <MobilePermissionProvider permissions={permissions}>
      <MobileAppShell
        userName={session.user.name || session.user.email || "HERO User"}
        notificationCount={notificationCount}
        allowedLinks={allowedLinks}
      >
        {children}
        <MobileBroadcastPopup initialBroadcasts={eligibleBroadcasts} />
        <FaceRegistrationReminderPopup 
          isRegistered={isFaceRegistered} 
          employeeId={employeeId}
          siteId={siteId}
        />
      </MobileAppShell>
    </MobilePermissionProvider>
  );
}
