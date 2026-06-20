import { getBroadcastsList, getTargetMetadata, getBroadcastCategories } from "@/app/actions/broadcast";
import { CommandCenterClient } from "./command-center-client";

export const dynamic = "force-dynamic";

export default async function CommandCenterPage() {
  const [broadcasts, metadata, categories] = await Promise.all([
    getBroadcastsList(),
    getTargetMetadata(),
    getBroadcastCategories(),
  ]);

  return (
    <CommandCenterClient 
      initialBroadcasts={broadcasts} 
      metadata={metadata} 
      initialCategories={categories}
    />
  );
}
