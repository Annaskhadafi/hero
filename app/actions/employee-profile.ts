"use server";

import { db } from "@/db";
import {
  employees,
  hrPositions,
  masterDepartments,
  masterSections,
  sites,
  trainingRecords,
  sioCertifications,
  hcEmployeeContractReviews,
  hcPerformanceReviews,
  hcPerformanceCycles,
  hcDisciplinaryActions,
  hcViolationCategories,
  pointEvents,
  penaltyEvents,
  employeeBadges,
  badges,
  attendanceRecords,
  hcLeaveRequests,
  hcLeaveTypes,
  wellnessRecords,
  hcCandidateMcu,
  streakRecords,
} from "@/db/schema/hero";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";

function calculateServiceBand(joinDateStr: string | null | undefined): string | null {
  if (!joinDateStr) return null;
  const joinDate = new Date(joinDateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - joinDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffMonths = diffDays / 30.4375;
  const diffYears = diffDays / 365.25;

  if (diffMonths < 6) {
    return "Less than 6 months";
  } else if (diffMonths < 12) {
    return "6 months to <1 year";
  } else if (diffYears < 2) {
    return "1 year to <2 years";
  } else if (diffYears < 5) {
    return "2 to <5 years";
  } else if (diffYears < 10) {
    return "5 to <10 years";
  } else {
    return "10 years or above";
  }
}

/**
 * Sanitizes birth dates that got corrupted in database with future years (like 2084 instead of 1984).
 */
function sanitizeBirthDate(dateStr: string | null) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    const currentYear = new Date().getFullYear();
    if (d.getFullYear() > currentYear) {
      d.setFullYear(d.getFullYear() - 100);
    }
    return d.toISOString().split("T")[0];
  } catch {
    return dateStr;
  }
}

function normalizeGenderCode(gender: string | null) {
  if (!gender) return null;
  const g = gender.toLowerCase().trim();
  if (g === "l" || g === "m" || g === "male" || g === "laki-laki" || g === "laki - laki") return "1";
  if (g === "p" || g === "f" || g === "female" || g === "perempuan") return "2";
  return gender;
}

export async function getEmployeeFullProfile(hrEmployeeId: number) {
  // 1. Fetch main HR Employee details
  const [hrEmp] = await db
    .select({
      id: employees.id,
      employeeId: employees.employeeSn,
      fullName: employees.name,
      email: employees.email,
      joinDate: employees.joinDate,
      contractStart: employees.contractDurationStart,
      contractEnd: employees.contractDurationEnd,
      birthDate: employees.birthDate,
      accountStatus: employees.employmentStatus,
      genderCode: sql<string | null>`${employees.gender}`.as('gender_code'),
      ageBandCode: sql<string | null>`null`.as('age_band_code'),
      serviceBandCode: sql<string | null>`null`.as('service_band_code'),
      educationCode: employees.education,
      demographicEmployeeStatusCode: sql<string | null>`null`.as('demographic_employee_status_code'),
      locationCategoryCode: sql<string | null>`null`.as('location_category_code'),
      isActive: employees.isActive,
      jobTitle: hrPositions.rankName,
      levelName: hrPositions.levelName,
      departmentId: employees.departmentId,
      departmentName: masterDepartments.name,
      sectionName: masterSections.name,
      siteName: sites.name,
      location: employees.workLocation,
      authUserId: employees.authUserId,
    })
    .from(employees)
    .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .where(eq(employees.id, hrEmployeeId))
    .limit(1);

  if (!hrEmp) return null;

  // 2. Resolve ALL corresponding gamified employee records (matches by SN, Name, Email, or AuthUserId)
  // This allows unifying duplicate/split profile entries in the database.
  const matchConditions = [];
  if (hrEmp.employeeId) {
    matchConditions.push(eq(employees.employeeSn, hrEmp.employeeId));
    matchConditions.push(eq(employees.employeeSn, `EMP-${hrEmp.employeeId}`));
  }
  if (hrEmp.fullName) {
    matchConditions.push(eq(employees.name, hrEmp.fullName));
  }
  if (hrEmp.email) {
    matchConditions.push(eq(employees.email, hrEmp.email));
  }
  if (hrEmp.authUserId) {
    matchConditions.push(eq(employees.authUserId, hrEmp.authUserId));
  }

  const matchedEmployees = await db
    .select()
    .from(employees)
    .where(or(...matchConditions));

  const employeeIds = matchedEmployees.map((e) => e.id);
  const activeGamifiedEmp = matchedEmployees.find((e) => e.employmentStatus === "active") || matchedEmployees[0] || null;

  // 3. Apply profile sync/corrections: Use cleaner operational data from hero_employees if hr_employees is dummy/corrupted
  if (activeGamifiedEmp) {
    if (activeGamifiedEmp.birthDate) {
      hrEmp.birthDate = sanitizeBirthDate(activeGamifiedEmp.birthDate);
    }
    if (activeGamifiedEmp.gender) {
      hrEmp.genderCode = normalizeGenderCode(activeGamifiedEmp.gender);
    }
    if (!hrEmp.educationCode && activeGamifiedEmp.education) {
      hrEmp.educationCode = activeGamifiedEmp.education;
    }
    if (!hrEmp.location && activeGamifiedEmp.workLocation) {
      hrEmp.location = activeGamifiedEmp.workLocation;
    }
    if (!hrEmp.contractStart && activeGamifiedEmp.contractDurationStart) {
      hrEmp.contractStart = activeGamifiedEmp.contractDurationStart;
    }
    if (!hrEmp.contractEnd && activeGamifiedEmp.contractDurationEnd) {
      hrEmp.contractEnd = activeGamifiedEmp.contractDurationEnd;
    }
    if (!hrEmp.joinDate && activeGamifiedEmp.joinDate) {
      hrEmp.joinDate = activeGamifiedEmp.joinDate;
    }
  }

  // Calculate service band if null/empty
  if (!hrEmp.serviceBandCode) {
    hrEmp.serviceBandCode = calculateServiceBand(hrEmp.joinDate);
  }

  // Fallback date sanitization if still in future
  if (hrEmp.birthDate) {
    hrEmp.birthDate = sanitizeBirthDate(hrEmp.birthDate);
  }
  if (hrEmp.genderCode) {
    hrEmp.genderCode = normalizeGenderCode(hrEmp.genderCode);
  }

  // 4. Fetch training records (for all matched IDs)
  let trainings: any[] = [];
  if (employeeIds.length > 0) {
    trainings = await db
      .select()
      .from(trainingRecords)
      .where(inArray(trainingRecords.employeeId, employeeIds))
      .orderBy(desc(trainingRecords.completedYear));
  }

  // 5. Fetch SIO/POP/POM certifications
  let sioCertificationsData: any[] = [];
  if (employeeIds.length > 0) {
    sioCertificationsData = await db
      .select()
      .from(sioCertifications)
      .where(inArray(sioCertifications.employeeId, employeeIds))
      .orderBy(desc(sioCertifications.expiryDate));
  }

  // 6. Fetch contract reviews
  const contractReviews = await db
    .select()
    .from(hcEmployeeContractReviews)
    .where(eq(hcEmployeeContractReviews.employeeId, hrEmployeeId))
    .orderBy(desc(hcEmployeeContractReviews.createdAt));

  // 6. Fetch performance reviews
  const performanceReviews = await db
    .select({
      id: hcPerformanceReviews.id,
      overallScore: hcPerformanceReviews.overallScore,
      overallRating: hcPerformanceReviews.overallRating,
      strengths: hcPerformanceReviews.strengths,
      improvements: hcPerformanceReviews.improvements,
      comments: hcPerformanceReviews.comments,
      status: hcPerformanceReviews.status,
      createdAt: hcPerformanceReviews.createdAt,
      cycleName: hcPerformanceCycles.name,
      cycleYear: hcPerformanceCycles.year,
    })
    .from(hcPerformanceReviews)
    .leftJoin(hcPerformanceCycles, eq(hcPerformanceReviews.cycleId, hcPerformanceCycles.id))
    .where(eq(hcPerformanceReviews.employeeId, hrEmployeeId))
    .orderBy(desc(hcPerformanceReviews.createdAt));

  // 7. Fetch disciplinary actions (SP)
  const disciplinaryActions = await db
    .select({
      id: hcDisciplinaryActions.id,
      spLevel: hcDisciplinaryActions.spLevel,
      letterNumber: hcDisciplinaryActions.letterNumber,
      violationDate: hcDisciplinaryActions.violationDate,
      violationDescription: hcDisciplinaryActions.violationDescription,
      actionTaken: hcDisciplinaryActions.actionTaken,
      effectiveDate: hcDisciplinaryActions.effectiveDate,
      expiryDate: hcDisciplinaryActions.expiryDate,
      issuedBy: hcDisciplinaryActions.issuedBy,
      status: hcDisciplinaryActions.status,
      violationName: hcViolationCategories.name,
    })
    .from(hcDisciplinaryActions)
    .leftJoin(hcViolationCategories, eq(hcDisciplinaryActions.violationCategoryId, hcViolationCategories.id))
    .where(eq(hcDisciplinaryActions.employeeId, hrEmployeeId))
    .orderBy(desc(hcDisciplinaryActions.violationDate));

  // 8. Fetch gamification data (Points, Penalties, Badges)
  let points: any[] = [];
  let penalties: any[] = [];
  let earnedBadges: any[] = [];
  let totalGamificationPoints = activeGamifiedEmp ? activeGamifiedEmp.totalPoints : 0;

  if (employeeIds.length > 0) {
    points = await db
      .select()
      .from(pointEvents)
      .where(inArray(pointEvents.employeeId, employeeIds))
      .orderBy(desc(pointEvents.createdAt))
      .limit(50);

    penalties = await db
      .select()
      .from(penaltyEvents)
      .where(inArray(penaltyEvents.employeeId, employeeIds))
      .orderBy(desc(penaltyEvents.createdAt));

    earnedBadges = await db
      .select({
        id: employeeBadges.id,
        awardedAt: employeeBadges.awardedAt,
        badgeName: badges.name,
        badgeDescription: badges.description,
        badgeIconUrl: badges.iconUrl,
        badgeColorCode: badges.colorCode,
      })
      .from(employeeBadges)
      .innerJoin(badges, eq(employeeBadges.badgeId, badges.id))
      .where(inArray(employeeBadges.employeeId, employeeIds))
      .orderBy(desc(employeeBadges.awardedAt));
  }

  // 9. Fetch attendance and leave records
  let attendance: any[] = [];
  let leaveRequests: any[] = [];
  if (employeeIds.length > 0) {
    attendance = await db
      .select()
      .from(attendanceRecords)
      .where(inArray(attendanceRecords.employeeId, employeeIds))
      .orderBy(desc(attendanceRecords.eventTime))
      .limit(100);
  }

  leaveRequests = await db
    .select({
      id: hcLeaveRequests.id,
      startDate: hcLeaveRequests.startDate,
      endDate: hcLeaveRequests.endDate,
      totalDays: hcLeaveRequests.totalDays,
      reason: hcLeaveRequests.reason,
      status: hcLeaveRequests.status,
      approvedAt: hcLeaveRequests.approvedAt,
      leaveTypeName: hcLeaveTypes.name,
      leaveTypeCode: hcLeaveTypes.code,
    })
    .from(hcLeaveRequests)
    .leftJoin(hcLeaveTypes, eq(hcLeaveRequests.leaveTypeId, hcLeaveTypes.id))
    .where(eq(hcLeaveRequests.employeeId, hrEmployeeId))
    .orderBy(desc(hcLeaveRequests.startDate));

  // 10. Fetch health and wellness records
  let healthWellness: any[] = [];
  if (employeeIds.length > 0) {
    healthWellness = await db
      .select()
      .from(wellnessRecords)
      .where(inArray(wellnessRecords.employeeId, employeeIds))
      .orderBy(desc(wellnessRecords.recordedAt));
  }

  // Resolve recruitment MCU if candidate exists
  let recruitmentMcu: any[] = [];
  if (hrEmp.email || hrEmp.fullName) {
    const conditions = [];
    if (hrEmp.email) conditions.push(eq(sql`email` as any, hrEmp.email));
    
    const candidates = await db
      .select({ id: sql`id` })
      .from(sql`hero_hc_candidates` as any)
      .where(and(...conditions))
      .limit(1);

    if (candidates.length > 0) {
      recruitmentMcu = await db
        .select()
        .from(hcCandidateMcu)
        .where(eq(hcCandidateMcu.candidateId, candidates[0].id as any))
        .orderBy(desc(hcCandidateMcu.scheduledDate));
    }
  }

  // 11. Fetch streak record
  let streak: any = null;
  if (employeeIds.length > 0) {
    const [streakRec] = await db
      .select()
      .from(streakRecords)
      .where(inArray(streakRecords.employeeId, employeeIds))
      .limit(1);
    if (streakRec) {
      streak = streakRec;
    }
  }

  // 12. Fetch direct manager name (department manager where they belong)
  let managerName: string | null = null;
  if (hrEmp.departmentId) {
    const [deptManager] = await db
      .select({ name: employees.name })
      .from(employees)
      .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
      .where(
        and(
          eq(employees.departmentId, hrEmp.departmentId),
          eq(employees.isActive, true),
          or(
            sql`LOWER(${hrPositions.rankName}) LIKE '%manager%'`,
            sql`LOWER(${hrPositions.levelName}) LIKE '%manager%'`,
            sql`LOWER(${hrPositions.rankName}) LIKE '%dept head%'`,
            sql`LOWER(${hrPositions.rankName}) LIKE '%head%'`
          )
        )
      )
      .limit(1);

    if (deptManager) {
      managerName = deptManager.name;
    }
  }

  if (!managerName && activeGamifiedEmp?.directManagerId) {
    const [mgr] = await db
      .select({ name: employees.name })
      .from(employees)
      .where(eq(employees.id, activeGamifiedEmp.directManagerId))
      .limit(1);
    if (mgr) {
      managerName = mgr.name;
    }
  }

  // Fallback: If no direct manager assigned or found, try to auto-resolve from Department Head/Manager in User Management
  if (!managerName && (hrEmp.departmentName || activeGamifiedEmp?.department)) {
    const deptName = hrEmp.departmentName || activeGamifiedEmp?.department;
    if (deptName) {
      const [gamifiedManager] = await db
        .select({ name: employees.name })
        .from(employees)
        .where(
          and(
            eq(employees.isActive, true),
            or(
              eq(employees.department, deptName),
              eq(employees.department, deptName.replace(/s$/i, '')),
              eq(employees.department, deptName + 's')
            ),
            or(
              sql`LOWER(${employees.jobTitle}) LIKE '%manager%'`,
              sql`LOWER(${employees.jobTitle}) LIKE '%head%'`,
              sql`LOWER(${employees.jobTitle}) LIKE '%coordinator%'`,
              sql`LOWER(${employees.jobTitle}) LIKE '%supervisor%'`,
              sql`LOWER(${employees.role}) LIKE '%manager%'`,
              sql`LOWER(${employees.role}) LIKE '%head%'`,
              sql`LOWER(${employees.role}) LIKE '%coordinator%'`,
              sql`LOWER(${employees.role}) LIKE '%supervisor%'`
            )
          )
        )
        .orderBy(desc(employees.id))
        .limit(1);

      if (gamifiedManager) {
        managerName = gamifiedManager.name;
      }
    }
  }

  return {
    hrEmployee: hrEmp,
    gamifiedEmployee: activeGamifiedEmp,
    trainings,
    sioCertifications: sioCertificationsData,
    contractReviews,
    performanceReviews,
    disciplinaryActions,
    points,
    penalties,
    badges: earnedBadges,
    totalGamificationPoints,
    attendance,
    leaveRequests,
    wellness: healthWellness,
    recruitmentMcu,
    streak,
    managerName,
  };
}
