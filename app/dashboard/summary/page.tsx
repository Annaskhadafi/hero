import { getSectionsWithApprovedRequests, getSummaryDetails } from '@/lib/summary-engine';
import { SummaryList } from '@/components/summary/summary-list';
import { SummaryPreview } from '@/components/summary/summary-preview';
import { AdminPageShell } from '@/components/admin-page-shell';

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const sections = await getSectionsWithApprovedRequests();
  
  const previewId = params.preview ? Number(params.preview) : null;
  let summaryData = null;
  
  if (previewId) {
    summaryData = await getSummaryDetails(previewId);
  }

  return (
    <AdminPageShell
      eyebrow="HSE"
      title="Summary Permintaan Barang Safety"
      description="Generate summary dari permohonan APD yang sudah disetujui"
    >
      <div className="bg-white rounded-xl border shadow-sm">
        {summaryData ? (
          <SummaryPreview data={summaryData} />
        ) : (
          <SummaryList sections={sections} />
        )}
      </div>
    </AdminPageShell>
  );
}
