import { getLetterArchives, getLetterStats } from "@/app/actions/surat";
import { SuratArchiveClient } from "./client-page";

export const metadata = {
  title: "Arsip Surat - HC",
};

export default async function SuratArchivePage() {
  const [letters, stats] = await Promise.all([
    getLetterArchives(),
    getLetterStats(),
  ]);

  return <SuratArchiveClient letters={letters} stats={stats} />;
}
