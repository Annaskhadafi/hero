import { Metadata } from "next";
import { Suspense } from "react";
import { MobileGeniusChat } from "@/components/mobile/mobile-genius-chat";
import { listRagDocuments } from "@/lib/hero-genius/client";

export const metadata: Metadata = {
  title: "Hero Genius Mobile | HERO",
  description: "Mobile Chatbot Assistant for HERO operations.",
};

export const dynamic = "force-dynamic";

export default async function MobileHeroGeniusPage() {
  let docCount = 0;
  try {
    const docs = await listRagDocuments();
    docCount = docs.total_documents || 0;
  } catch (err) {
    console.error("[MobileHeroGeniusPage] Failed to fetch doc count:", err);
  }

  return (
    <Suspense fallback={<div className="p-4 text-xs text-slate-400">Memuat Hero Genius...</div>}>
      <MobileGeniusChat initialDocumentsCount={docCount} />
    </Suspense>
  );
}
