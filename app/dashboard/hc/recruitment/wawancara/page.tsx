import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  getInterviewsWorkspaceData,
  getInterviewSettings,
  getAvailableInterviewers,
  getCandidatesForInterviewScheduling,
} from "@/app/actions/interviews";
import { WawancaraClientPage } from "./client-page";

export const metadata = {
  title: "Wawancara - Recruitment HERO",
  description: "Halaman khusus wawancara & evaluasi panelis kandidat standar F.HR.STD.010.00",
};

export default async function WawancaraPage() {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);

  const [workspaceData, settings, availableInterviewers, candidatesList] = await Promise.all([
    getInterviewsWorkspaceData(),
    getInterviewSettings(),
    getAvailableInterviewers(),
    getCandidatesForInterviewScheduling(),
  ]);

  return (
    <WawancaraClientPage
      sessions={workspaceData}
      settings={settings}
      availableInterviewers={availableInterviewers}
      candidatesList={candidatesList}
      currentUser={
        session?.user
          ? {
              id: session.user.id,
              name: session.user.name,
              email: session.user.email,
            }
          : undefined
      }
    />
  );
}
