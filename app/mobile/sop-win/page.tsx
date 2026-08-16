import { Metadata } from "next";
import {
  getSopWinDocumentsAction,
  getSopWinDepartmentsAction,
} from "@/app/dashboard/sop-win/actions";
import { MobileSopWinView } from "@/components/mobile/mobile-sop-win-view";

export const metadata: Metadata = {
  title: "SOP & WIN Mobile | HERO",
  description: "Pusat Dokumen Standar Operasional (SOP), Petunjuk Kerja (WIN), dan Kebijakan (POL) versi Mobile.",
};

export const dynamic = "force-dynamic";

export default async function MobileSopWinPage() {
  const [rawDocs, rawDepts] = await Promise.all([
    getSopWinDocumentsAction(),
    getSopWinDepartmentsAction(),
  ]);

  const docsData = rawDocs && typeof rawDocs === "object" ? JSON.parse(JSON.stringify(rawDocs)) : {
    documents: [],
  };
  const deptData = rawDepts && typeof rawDepts === "object" ? JSON.parse(JSON.stringify(rawDepts)) : {
    departments: [],
  };

  const initialDocs = Array.isArray(docsData?.documents) ? docsData.documents : [];
  const departmentsList = Array.isArray(deptData?.departments) ? deptData.departments : [];

  return (
    <div className="w-full px-3 py-2 sm:px-4">
      <MobileSopWinView
        initialDocuments={initialDocs}
        departments={departmentsList}
      />
    </div>
  );
}
