import { notFound } from "next/navigation";
import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

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

  return (
    <div className="flex flex-1 flex-col w-full h-[calc(100vh-4rem)] relative overflow-hidden bg-white">
      <iframe
        src={menuItem.url}
        title={menuItem.title}
        className="absolute inset-0 w-full h-full border-none"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}
