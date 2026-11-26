import { resolveSupervisorNoteAccess } from "@/lib/daily-activity-supervisor-note-access";

describe("resolveSupervisorNoteAccess", () => {
  const base = {
    employeeId: 1,
    employeeSiteId: 10,
    ownerId: 2,
    activitySiteId: 10,
    dashboardPermission: { canView: true, canEdit: true, dataScope: "site" },
    myDayCanView: false,
    position: { isActive: true, levelName: "Supervisor", isManagerial: false },
  };

  it("allows an owner to read with My Day view access, but not write", () => {
    expect(resolveSupervisorNoteAccess({ ...base, ownerId: 1, dashboardPermission: null, position: null, myDayCanView: true })).toEqual({
      canRead: true,
      canWrite: false,
    });
  });

  it("allows dashboard own scope to read and write only the owner's note", () => {
    const dashboardPermission = { canView: true, canEdit: true, dataScope: "own" };
    expect(resolveSupervisorNoteAccess({ ...base, ownerId: 1, dashboardPermission })).toEqual({ canRead: true, canWrite: true });
    expect(resolveSupervisorNoteAccess({ ...base, dashboardPermission })).toEqual({ canRead: false, canWrite: false });
  });

  it("allows site scope only for the employee's primary site", () => {
    const dashboardPermission = { canView: true, canEdit: true, dataScope: "site" };
    expect(resolveSupervisorNoteAccess({ ...base, dashboardPermission })).toEqual({ canRead: true, canWrite: true });
    expect(resolveSupervisorNoteAccess({ ...base, activitySiteId: 11, dashboardPermission })).toEqual({ canRead: false, canWrite: false });
  });

  it("requires canView even for global scope and only writes with canEdit", () => {
    expect(resolveSupervisorNoteAccess({
      ...base,
      dashboardPermission: { canView: false, canEdit: true, dataScope: "global" },
    })).toEqual({ canRead: false, canWrite: false });
    expect(resolveSupervisorNoteAccess({
      ...base,
      dashboardPermission: { canView: true, canEdit: false, dataScope: "global" },
    })).toEqual({ canRead: false, canWrite: false });
  });

  it.each(["Supervisor", "Manager"])("allows exact %s position to read and write in-scope notes", (levelName) => {
    expect(resolveSupervisorNoteAccess({
      ...base,
      position: { isActive: true, levelName, isManagerial: false },
    })).toEqual({ canRead: true, canWrite: true });
  });

  it("allows an active managerial position with a nonblank level name", () => {
    expect(resolveSupervisorNoteAccess({
      ...base,
      position: { isActive: true, levelName: "Team Lead", isManagerial: true },
    })).toEqual({ canRead: true, canWrite: true });
  });

  it.each([
    { isActive: false, levelName: "Supervisor", isManagerial: true },
    { isActive: true, levelName: " ", isManagerial: true },
    { isActive: true, levelName: "Coordinator", isManagerial: false },
  ])("does not grant position access for inactive, unnamed, or non-managerial positions", (position) => {
    expect(resolveSupervisorNoteAccess({ ...base, position })).toEqual({ canRead: false, canWrite: false });
  });

  it("does not treat dashboard write permission as access without view permission", () => {
    expect(resolveSupervisorNoteAccess({
      ...base,
      dashboardPermission: { canView: false, canEdit: true, dataScope: "site" },
    })).toEqual({ canRead: false, canWrite: false });
  });
});
