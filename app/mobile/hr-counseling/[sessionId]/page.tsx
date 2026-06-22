import { getSessionDetail, getMessages, getCurrentEmployee } from "@/app/actions/hr-counseling";
import ChatClient from "@/app/dashboard/curhat/[sessionId]/chat-client";
import { redirect } from "next/navigation";

export default async function MobileHrCounselingSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const resolvedParams = await params;
  const sessionId = parseInt(resolvedParams.sessionId);
  if (isNaN(sessionId)) redirect("/mobile/hr-counseling");

  const currentEmployee = await getCurrentEmployee();
  if (!currentEmployee) redirect("/");

  const session = await getSessionDetail(sessionId);
  if (!session) redirect("/mobile/hr-counseling");
  const messages = await getMessages(sessionId);

    return (
      <ChatClient
        session={session}
        initialMessages={messages}
        currentUserId={currentEmployee.id}
        isHrView={true}
        backPath="/mobile/hr-counseling"
      />
    );
  }
