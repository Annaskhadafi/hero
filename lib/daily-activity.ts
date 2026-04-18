import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  activityLibraries,
  activityModifiers,
  activityPhotos,
  approvals,
  dailyActivityConfigs,
  employees,
  jobAssignments,
  masterDepartments,
  masterSections,
  penaltyEvents,
  pointDisputes,
  pointEvents,
  sites,
  streakRecords,
} from "@/db/schema/hero";
import { ensureHeroGovernanceSeedData } from "@/lib/hero-admin";

let dailyActivitySeedPromise: Promise<void> | null = null;

const DAILY_ACTIVITY_REVALIDATE_PATHS = [
  "/dashboard/activity-hub/my-day",
  "/dashboard/activity-hub/team-board",
  "/dashboard/activity-hub/library",
  "/dashboard/activity-hub/configuration",
  "/dashboard/approval",
  "/dashboard/leaderboard",
] as const;

const DEFAULT_LIBRARY_SEEDS = [
  {
    activityCode: "TS-001",
    activityName: "Tyre inspection dan pressure check",
    category: "Technical",
    departmentName: "Central Service",
    basePoints: 10,
    complexityLevel: 2,
    requiresPhoto: true,
    requiresEquipmentNo: true,
    requiresDuration: true,
    requiresLocationGps: true,
    requiresMaterialUsed: false,
    maxDailyCount: 4,
    maxPointsPerDay: 40,
    isAssignable: true,
    isSelfInput: true,
    approvalRequired: true,
    autoApproveIfGpsValid: false,
    slaHours: 12,
  },
  {
    activityCode: "TS-002",
    activityName: "Tyre change unit hauling",
    category: "Technical",
    departmentName: "Central Service",
    basePoints: 18,
    complexityLevel: 4,
    requiresPhoto: true,
    requiresEquipmentNo: true,
    requiresDuration: true,
    requiresLocationGps: true,
    requiresMaterialUsed: true,
    maxDailyCount: 2,
    maxPointsPerDay: 36,
    isAssignable: true,
    isSelfInput: false,
    approvalRequired: true,
    autoApproveIfGpsValid: false,
    slaHours: 8,
  },
  {
    activityCode: "HSE-001",
    activityName: "Safety toolbox meeting",
    category: "HSE",
    departmentName: "HSE",
    basePoints: 8,
    complexityLevel: 1,
    requiresPhoto: false,
    requiresEquipmentNo: false,
    requiresDuration: true,
    requiresLocationGps: false,
    requiresMaterialUsed: false,
    maxDailyCount: 1,
    maxPointsPerDay: 8,
    isAssignable: true,
    isSelfInput: true,
    approvalRequired: true,
    autoApproveIfGpsValid: false,
    slaHours: 24,
  },
  {
    activityCode: "ADM-001",
    activityName: "Daily administration dan reporting",
    category: "Administrative",
    departmentName: "HC",
    basePoints: 6,
    complexityLevel: 1,
    requiresPhoto: false,
    requiresEquipmentNo: false,
    requiresDuration: true,
    requiresLocationGps: false,
    requiresMaterialUsed: false,
    maxDailyCount: 2,
    maxPointsPerDay: 12,
    isAssignable: true,
    isSelfInput: true,
    approvalRequired: true,
    autoApproveIfGpsValid: false,
    slaHours: 24,
  },
  {
    activityCode: "WLN-001",
    activityName: "Stretching dan wellness check",
    category: "Wellness",
    departmentName: "HC",
    basePoints: 4,
    complexityLevel: 1,
    requiresPhoto: false,
    requiresEquipmentNo: false,
    requiresDuration: true,
    requiresLocationGps: false,
    requiresMaterialUsed: false,
    maxDailyCount: 1,
    maxPointsPerDay: 4,
    isAssignable: true,
    isSelfInput: true,
    approvalRequired: false,
    autoApproveIfGpsValid: false,
    slaHours: 24,
  },
  {
    activityCode: "STD-001",
    activityName: "Standby on call site support",
    category: "Standby",
    departmentName: "Central Service",
    basePoints: 5,
    complexityLevel: 1,
    requiresPhoto: false,
    requiresEquipmentNo: false,
    requiresDuration: true,
    requiresLocationGps: false,
    requiresMaterialUsed: false,
    maxDailyCount: 1,
    maxPointsPerDay: 5,
    isAssignable: true,
    isSelfInput: false,
    approvalRequired: true,
    autoApproveIfGpsValid: false,
    slaHours: 24,
  },
] as const;

const DEFAULT_CONFIG_SEEDS = [
  {
    configKey: "daily_cap_points",
    configLabel: "Batas poin harian",
    configValue: "100",
    valueType: "number",
    description: "Batas akumulasi poin reward harian per karyawan.",
    isEditableBySectionHead: false,
  },
  {
    configKey: "gps_radius_meters",
    configLabel: "Radius GPS site",
    configValue: "500",
    valueType: "number",
    description: "Radius validasi GPS untuk auto-approval dan verifikasi lokasi.",
    isEditableBySectionHead: false,
  },
  {
    configKey: "auto_approve_enabled",
    configLabel: "Auto approval aktif",
    configValue: "true",
    valueType: "boolean",
    description: "Mengizinkan auto-approval untuk aktivitas yang memenuhi syarat.",
    isEditableBySectionHead: true,
  },
  {
    configKey: "penalty_pen_01",
    configLabel: "PEN-01 No Daily Report",
    configValue: "-15",
    valueType: "number",
    description: "Penalty default bila karyawan tidak mengirim laporan harian.",
    isEditableBySectionHead: false,
  },
  {
    configKey: "penalty_pen_02",
    configLabel: "PEN-02 Terlambat Input Minor",
    configValue: "-2",
    valueType: "number",
    description: "Penalty aktivitas yang disubmit pukul 17.01 - 20.00.",
    isEditableBySectionHead: false,
  },
  {
    configKey: "penalty_pen_03",
    configLabel: "PEN-03 Terlambat Input Major",
    configValue: "-5",
    valueType: "number",
    description: "Penalty aktivitas yang disubmit pukul 20.01 - 23.59.",
    isEditableBySectionHead: false,
  },
  {
    configKey: "penalty_pen_09",
    configLabel: "PEN-09 Aktivitas Ditolak Foreman",
    configValue: "-5",
    valueType: "number",
    description: "Penalty default untuk aktivitas yang ditolak saat approval.",
    isEditableBySectionHead: false,
  },
  {
    configKey: "custom_activity_daily_limit",
    configLabel: "Batas custom activity per hari",
    configValue: "3",
    valueType: "number",
    description: "Jumlah maksimum custom activity yang dapat diajukan per karyawan per hari.",
    isEditableBySectionHead: false,
  },
] as const;

function startOfDay(reference = new Date()) {
  return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
}

function endOfDay(reference = new Date()) {
  return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 23, 59, 59, 999);
}

function getShiftLabel(reference = new Date()) {
  const hour = reference.getHours();
  if (hour < 15) return "Shift Pagi";
  if (hour < 23) return "Shift Sore";
  return "Shift Malam";
}

function minutesBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

function formatDurationLabel(totalMinutes: number) {
  if (totalMinutes < 60) {
    return `${totalMinutes} menit`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}j ${minutes}m` : `${hours} jam`;
}

function normalizeStatusLabel(value: string) {
  return value.replaceAll("_", " ");
}

async function getCurrentEmployeeByEmail(email?: string | null) {
  const normalizedEmail = email?.trim().toLowerCase();

  if (normalizedEmail) {
    const [matchedEmployee] = await db
      .select()
      .from(employees)
      .where(sql`lower(${employees.email}) = ${normalizedEmail}`)
      .limit(1);

    if (matchedEmployee) {
      return matchedEmployee;
    }
  }

  const [fallbackEmployee] = await db
    .select()
    .from(employees)
    .where(eq(employees.isActive, true))
    .orderBy(asc(employees.id))
    .limit(1);

  return fallbackEmployee ?? null;
}

async function ensureDailyActivityTables() {
  await db.execute(sql`
    create table if not exists hero_activity_libraries (
      id serial primary key,
      activity_code text not null unique,
      activity_name text not null,
      category text not null default 'Technical',
      department_id integer,
      section_id integer,
      base_points integer not null default 5,
      complexity_level integer not null default 1,
      requires_photo boolean not null default false,
      requires_equipment_no boolean not null default false,
      requires_duration boolean not null default true,
      requires_location_gps boolean not null default false,
      requires_material_used boolean not null default false,
      max_daily_count integer not null default 3,
      max_points_per_day integer not null default 50,
      is_assignable boolean not null default true,
      is_self_input boolean not null default true,
      approval_required boolean not null default true,
      auto_approve_if_gps_valid boolean not null default false,
      sla_hours integer not null default 24,
      is_active boolean not null default true,
      created_by_employee_id integer references hero_employees(id) on delete set null,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `);

  await db.execute(sql`
    create table if not exists hero_job_assignments (
      id serial primary key,
      assigned_by_employee_id integer not null references hero_employees(id) on delete cascade,
      assigned_to_employee_id integer not null references hero_employees(id) on delete cascade,
      site_id integer not null references hero_sites(id) on delete cascade,
      library_activity_id integer references hero_activity_libraries(id) on delete set null,
      custom_job_name text not null default '',
      priority text not null default 'Normal',
      estimated_duration integer not null default 60,
      notes text not null default '',
      assignment_type text not null default 'individual',
      assigned_date timestamp not null default now(),
      deadline timestamp,
      status text not null default 'NOT_STARTED',
      is_mandatory boolean not null default false,
      is_recurring boolean not null default false,
      recurrence_rule text not null default '',
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `);

  await db.execute(sql`
    create table if not exists hero_activity_photos (
      id serial primary key,
      activity_id integer not null references hero_activities(id) on delete cascade,
      file_url text not null,
      caption text not null default '',
      uploaded_at timestamp not null default now()
    );
  `);

  await db.execute(sql`
    create table if not exists hero_penalty_events (
      id serial primary key,
      employee_id integer not null references hero_employees(id) on delete cascade,
      site_id integer not null references hero_sites(id) on delete cascade,
      activity_id integer references hero_activities(id) on delete set null,
      penalty_code text not null,
      penalty_type text not null,
      reference_date timestamp not null default now(),
      points_deducted integer not null default 0,
      description text not null default '',
      is_disputed boolean not null default false,
      dispute_status text not null default 'none',
      resolved_at timestamp,
      created_at timestamp not null default now()
    );
  `);

  await db.execute(sql`
    create table if not exists hero_point_disputes (
      id serial primary key,
      penalty_event_id integer not null references hero_penalty_events(id) on delete cascade,
      employee_id integer not null references hero_employees(id) on delete cascade,
      reason text not null,
      evidence_urls text not null default '[]',
      status text not null default 'pending',
      resolved_by_employee_id integer references hero_employees(id) on delete set null,
      resolution_notes text not null default '',
      created_at timestamp not null default now(),
      resolved_at timestamp
    );
  `);

  await db.execute(sql`
    create table if not exists hero_streak_records (
      id serial primary key,
      employee_id integer not null references hero_employees(id) on delete cascade,
      streak_start_date timestamp not null default now(),
      current_streak_days integer not null default 0,
      longest_streak_days integer not null default 0,
      last_activity_date timestamp,
      streak_bonus_active boolean not null default false,
      updated_at timestamp not null default now()
    );
  `);

  await db.execute(sql`
    create table if not exists hero_activity_modifiers (
      id serial primary key,
      site_id integer references hero_sites(id) on delete set null,
      event_name text not null,
      description text not null default '',
      multiplier integer not null default 100,
      start_date timestamp not null default now(),
      end_date timestamp,
      is_active boolean not null default true,
      created_by_employee_id integer references hero_employees(id) on delete set null,
      created_at timestamp not null default now()
    );
  `);

  await db.execute(sql`
    create table if not exists hero_daily_activity_configs (
      id serial primary key,
      site_id integer references hero_sites(id) on delete set null,
      config_key text not null unique,
      config_label text not null,
      config_value text not null default '',
      value_type text not null default 'number',
      description text not null default '',
      is_editable_by_section_head boolean not null default false,
      is_active boolean not null default true,
      updated_by_employee_id integer references hero_employees(id) on delete set null,
      created_at timestamp not null default now(),
      updated_at timestamp not null default now()
    );
  `);

  await db.execute(sql`
    alter table hero_activities add column if not exists library_activity_id integer;
  `);
  await db.execute(sql`
    alter table hero_activities add column if not exists assignment_id integer;
  `);
  await db.execute(sql`
    alter table hero_activities add column if not exists source_mode text not null default 'self_input';
  `);
  await db.execute(sql`
    alter table hero_activities add column if not exists custom_activity_name text not null default '';
  `);
  await db.execute(sql`
    alter table hero_activities add column if not exists custom_activity_description text not null default '';
  `);
  await db.execute(sql`
    alter table hero_activities add column if not exists submission_time timestamp;
  `);
  await db.execute(sql`
    alter table hero_activities add column if not exists submission_category text not null default 'on_time';
  `);
  await db.execute(sql`
    alter table hero_activities add column if not exists equipment_no text not null default '';
  `);
  await db.execute(sql`
    alter table hero_activities add column if not exists material_used text not null default '';
  `);
  await db.execute(sql`
    alter table hero_activities add column if not exists gps_lat text not null default '';
  `);
  await db.execute(sql`
    alter table hero_activities add column if not exists gps_lng text not null default '';
  `);
  await db.execute(sql`
    alter table hero_activities add column if not exists gps_valid boolean not null default false;
  `);
  await db.execute(sql`
    alter table hero_activities add column if not exists photo_count integer not null default 0;
  `);
  await db.execute(sql`
    alter table hero_activities add column if not exists penalty_deducted integer not null default 0;
  `);

  await db.execute(sql`
    alter table hero_approvals add column if not exists points_override integer;
  `);
  await db.execute(sql`
    alter table hero_approvals add column if not exists rejection_reason text not null default '';
  `);
  await db.execute(sql`
    alter table hero_approvals add column if not exists points_override_reason text not null default '';
  `);
  await db.execute(sql`
    alter table hero_approvals add column if not exists created_at timestamp not null default now();
  `);

  await db.execute(sql`
    alter table hero_point_events add column if not exists transaction_type text not null default 'reward';
  `);
  await db.execute(sql`
    alter table hero_point_events add column if not exists source_type text not null default 'activity';
  `);
  await db.execute(sql`
    alter table hero_point_events add column if not exists source_id integer;
  `);
  await db.execute(sql`
    alter table hero_point_events add column if not exists balance_after integer;
  `);
  await db.execute(sql`
    alter table hero_point_events add column if not exists metadata text not null default '';
  `);
}

async function seedDailyActivityReferenceData() {
  const [employeeRows, departmentRows, siteRows, libraryCount, configCount, streakCount, modifierCount] =
    await Promise.all([
      db.select().from(employees).where(eq(employees.isActive, true)).orderBy(asc(employees.id)),
      db.select().from(masterDepartments).orderBy(asc(masterDepartments.id)),
      db.select().from(sites).where(eq(sites.isActive, true)).orderBy(asc(sites.id)),
      db.select({ count: sql<number>`count(*)::int` }).from(activityLibraries),
      db.select({ count: sql<number>`count(*)::int` }).from(dailyActivityConfigs),
      db.select({ count: sql<number>`count(*)::int` }).from(streakRecords),
      db.select({ count: sql<number>`count(*)::int` }).from(activityModifiers),
    ]);

  const creatorEmployee =
    employeeRows.find((employee) => employee.accessRole.toLowerCase().includes("admin")) ??
    employeeRows[0] ??
    null;
  const departmentByName = new Map(
    departmentRows.map((department) => [department.name.trim().toLowerCase(), department]),
  );
  const defaultSite = siteRows[0] ?? null;

  if ((libraryCount[0]?.count ?? 0) === 0 && creatorEmployee) {
    await db.insert(activityLibraries).values(
      DEFAULT_LIBRARY_SEEDS.map((item) => ({
        activityCode: item.activityCode,
        activityName: item.activityName,
        category: item.category,
        departmentId: departmentByName.get(item.departmentName.trim().toLowerCase())?.id ?? null,
        sectionId: null,
        basePoints: item.basePoints,
        complexityLevel: item.complexityLevel,
        requiresPhoto: item.requiresPhoto,
        requiresEquipmentNo: item.requiresEquipmentNo,
        requiresDuration: item.requiresDuration,
        requiresLocationGps: item.requiresLocationGps,
        requiresMaterialUsed: item.requiresMaterialUsed,
        maxDailyCount: item.maxDailyCount,
        maxPointsPerDay: item.maxPointsPerDay,
        isAssignable: item.isAssignable,
        isSelfInput: item.isSelfInput,
        approvalRequired: item.approvalRequired,
        autoApproveIfGpsValid: item.autoApproveIfGpsValid,
        slaHours: item.slaHours,
        isActive: true,
        createdByEmployeeId: creatorEmployee.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );
  }

  if ((configCount[0]?.count ?? 0) === 0) {
    await db.insert(dailyActivityConfigs).values(
      DEFAULT_CONFIG_SEEDS.map((config) => ({
        siteId: defaultSite?.id ?? null,
        configKey: config.configKey,
        configLabel: config.configLabel,
        configValue: config.configValue,
        valueType: config.valueType,
        description: config.description,
        isEditableBySectionHead: config.isEditableBySectionHead,
        isActive: true,
        updatedByEmployeeId: creatorEmployee?.id ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );
  }

  if ((streakCount[0]?.count ?? 0) === 0 && employeeRows.length > 0) {
    await db.insert(streakRecords).values(
      employeeRows.slice(0, 8).map((employee, index) => ({
        employeeId: employee.id,
        streakStartDate: new Date(Date.now() - (index + 3) * 24 * 60 * 60 * 1000),
        currentStreakDays: Math.max(2, 9 - index),
        longestStreakDays: Math.max(5, 12 - index),
        lastActivityDate: new Date(),
        streakBonusActive: index < 3,
        updatedAt: new Date(),
      })),
    );
  }

  if ((modifierCount[0]?.count ?? 0) === 0 && creatorEmployee && defaultSite) {
    await db.insert(activityModifiers).values([
      {
        siteId: defaultSite.id,
        eventName: "Site Competition Week",
        description: "Multiplier reward untuk mendorong pelaporan disiplin selama kompetisi site.",
        multiplier: 150,
        startDate: startOfDay(new Date()),
        endDate: endOfDay(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
        isActive: true,
        createdByEmployeeId: creatorEmployee.id,
        createdAt: new Date(),
      },
    ]);
  }

  const [assignmentCount, todayActivityCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(jobAssignments),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(activities)
      .where(
        and(
          gte(activities.startTime, startOfDay()),
          lte(activities.startTime, endOfDay()),
        ),
      ),
  ]);

  if ((assignmentCount[0]?.count ?? 0) === 0 && employeeRows.length > 1 && defaultSite) {
    const libraryRows = await db.select().from(activityLibraries).orderBy(asc(activityLibraries.id));
    const manager =
      employeeRows.find((employee) =>
        employee.role.toLowerCase().includes("foreman") ||
        employee.role.toLowerCase().includes("leader") ||
        employee.accessRole.toLowerCase().includes("admin"),
      ) ?? employeeRows[0];
    const assignees = employeeRows.filter((employee) => employee.id !== manager.id).slice(0, 4);

    if (libraryRows.length > 0 && assignees.length > 0) {
      await db.insert(jobAssignments).values(
        assignees.map((employee, index) => ({
          assignedByEmployeeId: manager.id,
          assignedToEmployeeId: employee.id,
          siteId: employee.siteId,
          libraryActivityId: libraryRows[index % libraryRows.length]?.id ?? null,
          customJobName: "",
          priority: index === 0 ? "Emergency" : index % 2 === 0 ? "High" : "Normal",
          estimatedDuration: index === 0 ? 150 : 90,
          notes:
            index === 0
              ? "Pastikan dokumentasi foto lengkap dan update status sebelum makan siang."
              : "Jalankan sesuai urutan pekerjaan dan submit bukti lapangan.",
          assignmentType: "individual",
          assignedDate: startOfDay(new Date()),
          deadline: new Date(Date.now() + (index + 6) * 60 * 60 * 1000),
          status: index === 0 ? "IN_PROGRESS" : "NOT_STARTED",
          isMandatory: index < 2,
          isRecurring: false,
          recurrenceRule: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
    }
  }

  if ((todayActivityCount[0]?.count ?? 0) === 0 && defaultSite) {
    const [libraryRows, assignmentRows] = await Promise.all([
      db.select().from(activityLibraries).orderBy(asc(activityLibraries.id)),
      db.select().from(jobAssignments).orderBy(asc(jobAssignments.id)),
    ]);
    const activeAssignments = assignmentRows.slice(0, 2);

    for (const [index, assignment] of activeAssignments.entries()) {
      const library = libraryRows.find((row) => row.id === assignment.libraryActivityId) ?? libraryRows[index];
      if (!library) {
        continue;
      }

      const employee = employeeRows.find((row) => row.id === assignment.assignedToEmployeeId);
      const approver = employeeRows.find((row) => row.id === assignment.assignedByEmployeeId);
      if (!employee) {
        continue;
      }

      const startTime = new Date(Date.now() - (index + 4) * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + (75 + index * 20) * 60 * 1000);
      const status = index === 0 ? "Pending L1" : "Approved";
      const submissionTime = new Date(endTime.getTime() + 20 * 60 * 1000);
      const points = library.basePoints + (index === 1 ? 5 : 0);
      const penalty = index === 0 ? 2 : 0;

      const [createdActivity] = await db
        .insert(activities)
        .values({
          siteId: employee.siteId,
          employeeId: employee.id,
          activityCode: library.activityCode,
          activityType: library.category,
          title: library.activityName,
          unitNumber: `UNIT-${index + 11}`,
          libraryActivityId: library.id,
          assignmentId: assignment.id,
          sourceMode: "assigned",
          customActivityName: "",
          customActivityDescription: "",
          startTime,
          endTime,
          status,
          priority: assignment.priority,
          submissionTime,
          submissionCategory: index === 0 ? "late_minor" : "on_time",
          equipmentNo: `EQ-${index + 501}`,
          materialUsed: index === 0 ? "Valve cap, torque wrench" : "",
          gpsLat: "-0.9123",
          gpsLng: "119.8761",
          gpsValid: true,
          photoCount: index === 0 ? 2 : 1,
          remarks:
            index === 0
              ? "Unit selesai diperiksa, menunggu approval foreman karena prioritas emergency."
              : "Aktivitas rutin selesai sebelum target dan sudah diverifikasi supervisor.",
          pointsAwarded: points,
          penaltyDeducted: penalty,
          createdAt: startTime,
        })
        .returning({ id: activities.id });

      await db.insert(activityPhotos).values([
        {
          activityId: createdActivity.id,
          fileUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
          caption: "Dokumentasi lapangan 1",
          uploadedAt: submissionTime,
        },
      ]);

      if (status === "Approved") {
        const currentBalance = employee.totalPoints + points - penalty;
        await db.insert(pointEvents).values({
          employeeId: employee.id,
          transactionType: "reward",
          sourceType: "activity",
          sourceId: createdActivity.id,
          category: "Daily Activity",
          label: `${library.activityName} • Approved`,
          points: points - penalty,
          balanceAfter: currentBalance,
          metadata: JSON.stringify({
            assignmentId: assignment.id,
            submissionCategory: "on_time",
            autoApproved: false,
          }),
          createdAt: submissionTime,
        });

        await db
          .update(employees)
          .set({
            totalPoints: employee.totalPoints + points - penalty,
          })
          .where(eq(employees.id, employee.id));
      } else if (approver) {
        await db.insert(approvals).values({
          activityId: createdActivity.id,
          level: 1,
          approverName: approver.name,
          approverEmployeeId: approver.id,
          status: "pending",
          submittedAt: submissionTime,
          overtimeMinutes: 0,
          resolutionSource: "daily_activity",
          routeSnapshot: "",
          decisionNote: "",
          createdAt: submissionTime,
        });
      }

      if (penalty > 0) {
        await db.insert(penaltyEvents).values({
          employeeId: employee.id,
          siteId: employee.siteId,
          activityId: createdActivity.id,
          penaltyCode: "PEN-02",
          penaltyType: "late_minor",
          referenceDate: submissionTime,
          pointsDeducted: penalty,
          description: "Submit aktivitas masuk window late minor.",
          isDisputed: false,
          disputeStatus: "none",
          createdAt: submissionTime,
        });
      }
    }
  }

  const [penaltyCount, disputeCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(penaltyEvents),
    db.select({ count: sql<number>`count(*)::int` }).from(pointDisputes),
  ]);

  if ((penaltyCount[0]?.count ?? 0) > 0 && (disputeCount[0]?.count ?? 0) === 0) {
    const [latestPenalty] = await db
      .select()
      .from(penaltyEvents)
      .orderBy(desc(penaltyEvents.createdAt))
      .limit(1);

    if (latestPenalty) {
      await db.insert(pointDisputes).values({
        penaltyEventId: latestPenalty.id,
        employeeId: latestPenalty.employeeId,
        reason: "Aktivitas sebenarnya selesai lebih cepat, sinyal site membuat submit tertunda.",
        evidenceUrls: JSON.stringify([
          "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80",
        ]),
        status: "pending",
        resolvedByEmployeeId: null,
        resolutionNotes: "",
        createdAt: new Date(),
        resolvedAt: null,
      });

      await db
        .update(penaltyEvents)
        .set({
          isDisputed: true,
          disputeStatus: "pending",
        })
        .where(eq(penaltyEvents.id, latestPenalty.id));
    }
  }
}

export async function ensureDailyActivitySeedData() {
  if (dailyActivitySeedPromise) {
    return dailyActivitySeedPromise;
  }

  dailyActivitySeedPromise = (async () => {
    await ensureHeroGovernanceSeedData();
    await ensureDailyActivityTables();
    await seedDailyActivityReferenceData();
  })().catch((error) => {
    dailyActivitySeedPromise = null;
    throw error;
  });

  return dailyActivitySeedPromise;
}

export async function getDailyActivityConfigMap() {
  await ensureDailyActivitySeedData();

  const rows = await db
    .select({
      configKey: dailyActivityConfigs.configKey,
      configValue: dailyActivityConfigs.configValue,
    })
    .from(dailyActivityConfigs)
    .where(eq(dailyActivityConfigs.isActive, true));

  return new Map(
    rows.map((row) => [row.configKey, Number.parseInt(row.configValue, 10) || 0]),
  );
}

export async function getDailyActivityEmployeeData(email?: string | null) {
  await ensureDailyActivitySeedData();

  const employee = await getCurrentEmployeeByEmail(email);
  if (!employee) {
    return null;
  }

  const [site] = await db.select().from(sites).where(eq(sites.id, employee.siteId)).limit(1);
  const dayStart = startOfDay();
  const dayEnd = endOfDay();

  const [assignmentRows, activityRows, pointRows, penaltyRows, streak, libraryRows, modifierRows] =
    await Promise.all([
      db
        .select({
          id: jobAssignments.id,
          priority: jobAssignments.priority,
          notes: jobAssignments.notes,
          status: jobAssignments.status,
          isMandatory: jobAssignments.isMandatory,
          estimatedDuration: jobAssignments.estimatedDuration,
          deadline: jobAssignments.deadline,
          createdAt: jobAssignments.createdAt,
          assignmentType: jobAssignments.assignmentType,
          customJobName: jobAssignments.customJobName,
          assignedByName: employees.name,
          libraryActivityId: activityLibraries.id,
          activityCode: activityLibraries.activityCode,
          activityName: activityLibraries.activityName,
          category: activityLibraries.category,
          requiresPhoto: activityLibraries.requiresPhoto,
          requiresEquipmentNo: activityLibraries.requiresEquipmentNo,
          requiresMaterialUsed: activityLibraries.requiresMaterialUsed,
          basePoints: activityLibraries.basePoints,
        })
        .from(jobAssignments)
        .leftJoin(activityLibraries, eq(jobAssignments.libraryActivityId, activityLibraries.id))
        .innerJoin(employees, eq(jobAssignments.assignedByEmployeeId, employees.id))
        .where(
          and(
            eq(jobAssignments.assignedToEmployeeId, employee.id),
            gte(jobAssignments.assignedDate, dayStart),
            lte(jobAssignments.assignedDate, dayEnd),
          ),
        )
        .orderBy(asc(jobAssignments.deadline), desc(jobAssignments.id)),
      db
        .select({
          id: activities.id,
          activityCode: activities.activityCode,
          activityType: activities.activityType,
          title: activities.title,
          unitNumber: activities.unitNumber,
          sourceMode: activities.sourceMode,
          status: activities.status,
          priority: activities.priority,
          startTime: activities.startTime,
          endTime: activities.endTime,
          submissionTime: activities.submissionTime,
          submissionCategory: activities.submissionCategory,
          pointsAwarded: activities.pointsAwarded,
          penaltyDeducted: activities.penaltyDeducted,
          equipmentNo: activities.equipmentNo,
          materialUsed: activities.materialUsed,
          gpsValid: activities.gpsValid,
          photoCount: activities.photoCount,
          remarks: activities.remarks,
          assignmentId: activities.assignmentId,
          libraryName: activityLibraries.activityName,
        })
        .from(activities)
        .leftJoin(activityLibraries, eq(activities.libraryActivityId, activityLibraries.id))
        .where(
          and(
            eq(activities.employeeId, employee.id),
            gte(activities.startTime, dayStart),
            lte(activities.startTime, dayEnd),
          ),
        )
        .orderBy(desc(activities.startTime), desc(activities.id)),
      db
        .select({
          id: pointEvents.id,
          category: pointEvents.category,
          label: pointEvents.label,
          points: pointEvents.points,
          transactionType: pointEvents.transactionType,
          createdAt: pointEvents.createdAt,
        })
        .from(pointEvents)
        .where(eq(pointEvents.employeeId, employee.id))
        .orderBy(desc(pointEvents.createdAt))
        .limit(8),
      db
        .select({
          id: penaltyEvents.id,
          penaltyCode: penaltyEvents.penaltyCode,
          penaltyType: penaltyEvents.penaltyType,
          pointsDeducted: penaltyEvents.pointsDeducted,
          description: penaltyEvents.description,
          disputeStatus: penaltyEvents.disputeStatus,
          isDisputed: penaltyEvents.isDisputed,
          createdAt: penaltyEvents.createdAt,
        })
        .from(penaltyEvents)
        .where(eq(penaltyEvents.employeeId, employee.id))
        .orderBy(desc(penaltyEvents.createdAt))
        .limit(5),
      db
        .select()
        .from(streakRecords)
        .where(eq(streakRecords.employeeId, employee.id))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      db
        .select({
          id: activityLibraries.id,
          activityCode: activityLibraries.activityCode,
          activityName: activityLibraries.activityName,
          category: activityLibraries.category,
          basePoints: activityLibraries.basePoints,
          complexityLevel: activityLibraries.complexityLevel,
          requiresPhoto: activityLibraries.requiresPhoto,
          requiresEquipmentNo: activityLibraries.requiresEquipmentNo,
          requiresMaterialUsed: activityLibraries.requiresMaterialUsed,
          slaHours: activityLibraries.slaHours,
        })
        .from(activityLibraries)
        .where(
          and(
            eq(activityLibraries.isActive, true),
            eq(activityLibraries.isSelfInput, true),
            or(
              eq(activityLibraries.departmentId, employee.departmentId ?? -1),
              isNull(activityLibraries.departmentId),
            ),
          ),
        )
        .orderBy(desc(activityLibraries.basePoints), asc(activityLibraries.activityName))
        .limit(6),
      db
        .select()
        .from(activityModifiers)
        .where(
          and(
            eq(activityModifiers.isActive, true),
            lte(activityModifiers.startDate, new Date()),
            or(isNull(activityModifiers.endDate), gte(activityModifiers.endDate, new Date())),
          ),
        )
        .orderBy(desc(activityModifiers.multiplier), asc(activityModifiers.eventName)),
    ]);

  const approvedOrSubmitted = activityRows.filter((row) =>
    ["approved", "pending l1", "pending approval", "submitted"].includes(row.status.toLowerCase()),
  ).length;
  const pointsToday = pointRows
    .filter((row) => row.createdAt >= dayStart && row.createdAt <= dayEnd)
    .reduce((total, row) => total + row.points, 0);
  const penaltyToday = penaltyRows
    .filter((row) => row.createdAt >= dayStart && row.createdAt <= dayEnd)
    .reduce((total, row) => total + row.pointsDeducted, 0);

  return {
    employee,
    site,
    summary: {
      shift: getShiftLabel(),
      jobsAssigned: assignmentRows.length,
      jobsCompleted: approvedOrSubmitted,
      pointsToday,
      penaltyToday,
      currentLevel: employee.levelName,
      streakDays: streak?.currentStreakDays ?? 0,
      syncAt: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      activeModifier:
        modifierRows[0] != null
          ? `${modifierRows[0].eventName} (${modifierRows[0].multiplier}%)`
          : null,
    },
    assignments: assignmentRows.map((row) => ({
      ...row,
      durationLabel: formatDurationLabel(row.estimatedDuration),
      statusLabel: normalizeStatusLabel(row.status),
    })),
    activities: activityRows.map((row) => ({
      ...row,
      durationMinutes: minutesBetween(row.startTime, row.endTime),
      durationLabel: formatDurationLabel(minutesBetween(row.startTime, row.endTime)),
      pointsNet: row.pointsAwarded - row.penaltyDeducted,
      statusLabel: row.status,
    })),
    pointsFeed: pointRows,
    penalties: penaltyRows,
    streak,
    availableLibrary: libraryRows,
    revalidatePaths: DAILY_ACTIVITY_REVALIDATE_PATHS,
  };
}

export async function getDailyActivityTeamBoardData(email?: string | null) {
  await ensureDailyActivitySeedData();

  const currentEmployee = await getCurrentEmployeeByEmail(email);
  if (!currentEmployee) {
    return null;
  }

  let team = await db
    .select()
    .from(employees)
    .where(eq(employees.directManagerId, currentEmployee.id))
    .orderBy(asc(employees.name));

  if (team.length === 0) {
    team = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.siteId, currentEmployee.siteId),
          eq(employees.isActive, true),
        ),
      )
      .orderBy(asc(employees.name))
      .limit(6);
  }

  const teamIds = Array.from(new Set(team.map((member) => member.id)));
  const dayStart = startOfDay();
  const dayEnd = endOfDay();

  const [assignmentRows, activityRows, pendingApprovalsRows, disputeRows] = await Promise.all([
    teamIds.length === 0
      ? []
      : db
          .select({
            id: jobAssignments.id,
            assignedToEmployeeId: jobAssignments.assignedToEmployeeId,
            status: jobAssignments.status,
            priority: jobAssignments.priority,
            deadline: jobAssignments.deadline,
            isMandatory: jobAssignments.isMandatory,
            activityName: activityLibraries.activityName,
            customJobName: jobAssignments.customJobName,
          })
          .from(jobAssignments)
          .leftJoin(activityLibraries, eq(jobAssignments.libraryActivityId, activityLibraries.id))
          .where(
            and(
              inArray(jobAssignments.assignedToEmployeeId, teamIds),
              gte(jobAssignments.assignedDate, dayStart),
              lte(jobAssignments.assignedDate, dayEnd),
            ),
          ),
    teamIds.length === 0
      ? []
      : db
          .select({
            id: activities.id,
            employeeId: activities.employeeId,
            title: activities.title,
            status: activities.status,
            priority: activities.priority,
            startTime: activities.startTime,
            endTime: activities.endTime,
            submissionTime: activities.submissionTime,
          })
          .from(activities)
          .where(
            and(
              inArray(activities.employeeId, teamIds),
              gte(activities.startTime, dayStart),
              lte(activities.startTime, dayEnd),
            ),
          ),
    teamIds.length === 0
      ? []
      : db
          .select({
            approvalId: approvals.id,
            level: approvals.level,
            submittedAt: approvals.submittedAt,
            approverName: approvals.approverName,
            status: approvals.status,
            activityId: activities.id,
            activityTitle: activities.title,
            priority: activities.priority,
            requesterName: employees.name,
            requesterJobTitle: employees.jobTitle,
          })
          .from(approvals)
          .innerJoin(activities, eq(approvals.activityId, activities.id))
          .innerJoin(employees, eq(activities.employeeId, employees.id))
          .where(
            and(
              inArray(activities.employeeId, teamIds),
              eq(approvals.status, "pending"),
            ),
          )
          .orderBy(desc(approvals.submittedAt), desc(approvals.id)),
    teamIds.length === 0
      ? []
      : db
          .select({
            id: pointDisputes.id,
            employeeName: employees.name,
            status: pointDisputes.status,
            reason: pointDisputes.reason,
            createdAt: pointDisputes.createdAt,
            penaltyCode: penaltyEvents.penaltyCode,
          })
          .from(pointDisputes)
          .innerJoin(employees, eq(pointDisputes.employeeId, employees.id))
          .innerJoin(penaltyEvents, eq(pointDisputes.penaltyEventId, penaltyEvents.id))
          .where(inArray(pointDisputes.employeeId, teamIds))
          .orderBy(desc(pointDisputes.createdAt))
          .limit(4),
  ]);

  const memberCards = team.map((member) => {
    const memberAssignments = assignmentRows.filter((row) => row.assignedToEmployeeId === member.id);
    const latestActivity = activityRows
      .filter((row) => row.employeeId === member.id)
      .sort((left, right) => right.startTime.getTime() - left.startTime.getTime())[0] ?? null;
    const completedCount = activityRows.filter(
      (row) =>
        row.employeeId === member.id &&
        ["approved", "pending l1", "submitted"].includes(row.status.toLowerCase()),
    ).length;
    const progress =
      memberAssignments.length > 0
        ? Math.round((completedCount / memberAssignments.length) * 100)
        : latestActivity
          ? 100
          : 0;

    const status =
      latestActivity?.status?.toLowerCase().includes("pending")
        ? "Needs Review"
        : memberAssignments.some((row) => row.status === "IN_PROGRESS")
          ? "Working"
          : completedCount > 0
            ? "On Site"
            : "Traveling";

    return {
      id: member.id,
      name: member.name,
      role: member.jobTitle || member.role,
      currentJob:
        latestActivity?.title ??
        memberAssignments[0]?.activityName ??
        memberAssignments[0]?.customJobName ??
        "Belum ada aktivitas hari ini",
      status,
      progress,
      lastUpdate:
        latestActivity?.submissionTime?.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }) ?? "Belum update",
      mandatoryCount: memberAssignments.filter((row) => row.isMandatory).length,
    };
  });

  const overdueAssignments = assignmentRows.filter(
    (row) => row.deadline != null && row.deadline.getTime() < Date.now() && row.status !== "APPROVED",
  ).length;

  return {
    lead: currentEmployee,
    summary: {
      activeWorkers: team.length,
      checkedIn: activityRows.length > 0 ? new Set(activityRows.map((row) => row.employeeId)).size : 0,
      pendingApproval: pendingApprovalsRows.length,
      emergencyJobs: assignmentRows.filter((row) => row.priority.toLowerCase() === "emergency").length,
      overtimeCandidates: activityRows.filter((row) => minutesBetween(row.startTime, row.endTime) >= 8 * 60).length,
      overdueAssignments,
    },
    members: memberCards,
    pendingApprovals: pendingApprovalsRows.map((row) => ({
      ...row,
      risk:
        row.priority.toLowerCase() === "emergency"
          ? "Emergency"
          : row.level >= 2
            ? "Escalation"
            : "Routine",
    })),
    disputes: disputeRows,
    assignmentOptions: await db
      .select({
        id: activityLibraries.id,
        activityCode: activityLibraries.activityCode,
        activityName: activityLibraries.activityName,
        category: activityLibraries.category,
      })
      .from(activityLibraries)
      .where(eq(activityLibraries.isAssignable, true))
      .orderBy(asc(activityLibraries.activityName)),
    team,
  };
}

export async function getDailyActivityLibraryData(email?: string | null) {
  await ensureDailyActivitySeedData();

  const currentEmployee = await getCurrentEmployeeByEmail(email);
  const [rows, departmentsRows, sectionsRows, creators] = await Promise.all([
    db
      .select({
        id: activityLibraries.id,
        activityCode: activityLibraries.activityCode,
        activityName: activityLibraries.activityName,
        category: activityLibraries.category,
        departmentId: activityLibraries.departmentId,
        sectionId: activityLibraries.sectionId,
        departmentName: masterDepartments.name,
        sectionName: masterSections.name,
        basePoints: activityLibraries.basePoints,
        complexityLevel: activityLibraries.complexityLevel,
        requiresPhoto: activityLibraries.requiresPhoto,
        requiresEquipmentNo: activityLibraries.requiresEquipmentNo,
        requiresDuration: activityLibraries.requiresDuration,
        requiresLocationGps: activityLibraries.requiresLocationGps,
        requiresMaterialUsed: activityLibraries.requiresMaterialUsed,
        maxDailyCount: activityLibraries.maxDailyCount,
        maxPointsPerDay: activityLibraries.maxPointsPerDay,
        isAssignable: activityLibraries.isAssignable,
        isSelfInput: activityLibraries.isSelfInput,
        approvalRequired: activityLibraries.approvalRequired,
        autoApproveIfGpsValid: activityLibraries.autoApproveIfGpsValid,
        slaHours: activityLibraries.slaHours,
        isActive: activityLibraries.isActive,
        createdAt: activityLibraries.createdAt,
        creatorName: employees.name,
      })
      .from(activityLibraries)
      .leftJoin(masterDepartments, eq(activityLibraries.departmentId, masterDepartments.id))
      .leftJoin(masterSections, eq(activityLibraries.sectionId, masterSections.id))
      .leftJoin(employees, eq(activityLibraries.createdByEmployeeId, employees.id))
      .orderBy(desc(activityLibraries.isActive), asc(activityLibraries.category), asc(activityLibraries.activityName)),
    db.select().from(masterDepartments).orderBy(asc(masterDepartments.name)),
    db.select().from(masterSections).orderBy(asc(masterSections.name)),
    db
      .select({
        id: employees.id,
        name: employees.name,
        department: employees.department,
        role: employees.role,
      })
      .from(employees)
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.name)),
  ]);

  const categoryCount = rows.reduce<Record<string, number>>((accumulator, row) => {
    accumulator[row.category] = (accumulator[row.category] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    currentEmployee,
    metrics: {
      total: rows.length,
      active: rows.filter((row) => row.isActive).length,
      selfInput: rows.filter((row) => row.isSelfInput).length,
      autoApproveReady: rows.filter((row) => row.autoApproveIfGpsValid).length,
    },
    categories: Object.entries(categoryCount)
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count),
    rows,
    departments: departmentsRows,
    sections: sectionsRows,
    creators,
  };
}

export async function getDailyActivityConfigurationData(email?: string | null) {
  await ensureDailyActivitySeedData();

  const currentEmployee = await getCurrentEmployeeByEmail(email);
  const [configRows, modifierRows, penaltyRows, disputeRows, siteRows, employeeRows] = await Promise.all([
    db
      .select({
        id: dailyActivityConfigs.id,
        siteId: dailyActivityConfigs.siteId,
        configKey: dailyActivityConfigs.configKey,
        configLabel: dailyActivityConfigs.configLabel,
        configValue: dailyActivityConfigs.configValue,
        valueType: dailyActivityConfigs.valueType,
        description: dailyActivityConfigs.description,
        isEditableBySectionHead: dailyActivityConfigs.isEditableBySectionHead,
        isActive: dailyActivityConfigs.isActive,
        updatedAt: dailyActivityConfigs.updatedAt,
        siteName: sites.name,
        updatedByName: employees.name,
      })
      .from(dailyActivityConfigs)
      .leftJoin(sites, eq(dailyActivityConfigs.siteId, sites.id))
      .leftJoin(employees, eq(dailyActivityConfigs.updatedByEmployeeId, employees.id))
      .orderBy(asc(dailyActivityConfigs.configKey)),
    db
      .select({
        id: activityModifiers.id,
        siteId: activityModifiers.siteId,
        eventName: activityModifiers.eventName,
        description: activityModifiers.description,
        multiplier: activityModifiers.multiplier,
        startDate: activityModifiers.startDate,
        endDate: activityModifiers.endDate,
        isActive: activityModifiers.isActive,
        siteName: sites.name,
        creatorName: employees.name,
      })
      .from(activityModifiers)
      .leftJoin(sites, eq(activityModifiers.siteId, sites.id))
      .leftJoin(employees, eq(activityModifiers.createdByEmployeeId, employees.id))
      .orderBy(desc(activityModifiers.isActive), asc(activityModifiers.eventName)),
    db
      .select({
        id: penaltyEvents.id,
        penaltyCode: penaltyEvents.penaltyCode,
        penaltyType: penaltyEvents.penaltyType,
        pointsDeducted: penaltyEvents.pointsDeducted,
        description: penaltyEvents.description,
        disputeStatus: penaltyEvents.disputeStatus,
        employeeName: employees.name,
        createdAt: penaltyEvents.createdAt,
      })
      .from(penaltyEvents)
      .innerJoin(employees, eq(penaltyEvents.employeeId, employees.id))
      .orderBy(desc(penaltyEvents.createdAt))
      .limit(10),
    db
      .select({
        id: pointDisputes.id,
        employeeName: employees.name,
        status: pointDisputes.status,
        reason: pointDisputes.reason,
        resolutionNotes: pointDisputes.resolutionNotes,
        createdAt: pointDisputes.createdAt,
        resolvedAt: pointDisputes.resolvedAt,
        penaltyCode: penaltyEvents.penaltyCode,
      })
      .from(pointDisputes)
      .innerJoin(employees, eq(pointDisputes.employeeId, employees.id))
      .innerJoin(penaltyEvents, eq(pointDisputes.penaltyEventId, penaltyEvents.id))
      .orderBy(desc(pointDisputes.createdAt))
      .limit(10),
    db.select().from(sites).where(eq(sites.isActive, true)).orderBy(asc(sites.name)),
    db
      .select({
        id: employees.id,
        name: employees.name,
        role: employees.role,
      })
      .from(employees)
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.name)),
  ]);

  return {
    currentEmployee,
    metrics: {
      settings: configRows.length,
      activeModifiers: modifierRows.filter((row) => row.isActive).length,
      penaltyEvents: penaltyRows.length,
      pendingDisputes: disputeRows.filter((row) => row.status === "pending").length,
    },
    settings: configRows,
    modifiers: modifierRows,
    penaltyEvents: penaltyRows,
    disputes: disputeRows,
    sites: siteRows,
    employees: employeeRows,
  };
}

export { DAILY_ACTIVITY_REVALIDATE_PATHS };
