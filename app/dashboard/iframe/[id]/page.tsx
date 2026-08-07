import { notFound } from "next/navigation";
import { db } from "@/db";
import { navbarMenuItems } from "@/db/schema/hero";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { IconExternalLink } from "@tabler/icons-react";

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
    <div className="flex flex-1 flex-col w-full h-[calc(100vh-4rem)] relative overflow-hidden bg-card">
      <div className="flex items-center justify-between px-6 py-2 border-b bg-muted/30 text-xs text-muted-foreground shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{menuItem.title}</span>
          <span className="opacity-60">|</span>
          <span className="truncate max-w-sm sm:max-w-md md:max-w-lg">{menuItem.url}</span>
        </div>
        <Button asChild variant="outline" className="h-7 px-2.5 text-xs gap-1.5 font-normal">
          <a href={menuItem.url} target="_blank" rel="noopener noreferrer">
            <IconExternalLink className="size-3" />
            Buka di Tab Baru
          </a>
        </Button>
      </div>
      <div className="flex-1 w-full relative bg-white">
        <iframe
          src={menuItem.url}
          title={menuItem.title}
          className="absolute inset-0 w-full h-full border-none"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
