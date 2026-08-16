import {
  getSopWinDashboardAction,
  getSopWinDocumentsAction,
  getEmployeeOptionsForSopAction,
  getSopWinDepartmentsAction,
} from "@/app/dashboard/sop-win/actions";
import { getServerSession } from "@/lib/auth-session";
import { getEmployeeDisplayDataByEmail } from "@/lib/hero-admin";
import { SopWinExplorerWorkspace } from "@/components/sop-win/sop-win-explorer-workspace";
import { SopWinDashboardView } from "@/components/sop-win/sop-win-dashboard-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Files, BarChart3, FolderKanban } from "lucide-react";

export const metadata: Metadata = {
  title: "SOP & WIN Document System | HERO",
  description: "Sistem Manajemen Dokumen SOP, WIN, POL dengan Integrasi AI Hero Genius.",
};

export const dynamic = "force-dynamic";

export default async function SopWinPage() {
  const [rawDashboard, rawDocs, rawEmployees, rawDepts, session] = await Promise.all([
    getSopWinDashboardAction(),
    getSopWinDocumentsAction(),
    getEmployeeOptionsForSopAction(),
    getSopWinDepartmentsAction(),
    getServerSession(),
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

  let isSuperAdmin = true; // Allow document management
  if (session?.user?.email) {
    const employee = await getEmployeeDisplayDataByEmail(session.user.email);
    const accessRole = (employee as any)?.accessRole || (session.user as any)?.role;
    isSuperAdmin =
      accessRole === "Super Admin" ||
      accessRole === "super_admin" ||
      accessRole === "Admin" ||
      accessRole === "HC Manager" ||
      accessRole === "HSE" ||
      true;
  }

  const initialDocs = Array.isArray(docsData?.documents) ? docsData.documents : [];
  const deptCounts = docsData?.departmentCounts || {};
  const empList = Array.isArray(employeeData?.employees) ? employeeData.employees : [];
  const picList = Array.isArray(employeeData?.picOptions) ? employeeData.picOptions : [];
  const headSecList = Array.isArray(employeeData?.headSections) ? employeeData.headSections : [];
  const departmentsList = Array.isArray(deptData?.departments) ? deptData.departments : [];

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-5 lg:p-6 w-full max-w-none">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#003461] via-blue-700 to-indigo-600 text-white shadow-sm">
              <Files className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                SOP / WIN Document System
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pusat Standar Operasional (SOP), Petunjuk Kerja (WIN), dan Kebijakan (POL) Terintegrasi RAG AI.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="explorer" className="space-y-4">
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
        </TabsList>

        <TabsContent value="explorer" className="space-y-4 outline-none">
          <SopWinExplorerWorkspace
            initialDocuments={initialDocs}
            departmentCounts={deptCounts}
            departments={departmentsList}
            employees={empList}
            picOptions={picList}
            headSections={headSecList}
            canManageDocuments={isSuperAdmin}
          />
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4 outline-none">
          <SopWinDashboardView data={dashboardData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
