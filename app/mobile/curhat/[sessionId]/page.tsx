import { getSessionDetail, getMessages, getCurrentEmployee } from "@/app/actions/hr-counseling";
import ChatClient from "@/app/dashboard/curhat/[sessionId]/chat-client";
import { notFound } from "next/navigation";

export default async function MobileCurhatSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const resolvedParams = await params;
  const sessionId = parseInt(resolvedParams.sessionId);
  if (isNaN(sessionId)) notFound();

  const [session, messages, currentEmployee] = await Promise.all([
    getSessionDetail(sessionId),
    getMessages(sessionId),
    getCurrentEmployee(),
  ]);

  if (!session || !currentEmployee) notFound();

  // On user portal, user must be the session owner.
  if (session.userId !== currentEmployee.id) notFound();

  return (
    <div className="h-full -mx-4 -mt-4 bg-[#f8fafc]">
      <ChatClient
        session={session}
        initialMessages={messages}
        currentUserId={currentEmployee.id}
        backPath="/mobile/curhat"
      />
    </div>
  );
}
