import { getSectionsWithApprovedRequests, getSummaryDetails } from '@/lib/summary-engine';
import { SummaryList } from '@/components/summary/summary-list';
import { SummaryPreview } from '@/components/summary/summary-preview';
import { getCurrentEmployee } from '@/lib/get-current-employee';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const currentEmployee = await getCurrentEmployee();
  const sections = await getSectionsWithApprovedRequests();
  
  const previewId = params.preview ? Number(params.preview) : null;
  let summaryData = null;
  
  if (previewId) {
    summaryData = await getSummaryDetails(previewId);
  }

  return (
    <div className="p-6 space-y-6">
      {summaryData ? (
        <SummaryPreview data={summaryData} />
      ) : (
        <SummaryList
          sections={sections}
          currentEmployeeId={currentEmployee?.id ?? 0}
        />
      )}
    </div>
  );
}
