import { redirect } from "next/navigation";
import { SystemBlueprintMap } from "@/components/system-blueprint-map";
import { getServerSession } from "@/lib/auth-session";
import { getSidebarDataForUser } from "@/lib/hero-admin";

export const metadata = {
  title: "HERO System Blueprint & Peta Fitur | HERO Enterprise",
  description: "Peta fitur besar dan hubungan proses end-to-end ekosistem HERO System Blueprint.",
};

export default async function FeatureMapPage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  // Retrieve active navigation & custom registered menus from database
  const sidebarData = await getSidebarDataForUser(session.user.email).catch(() => ({
    navMain: [],
    navSecondary: [],
    documents: [],
  }));

  const allDbMenuItems = [
    ...(sidebarData.navMain || []),
    ...(sidebarData.navSecondary || []),
    ...(sidebarData.documents || []),
  ].map((item) => ({
    title: item.title,
    url: item.url,
    section: item.section || "",
    groupLabel: item.groupLabel || null,
  }));

  return <SystemBlueprintMap dynamicMenuItems={allDbMenuItems} />;
}
