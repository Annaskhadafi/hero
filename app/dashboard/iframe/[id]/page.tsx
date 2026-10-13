import { notFound } from "next/navigation";
import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { eq } from "drizzle-orm";
import { IframeViewerClient } from "@/components/iframe-viewer-client";

interface IframePageProps {
  params: Promise<{ id: string }>;
}

export default async function IframePage({ params }: IframePageProps) {
  const { id } = await params;
  const itemId = parseInt(id);

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

  return <IframeViewerClient title={menuItem.title} url={menuItem.url} />;
}
