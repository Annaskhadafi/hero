import { notFound } from "next/navigation";
import { getHseOsmSessionById } from "@/app/actions/hse-osm";
import { OsmPrintView } from "./print-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PrintHseOsmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = Number(id);
  if (isNaN(sessionId)) notFound();

  const res = await getHseOsmSessionById(sessionId);
  if (!res.success || !res.data) notFound();

  const s = res.data;

  const googleMapsUrl =
    s.latitude && s.longitude
      ? `https://www.google.com/maps?q=${s.latitude},${s.longitude}`
      : null;

  return <OsmPrintView session={s} googleMapsUrl={googleMapsUrl} />;
}
