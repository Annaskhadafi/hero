import { Metadata } from "next";
import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { and, eq, ilike } from "drizzle-orm";
import { MobileIframeViewer } from "@/components/mobile/mobile-iframe-viewer";

export const metadata: Metadata = {
  title: "Instagram Generator | HERO Mobile",
  description: "AI generator konten & gambar Instagram terintegrasi.",
};

const DEFAULT_INSTAGRAM_EMBED_URL =
  "https://one.chitraparatama.com/api/embed/login?token=1b139aaf669458ac11e8fc72e8dcc0a7d7c5f218480d4caead16023400fec250";

export default async function MobileInstagramGeneratorPage() {
  let title = "Instagram Generator";
  let url = DEFAULT_INSTAGRAM_EMBED_URL;
  let category = "Marketing";

  try {
    const [item] = await db
      .select()
      .from(navbarMenuItems)
      .where(
        and(
          ilike(navbarMenuItems.title, "%instagram%"),
          eq(navbarMenuItems.isIframe, true)
        )
      )
      .limit(1);

    if (item) {
      title = item.title;
      url = item.url;
      category = item.section || "Marketing";
    }
  } catch (error) {
    console.warn("[MobileInstagramGeneratorPage] Error fetching menu item:", error);
  }

  return (
    <div className="space-y-4">
      <MobileIframeViewer
        title={title}
        url={url}
        category={category}
        backHref="/mobile/dashboard"
      />
    </div>
  );
}
