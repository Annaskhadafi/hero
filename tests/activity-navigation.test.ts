import {
  activityHubTabs,
  activityMenuLabels,
  getActivityPagePurpose,
  mobileActivityDrawerItem,
} from "@/lib/activity-navigation";

describe("activity navigation clarity", () => {
  it("uses one primary daily activity input label across desktop and mobile", () => {
    expect(activityMenuLabels.input).toBe("Input Aktivitas Harian");
    expect(activityHubTabs[0]).toMatchObject({ label: "Input Aktivitas Harian", href: "/dashboard/activity-hub/my-day" });
    expect(mobileActivityDrawerItem).toMatchObject({ label: "Input Aktivitas Harian", href: "/mobile/activity/input" });
  });

  it("keeps team monitoring separate from official approval actions", () => {
    const teamBoard = getActivityPagePurpose("teamBoard");

    expect(teamBoard.title).toBe("Monitoring Tim & SPL");
    expect(teamBoard.primaryAction).toMatchObject({ label: "Buka Approval Inbox", href: "/dashboard/approval" });
    expect(teamBoard.description).toContain("keputusan resmi tetap di Approval Inbox");
  });

  it("explains Library, Route Builder, and Configuration boundaries", () => {
    expect(getActivityPagePurpose("library").description).toContain("kamus pekerjaan resmi");
    expect(getActivityPagePurpose("routes").description).toContain("susunan pekerjaan per section, jabatan, site, dan shift");
    expect(getActivityPagePurpose("configuration").description).toContain("deadline, penalty, cap poin, event multiplier");
  });
});
