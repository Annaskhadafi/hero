import { Metadata } from "next";
import {
  getSopWinDashboardAction,
  getSopWinDocumentsAction,
  getEmployeeOptionsForSopAction,
  getSopWinDepartmentsAction,
  getSopWinApprovalsAction,
  getSopWinDocumentRequestsAction,
  getSopWinDepartmentWorkflowsAction,
} from "@/app/dashboard/sop-win/actions";
import { getServerSession } from "@/lib/auth-session";
import { getCurrentMenuPermission } from "@/lib/hero-access";
import { SopWinExplorerWorkspace } from "@/components/sop-win/sop-win-explorer-workspace";
import { SopWinDashboardView } from "@/components/sop-win/sop-win-dashboard-view";
import { SopWinApprovalWorkspace } from "@/components/sop-win/sop-win-approval-workspace";
import { SopWinApprovalMatrixPanel } from "@/components/sop-win/sop-win-approval-matrix-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Files, BarChart3, FolderKanban, CheckCircle2, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "SOP / WIN Document System | HERO",
  description: "Sistem Manajemen Dokumen SOP, WIN, POL dengan Integrasi RAG AI & Workbench Approval Engine.",
};

export const dynamic = "force-dynamic";

export default async function SopWinPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const activeTab = resolvedParams?.tab || "explorer";

  const [rawDashboard, rawDocs, rawEmployees, rawDepts, rawApprovals, rawDocRequests, rawMatrixWorkflows, permission, session] = await Promise.all([
    getSopWinDashboardAction().catch((err) => {
      console.error('[SopWinPage] dashboard action failed:', err);
      return null;
    }),
    getSopWinDocumentsAction().catch((err) => {
      console.error('[SopWinPage] documents action failed:', err);
      return { success: false as const, documents: [] };
    }),
    getEmployeeOptionsForSopAction().catch((err) => {
      console.error('[SopWinPage] employee options action failed:', err);
      return { success: false as const, employees: [], picOptions: [], headDepartments: [], headSections: [] };
    }),
    getSopWinDepartmentsAction().catch((err) => {
      console.error('[SopWinPage] departments action failed:', err);
      return { success: false as const, departments: [] };
    }),
    getSopWinApprovalsAction().catch((err) => {
      console.error('[SopWinPage] approvals action failed:', err);
      return { success: false as const, items: [] };
    }),
    getSopWinDocumentRequestsAction().catch((err) => {
      console.error('[SopWinPage] document requests action failed:', err);
      return { success: false as const, requests: [] };
    }),
    getSopWinDepartmentWorkflowsAction().catch((err) => {
      console.error('[SopWinPage] department workflows action failed:', err);
      return { success: false as const, data: [] };
    }),
    getCurrentMenuPermission("sop-win").catch(() => null),
    getServerSession().catch(() => null),
  ]);

  // Clean JSON serialization to ensure zero RSC serialization issues
  const dashboardData = rawDashboard && typeof rawDashboard === "object" ? JSON.parse(JSON.stringify(rawDashboard)) : {
    totalDocuments: 0,
    totalSop: 0,
    totalWin: 0,
    totalPol: 0,
    totalRevisions: 0,
    departmentStats: [],
    recentRevisions: [],
    recentDocuments: [],
  };
  const docsData = rawDocs && typeof rawDocs === "object" ? JSON.parse(JSON.stringify(rawDocs)) : {
    documents: [],
    departmentCounts: {},
  };
  const employeeData = rawEmployees && typeof rawEmployees === "object" ? JSON.parse(JSON.stringify(rawEmployees)) : {
    employees: [],
    picOptions: [],
    headSections: [],
  };
  const deptData = rawDepts && typeof rawDepts === "object" ? JSON.parse(JSON.stringify(rawDepts)) : {
    departments: [],
  };
  const approvalData = rawApprovals && typeof rawApprovals === "object" ? JSON.parse(JSON.stringify(rawApprovals)) : {
    documents: [],
    stats: { pendingCount: 0, approvedCount: 0, revertedCount: 0, rejectedCount: 0, totalCount: 0 },
  };
  const docRequestsData = rawDocRequests && typeof rawDocRequests === "object" ? JSON.parse(JSON.stringify(rawDocRequests)) : {
    requests: [],
  };

  const initialDocs = Array.isArray(docsData?.documents) ? docsData.documents : [];
  const deptCounts = docsData?.departmentCounts || {};
  const empList = Array.isArray(employeeData?.employees) ? employeeData.employees : [];
  const picList = Array.isArray(employeeData?.picOptions) ? employeeData.picOptions : [];
  const headSecList = Array.isArray(employeeData?.headSections) ? employeeData.headSections : [];
  const departmentsList = Array.isArray(deptData?.departments) ? deptData.departments : [];

  const approvalDocs = Array.isArray(approvalData?.documents) ? approvalData.documents : [];
  const approvalStats = approvalData?.stats || { pendingCount: 0, approvedCount: 0, revertedCount: 0, rejectedCount: 0, totalCount: 0 };
  const docRequestsList = Array.isArray(docRequestsData?.requests) ? docRequestsData.requests : [];
  const pendingRequestsCount = docRequestsList.filter((r: any) => r.status === "pending_ria" || r.status === "pending_creator" || r.status === "pending_owner" || r.status === "pending_bardynia").length;
  const matrixWorkflowsData = rawMatrixWorkflows && typeof rawMatrixWorkflows === "object" ? JSON.parse(JSON.stringify(rawMatrixWorkflows)) : { data: [] };
  const matrixWorkflowsList = Array.isArray(matrixWorkflowsData?.data) ? matrixWorkflowsData.data : [];

  const canEdit = !!permission?.canEdit;
  const canDelete = !!permission?.canDelete;
  const canCreate = !!permission?.canEdit;

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-5 lg:p-6 w-full max-w-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#0f172a] text-white shadow-2xs">
            <Files className="size-4" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
            SOP / WIN Document System
          </h1>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue={activeTab} className="space-y-4">
        <TabsList className="bg-slate-100/90 p-1 dark:bg-slate-900">
          <TabsTrigger
            value="explorer"
            className="gap-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#003461] data-[state=active]:shadow-sm"
          >
            <FolderKanban className="size-3.5" />
            File Document System
          </TabsTrigger>
          <TabsTrigger
            value="dashboard"
            className="gap-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#003461] data-[state=active]:shadow-sm"
          >
            <BarChart3 className="size-3.5" />
            Dashboard & Statistik ({dashboardData.totalDocuments || 0} Dokumen)
          </TabsTrigger>
          <TabsTrigger
            value="approval"
            className="gap-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#003461] data-[state=active]:shadow-sm"
          >
            <CheckCircle2 className="size-3.5 text-emerald-600" />
            Approval Dokumen SOP & WIN
            {pendingRequestsCount > 0 && (
              <Badge className="ml-1 px-1.5 py-0 bg-amber-500 text-white font-bold text-[10px] rounded-full">
                {pendingRequestsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="matrix"
            className="gap-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#003461] data-[state=active]:shadow-sm"
          >
            <ShieldCheck className="size-3.5 text-blue-600" />
            Konfigurasi Approval Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="explorer" className="space-y-4 outline-none">
          <SopWinExplorerWorkspace
            initialDocuments={initialDocs}
            departmentCounts={deptCounts}
            departments={departmentsList}
            employees={empList}
            picOptions={picList}
            headSections={headSecList}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
            canManageDocuments={canEdit}
          />
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4 outline-none">
          <SopWinDashboardView data={dashboardData} />
        </TabsContent>

        <TabsContent value="approval" className="space-y-4 outline-none">
          <SopWinApprovalWorkspace
            initialDocuments={approvalDocs}
            initialRequests={docRequestsList}
            departments={departmentsList}
            stats={approvalStats}
          />
        </TabsContent>

        <TabsContent value="matrix" className="space-y-4 outline-none">
          <SopWinApprovalMatrixPanel initialWorkflows={matrixWorkflowsList} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Invalidate Turbopack Route Cache: 2026-08-26T13:06:00Z
