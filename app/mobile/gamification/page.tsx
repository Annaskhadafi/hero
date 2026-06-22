import { redirect } from "next/navigation";
import { Metadata } from "next";
import { MobileGamificationLive } from "@/components/mobile/mobile-gamification-live";
import { getServerSession } from "@/lib/auth-session";
import { getMobileGamification } from "@/lib/mobile-data";

export const metadata: Metadata = {
  title: "Leaderboard - HERO Mobile",
};

export default async function MobileLeaderboardPage() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const data = await getMobileGamification(session.user.email);
  if (!data) {
    return null;
  }

  return (
    <MobileGamificationLive
      initialData={{
        ...data,
        events: data.events.map((event) => ({
          ...event,
          createdAt: event.createdAt.toISOString(),
        })),
      }}
    />
  );
}
