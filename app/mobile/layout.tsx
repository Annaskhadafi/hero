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

  try {
    notificationCount = session.user.email
      ? await getMobileNotificationCount(session.user.email)
      : 0;
  } catch (err) {
    console.error("[mobile/layout] getMobileNotificationCount failed:", err);
  }

  try {
    eligibleBroadcasts = await getEligibleBroadcastsForMobile();
  } catch (err) {
    console.error("[mobile/layout] getEligibleBroadcastsForMobile failed:", err);
  }

  let permissions = {};

  try {
    if (session.user.email) {
      const sidebarData = await getSidebarDataForUser(session.user.email);
      allowedLinks = buildMobileAllowedLinks([
        ...sidebarData.navMain,
        ...sidebarData.navSecondary,
        ...sidebarData.documents,
      ]);
      permissions = await getUserMobilePermissions(session.user.email);
    }
  } catch (err) {
    console.error("[mobile/layout] getSidebarDataForUser failed:", err);
  }

  let isFaceRegistered = true;
  let employeeId = null;
  let siteId = null;
  if (session.user.email) {
    try {
      const empData = await getEmployeeDisplayDataByEmail(session.user.email);
      if (empData && (empData.isActive === false || empData.employmentStatus === 'inactive')) {
        redirect('/sign-in?error=account_deactivated');
      }
      isFaceRegistered = !!(empData?.faceRegisteredAt || empData?.faceRarayRegisteredAt);
      employeeId = empData?.id;
      siteId = empData?.siteId;
    } catch (err) {
      if ((err as any)?.digest?.startsWith('NEXT_REDIRECT')) {
        throw err;
      }
      console.error("[mobile/layout] getEmployeeDisplayDataByEmail failed:", err);
    }
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
