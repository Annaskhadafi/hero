import { getHistoricalBroadcastsForMobile } from "@/app/actions/broadcast";
import { InformationClient } from "./information-client";

export const dynamic = "force-dynamic";

export default async function MobileInformationPage() {
  const history = await getHistoricalBroadcastsForMobile();

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-black text-[#003f78]">Informasi HO</h1>
        <p className="text-xs text-muted-foreground">
          Kumpulan informasi penting, pengumuman, dan broadcast resmi dari Head Office.
        </p>
      </div>

      <InformationClient initialHistory={history} />
    </div>
  );
}
