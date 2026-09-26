import { ActivityHubHeader } from "@/components/activity-hub-header";

export default function ActivityHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 p-3.5 sm:p-5 lg:p-6">
      <ActivityHubHeader />
      {children}
    </div>
  );
}
