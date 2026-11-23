import { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { eq } from "drizzle-orm";
import { MobileIframeViewer } from "@/components/mobile/mobile-iframe-viewer";

interface MobileIframePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: MobileIframePageProps): Promise<Metadata> {
  const { id } = await params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) return { title: "Iframe Viewer | HERO Mobile" };

  try {
    const [menuItem] = await db
      .select({ title: navbarMenuItems.title })
      .from(navbarMenuItems)
      .where(eq(navbarMenuItems.id, itemId))
      .limit(1);

    return {
      title: `${menuItem?.title || "Portal Internal"} | HERO Mobile`,
    };
  } catch {
    return { title: "Iframe Viewer | HERO Mobile" };
  }
}

export default async function MobileIframePage({ params }: MobileIframePageProps) {
  const { id } = await params;
  const itemId = parseInt(id, 10);

  if (isNaN(itemId)) {
    notFound();
  }

  const [menuItem] = await db
    .select()
    .from(navbarMenuItems)
    .where(eq(navbarMenuItems.id, itemId))
    .limit(1);

  if (!menuItem || !menuItem.isIframe) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <MobileIframeViewer
        title={menuItem.title}
        url={menuItem.url}
        category={menuItem.section || "Portal Internal"}
        backHref="/mobile/dashboard"
      />
    </div>
  );
}
