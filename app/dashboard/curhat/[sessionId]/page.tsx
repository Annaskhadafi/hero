import { getSessionDetail, getMessages, getCurrentEmployee } from "@/app/actions/hr-counseling";
import ChatClient from "./chat-client";
import { redirect } from "next/navigation";

export default async function CurhatSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const resolvedParams = await params;
  const sessionId = parseInt(resolvedParams.sessionId);
  if (isNaN(sessionId)) redirect("/dashboard/curhat");

  const currentEmployee = await getCurrentEmployee();
  if (!currentEmployee) redirect("/");

  try {
    const session = await getSessionDetail(sessionId);
    const messages = await getMessages(sessionId);

    return (
      <ChatClient
        session={session}
        initialMessages={messages}
        currentUserId={currentEmployee.id}
      />
    );
  } catch (error) {
    redirect("/dashboard/curhat");
  }
}
