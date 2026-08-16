import { Metadata } from "next";
import { Suspense } from "react";
import { getHeroGeniusOverviewAction } from "@/app/dashboard/hero-genius/actions";
import { getServerSession } from "@/lib/auth-session";
import { getEmployeeDisplayDataByEmail } from "@/lib/hero-admin";
import { GeniusChatWorkspace } from "@/components/hero-genius/genius-chat-workspace";
import { GeniusKnowledgeWorkspace } from "@/components/hero-genius/genius-knowledge-workspace";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Database, Bot, BookOpen } from "lucide-react";

import { getCurrentEmployeeAccessRole } from "@/lib/get-current-employee";

export const metadata: Metadata = {
  title: "Hero Genius | HERO",
  description: "Knowledge Base Assistant powered by pgvector.",
};

export const dynamic = "force-dynamic";

export default async function HeroGeniusPage() {
  const [overview, session] = await Promise.all([
    getHeroGeniusOverviewAction(),
    getServerSession(),
  ]);

  let isSuperAdmin = false;
  if (session?.user) {
    const directRole = String((session.user as any)?.role || "").toLowerCase();
    if (directRole.includes("admin") || directRole.includes("super")) {
      isSuperAdmin = true;
    } else {
      if (session.user.email) {
        const employee = await getEmployeeDisplayDataByEmail(session.user.email);
        const accessRole = String(employee?.accessRole || employee?.role || "").toLowerCase();
        if (
          accessRole.includes("super") ||
          accessRole.includes("admin") ||
          accessRole === "hc manager" ||
          accessRole === "super admin" ||
          accessRole === "super_admin"
        ) {
          isSuperAdmin = true;
        }
      }
      if (!isSuperAdmin) {
        try {
          const empAccessRole = String((await getCurrentEmployeeAccessRole()) || "").toLowerCase();
          if (
            empAccessRole.includes("super") ||
            empAccessRole.includes("admin") ||
            empAccessRole === "hc manager"
          ) {
            isSuperAdmin = true;
          }
        } catch {
          // ignore
        }
      }
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm">
              <Sparkles className="size-4.5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Hero Genius
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Asisten & Knowledge Engine Berbasis RAG (Retrieval-Augmented Generation) & pgvector.
          </p>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="bg-slate-100/80 p-1 dark:bg-slate-900">
          <TabsTrigger
            value="chat"
            className="gap-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#003461] data-[state=active]:shadow-sm"
          >
            <Bot className="size-3.5" />
            Chat Assistant
          </TabsTrigger>
          <TabsTrigger
            value="knowledge"
            className="gap-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#003461] data-[state=active]:shadow-sm"
          >
            <Database className="size-3.5" />
            Knowledge Base ({overview.totalDocuments} Dokumen)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4 outline-none">
          <Suspense fallback={<div className="p-6 text-xs text-slate-400">Memuat Hero Genius...</div>}>
            <GeniusChatWorkspace
              engineInfo={overview.info}
              totalDocuments={overview.totalDocuments}
              totalChunks={overview.totalChunks}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-4 outline-none">
          <GeniusKnowledgeWorkspace
            initialDocuments={overview.documents}
            engineInfo={overview.info}
            redisInfo={overview.redis}
            canManageDocuments={isSuperAdmin}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
