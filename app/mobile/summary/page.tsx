import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getServerSession } from "@/lib/auth-session";
import { getCurrentEmployee } from "@/lib/get-current-employee";
import { getSectionsWithApprovedRequests, getSummaryDetails } from "@/lib/summary-engine";
import { SummaryPreview } from "@/components/summary/summary-preview";
import { MobileSummaryClient } from "@/components/mobile/mobile-summary-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MobileSummaryPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");

  const searchParams = await props.searchParams;
  const currentEmployee = await getCurrentEmployee();
  const sections = await getSectionsWithApprovedRequests();

  const previewId = searchParams.preview ? Number(searchParams.preview) : null;
  let summaryData = null;

  if (previewId && !isNaN(previewId)) {
    summaryData = await getSummaryDetails(previewId);
  }

  if (summaryData) {
    return (
      <div className="space-y-4 pb-6">
        <div className="flex items-center gap-2 px-1 pt-1">
          <Link
            href="/mobile/summary"
            className="flex size-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 active:scale-95 transition-transform"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Preview Dokumen</p>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">
              {summaryData.summaryNumber}
            </h1>
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
          <SummaryPreview data={summaryData} />
        </div>
      </div>
    );
  }

  return (
    <MobileSummaryClient
      sections={sections}
      currentEmployeeId={currentEmployee?.id ?? 0}
    />
  );
}
