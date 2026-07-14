import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import { db } from "@/db";
import { chitraLearningCampaigns, chitraLearningCampaignParticipants } from "@/db/schema/hero";
import { eq, desc, sql } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Megaphone, Edit, Trash2, Eye } from "lucide-react";
import { DeleteOnlineAssignmentButton } from "./delete-button";

export const metadata = {
  title: "Online Assignments | ChitraLearning LMS",
};

export default async function OnlineAssignmentsPage() {
  const session = await getServerSession();
  if (!session?.user) redirect("/auth/signin");

  const { isLmsAdmin } = await import("@/lib/chitralearning-lms");
  const isAdmin = await isLmsAdmin(session);
  if (!isAdmin) redirect("/dashboard/chitralearning-lms");

  const campaigns = await db
    .select()
    .from(chitraLearningCampaigns)
    .where(eq(chitraLearningCampaigns.campaignType, "online_assignment"))
    .orderBy(desc(chitraLearningCampaigns.createdAt));

  const participantCounts = await Promise.all(
    campaigns.map(async (c) => {
      const [row] = await db
        .select({ count: sql<number>`count(*)` })
        .from(chitraLearningCampaignParticipants)
        .where(eq(chitraLearningCampaignParticipants.campaignId, c.id));
      return { id: c.id, count: Number(row?.count ?? 0) };
    })
  );
  const countMap = new Map(participantCounts.map((p) => [p.id, p.count]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Online Assignment</h1>
          <p className="text-slate-500">Kelola assignment online / quiz dadakan untuk karyawan.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/chitralearning-lms/online-assignments/new">
            <Plus className="mr-2 h-4 w-4" /> Buat Assignment
          </Link>
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 text-center py-16">
          <Megaphone className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-1">Belum ada online assignment</h3>
          <p className="text-slate-500 mb-6">Buat assignment online pertama untuk diberikan ke karyawan.</p>
          <Button asChild variant="outline">
            <Link href="/dashboard/chitralearning-lms/online-assignments/new">Buat Assignment Baru</Link>
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Judul Assignment</th>
                <th className="px-6 py-4">Target</th>
                <th className="px-6 py-4">Periode</th>
                <th className="px-6 py-4">Peserta</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900 max-w-[300px] truncate">
                    {campaign.title}
                  </td>
                  <td className="px-6 py-4 text-slate-600 capitalize">{campaign.targetType}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {campaign.periodStart
                      ? `${new Date(campaign.periodStart).toLocaleDateString("id-ID")}${campaign.periodEnd ? ` - ${new Date(campaign.periodEnd).toLocaleDateString("id-ID")}` : ""}`
                      : (campaign.periodValue || "-")}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{countMap.get(campaign.id) ?? 0}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        campaign.status === "published"
                          ? "bg-emerald-100 text-emerald-700"
                          : campaign.status === "draft"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {campaign.status === "published" && (
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/chitralearning-lms/online-assignments/${campaign.id}/take`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/chitralearning-lms/online-assignments/${campaign.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DeleteOnlineAssignmentButton campaignId={campaign.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
