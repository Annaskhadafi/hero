import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { MobileAppShell } from "@/components/mobile/mobile-app-shell";
import { getServerSession } from "@/lib/auth-session";
import { getMobileNotificationCount } from "@/lib/mobile-data";
import { MobileBroadcastPopup } from "@/components/mobile/mobile-broadcast-popup";
import { getEligibleBroadcastsForMobile } from "@/app/actions/broadcast";

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

  return (
    <MobileAppShell
      userName={session.user.name || session.user.email || "HERO User"}
      notificationCount={notificationCount}
    >
      {children}
      <MobileBroadcastPopup initialBroadcasts={eligibleBroadcasts} />
    </MobileAppShell>
  );
}
