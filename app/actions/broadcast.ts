"use server";

import { db } from "@/db";
import {
  broadcasts,
  broadcastInteractions,
  broadcastCategories,
  masterDepartments,
  masterSections,
  employees,
} from "@/db/schema/hero";
import { getServerSession } from "@/lib/auth-session";
import { getS3ObjectReadUrl } from "@/lib/s3-storage";
import { eq, and, or, sql, desc, SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createNotificationEventForEmployee, sendPushNotification } from "@/lib/push-notifications";

// Type definitions
export interface BroadcastDataInput {
  title: string;
  content?: string;
  imageUrl?: string;
  linkUrl?: string;
  mediaType?: "image" | "video" | "text";
  targetType: "all" | "department" | "section";
  targetId?: number;
  targetValue?: string;
  maxPopups?: number;
  categoryId?: number;
}

// Helper: Check user role and permissions
async function getCreatorPermissions(email: string) {
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.email, email))
    .limit(1);

  const [emp] = await db
    .select()
    .from(employees)
    .where(eq(employees.email, email))
    .limit(1);

  let isSuperOrHrAdmin = false;
  let isSectionHead = false;
  let managedSectionIds: number[] = [];

  if (emp) {
    const role = emp.accessRole;
    if (
      role === "Super Admin" ||
      role === "HR Admin" ||
      role === "Admin" ||
      role === "Site Admin" ||
      role === "HO Admin"
    ) {
      isSuperOrHrAdmin = true;
    }
  }

  if (employee) {
    // Query sections where this employee is the head in masterSections
    const sectionsManaged = await db
      .select({ id: masterSections.id })
      .from(masterSections)
      .where(
        or(
          eq(masterSections.headEmployeeId, employee.id),
          emp ? eq(masterSections.headEmployeeId, emp.id) : undefined,
          emp ? eq(masterSections.headEmployeeId, sql`NULLIF(${emp.employeeSn}, '')::int`) : undefined
        )
      );

    if (sectionsManaged.length > 0) {
      isSectionHead = true;
      managedSectionIds = sectionsManaged.map((s) => s.id);
    }
  }

  const activeEmp = emp || employee;
  if (activeEmp) {
    // Fallback: check by job title keywords
    const jobTitle = ("jobTitle" in activeEmp ? activeEmp.jobTitle : "").toLowerCase();
    const isHeadByJobTitle =
      jobTitle.includes("section head") ||
      jobTitle.includes("head section") ||
      jobTitle.includes("supervisor") ||
      jobTitle.includes("spv") ||
      jobTitle.includes("leader") ||
      jobTitle.includes("koordinator") ||
      jobTitle.includes("coordinator");

    if (isHeadByJobTitle && activeEmp.sectionId && !isSectionHead) {
      isSectionHead = true;
      managedSectionIds.push(activeEmp.sectionId!);
    }
  }

  return {
    isSuperOrHrAdmin,
    isSectionHead,
    managedSectionIds,
    employee,
  };
}

// 1. Create a new broadcast
export async function createBroadcast(data: BroadcastDataInput) {
  const session = await getServerSession();
  if (!session?.user?.id || !session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const perms = await getCreatorPermissions(session.user.email);

  if (!perms.isSuperOrHrAdmin && !perms.isSectionHead) {
    throw new Error("Unauthorized: Only Admins or Section Heads can broadcast information.");
  }

  // Section Head restrictions:
  // Can only broadcast to their managed section
  if (!perms.isSuperOrHrAdmin && perms.isSectionHead) {
    if (data.targetType !== "section") {
      throw new Error("Unauthorized: Section Head can only broadcast to section target.");
    }
    if (!data.targetId || !perms.managedSectionIds.includes(data.targetId)) {
      throw new Error("Unauthorized: You do not manage this section.");
    }
  }

  const [newBroadcast] = await db
    .insert(broadcasts)
    .values({
      title: data.title,
      content: data.content || null,
      imageUrl: data.imageUrl || null,
      linkUrl: data.linkUrl || null,
      mediaType: data.mediaType || "image",
      targetType: data.targetType,
      targetId: data.targetId || null,
      targetValue: data.targetValue || null,
      maxPopups: data.maxPopups !== undefined ? data.maxPopups : 5,
      isActive: true,
      createdBy: session.user.id,
      categoryId: data.categoryId || null,
    })
    .returning();

  // Send Push Notifications in the background based on target audience
  try {
    let targetEmployees: Array<{ id: number }> = [];

    if (data.targetType === "all") {
      targetEmployees = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.isActive, true));
    } else if (data.targetType === "department" && data.targetId) {
      targetEmployees = await db
        .select({ id: employees.id })
        .from(employees)
        .where(
          and(
            eq(employees.isActive, true),
            eq(employees.departmentId, data.targetId)
          )
        );
    } else if (data.targetType === "section" && data.targetId) {
      targetEmployees = await db
        .select({ id: employees.id })
        .from(employees)
        .where(
          and(
            eq(employees.isActive, true),
            eq(employees.sectionId, data.targetId)
          )
        );
    }

    if (targetEmployees.length > 0) {
      // Fire notifications in the background asynchronously
      Promise.allSettled(
        targetEmployees.map(async (emp) => {
          try {
            const event = await createNotificationEventForEmployee({
              employeeId: emp.id,
              eventType: "broadcast_announcement",
              category: "info",
              title: data.title,
              body: data.content || "Ada informasi baru dari HO/Section Head.",
              url: "/mobile/information",
            });

            if (event) {
              await sendPushNotification({
                employeeId: emp.id,
                category: "info",
                title: data.title,
                body: data.content || "Ada informasi baru dari HO/Section Head.",
                url: "/mobile/information",
                requirePreference: false,
                notificationEventId: event.id,
              });
            }
          } catch (err) {
            console.error(`Failed to push notification to employee ID ${emp.id}:`, err);
          }
        })
      ).catch((err) => console.error("Push dispatch failed:", err));
    }
  } catch (notificationErr) {
    console.error("Error setting up broadcast notification targets:", notificationErr);
  }

  revalidatePath("/dashboard/command-center");
  revalidatePath("/mobile/dashboard");
  return { success: true, broadcast: newBroadcast };
}

// 2. Fetch all broadcasts for the desktop dashboard (with aggregates and filters)
export async function getBroadcastsList() {
  const session = await getServerSession();
  if (!session?.user?.id || !session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const perms = await getCreatorPermissions(session.user.email);

  if (!perms.isSuperOrHrAdmin && !perms.isSectionHead) {
    throw new Error("Unauthorized");
  }

  // Build query
  let query = db
    .select({
      id: broadcasts.id,
      title: broadcasts.title,
      content: broadcasts.content,
      imageUrl: broadcasts.imageUrl,
      linkUrl: broadcasts.linkUrl,
      mediaType: broadcasts.mediaType,
      targetType: broadcasts.targetType,
      targetId: broadcasts.targetId,
      targetValue: broadcasts.targetValue,
      maxPopups: broadcasts.maxPopups,
      isActive: broadcasts.isActive,
      createdAt: broadcasts.createdAt,
      createdBy: broadcasts.createdBy,
      categoryId: broadcasts.categoryId,
      categoryName: broadcastCategories.name,
      totalViews: sql<number>`coalesce(sum(${broadcastInteractions.viewsCount}), 0)::int`,
      likes: sql<number>`count(case when ${broadcastInteractions.liked} = true then 1 end)::int`,
      dislikes: sql<number>`count(case when ${broadcastInteractions.liked} = false then 1 end)::int`,
    })
    .from(broadcasts)
    .leftJoin(broadcastInteractions, eq(broadcasts.id, broadcastInteractions.broadcastId))
    .leftJoin(broadcastCategories, eq(broadcasts.categoryId, broadcastCategories.id))
    .groupBy(broadcasts.id, broadcastCategories.id);

  // If Section Head, they can only see/manage broadcasts they created
  if (!perms.isSuperOrHrAdmin && perms.isSectionHead) {
    query = query.where(eq(broadcasts.createdBy, session.user.id)) as any;
  }

  const list = await query.orderBy(desc(broadcasts.createdAt));
  return list;
}

// 3. Toggle broadcast active status
export async function toggleBroadcastActive(id: number, isActive: boolean) {
  const session = await getServerSession();
  if (!session?.user?.id || !session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const perms = await getCreatorPermissions(session.user.email);

  // Security check: Section head can only toggle their own broadcasts
  if (!perms.isSuperOrHrAdmin) {
    const [existing] = await db
      .select()
      .from(broadcasts)
      .where(and(eq(broadcasts.id, id), eq(broadcasts.createdBy, session.user.id)))
      .limit(1);
    if (!existing) {
      throw new Error("Unauthorized");
    }
  }

  await db
    .update(broadcasts)
    .set({ isActive })
    .where(eq(broadcasts.id, id));

  revalidatePath("/dashboard/command-center");
  revalidatePath("/mobile/dashboard");
  return { success: true };
}

// 4. Delete a broadcast
export async function deleteBroadcast(id: number) {
  const session = await getServerSession();
  if (!session?.user?.id || !session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const perms = await getCreatorPermissions(session.user.email);

  // Security check: Section head can only delete their own broadcasts
  if (!perms.isSuperOrHrAdmin) {
    const [existing] = await db
      .select()
      .from(broadcasts)
      .where(and(eq(broadcasts.id, id), eq(broadcasts.createdBy, session.user.id)))
      .limit(1);
    if (!existing) {
      throw new Error("Unauthorized");
    }
  }

  await db.delete(broadcasts).where(eq(broadcasts.id, id));

  revalidatePath("/dashboard/command-center");
  revalidatePath("/mobile/dashboard");
  return { success: true };
}

// 4b. Update a broadcast (with optional resend)
export async function updateBroadcast(id: number, data: BroadcastDataInput, resend: boolean = false) {
  const session = await getServerSession();
  if (!session?.user?.id || !session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const perms = await getCreatorPermissions(session.user.email);

  if (!perms.isSuperOrHrAdmin && !perms.isSectionHead) {
    throw new Error("Unauthorized: Only Admins or Section Heads can edit broadcasts.");
  }

  // Find existing broadcast
  const [existing] = await db
    .select()
    .from(broadcasts)
    .where(eq(broadcasts.id, id))
    .limit(1);

  if (!existing) {
    throw new Error("Broadcast not found");
  }

  // Section Head restrictions:
  if (!perms.isSuperOrHrAdmin && perms.isSectionHead) {
    if (existing.createdBy !== session.user.id) {
      throw new Error("Unauthorized: You do not own this broadcast.");
    }
    if (data.targetType !== "section") {
      throw new Error("Unauthorized: Section Head can only target section.");
    }
    if (!data.targetId || !perms.managedSectionIds.includes(data.targetId)) {
      throw new Error("Unauthorized: You do not manage this section.");
    }
  }

  const updateFields: Partial<typeof broadcasts.$inferInsert> = {
    title: data.title,
    content: data.content || null,
    imageUrl: data.mediaType !== "text" ? data.imageUrl : null,
    linkUrl: data.linkUrl || null,
    mediaType: data.mediaType || "image",
    targetType: data.targetType,
    targetId: data.targetType !== "all" ? data.targetId : null,
    targetValue: data.targetType !== "all" ? data.targetValue : null,
    maxPopups: data.maxPopups !== undefined ? data.maxPopups : 5,
    categoryId: data.categoryId || null,
  };

  if (resend) {
    updateFields.createdAt = new Date();
    // Delete all interactions for this broadcast so it pops up again for everyone
    await db.delete(broadcastInteractions).where(eq(broadcastInteractions.broadcastId, id));
  }

  const [updatedBroadcast] = await db
    .update(broadcasts)
    .set(updateFields)
    .where(eq(broadcasts.id, id))
    .returning();

  // If resend is requested, send Push Notifications again
  if (resend) {
    try {
      let targetEmployees: Array<{ id: number }> = [];

      if (data.targetType === "all") {
        targetEmployees = await db
          .select({ id: employees.id })
          .from(employees)
          .where(eq(employees.isActive, true));
      } else if (data.targetType === "department" && data.targetId) {
        targetEmployees = await db
          .select({ id: employees.id })
          .from(employees)
          .where(
            and(
              eq(employees.isActive, true),
              eq(employees.departmentId, data.targetId)
            )
          );
      } else if (data.targetType === "section" && data.targetId) {
        targetEmployees = await db
          .select({ id: employees.id })
          .from(employees)
          .where(
            and(
              eq(employees.isActive, true),
              eq(employees.sectionId, data.targetId)
            )
          );
      }

      if (targetEmployees.length > 0) {
        // Fire notifications in the background
        Promise.allSettled(
          targetEmployees.map(async (emp) => {
            try {
              const event = await createNotificationEventForEmployee({
                employeeId: emp.id,
                eventType: "broadcast_announcement",
                category: "info",
                title: data.title,
                body: data.content || "Ada informasi baru dari HO/Section Head.",
                url: "/mobile/information",
              });

              if (event) {
                await sendPushNotification({
                  employeeId: emp.id,
                  category: "info",
                  title: data.title,
                  body: data.content || "Ada informasi baru dari HO/Section Head.",
                  url: "/mobile/information",
                  requirePreference: false,
                  notificationEventId: event.id,
                });
              }
            } catch (err) {
              console.error(`Failed to push notification to employee ID ${emp.id}:`, err);
            }
          })
        ).catch((err) => console.error("Push dispatch failed:", err));
      }
    } catch (notificationErr) {
      console.error("Error setting up broadcast notification targets:", notificationErr);
    }
  }

  revalidatePath("/dashboard/command-center");
  revalidatePath("/mobile/dashboard");
  return { success: true, broadcast: updatedBroadcast };
}

// 5. Get active targeting popups for current mobile employee
export async function getEligibleBroadcastsForMobile() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return [];
  }

  // Get employee details
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1);

  if (!employee) {
    return [];
  }

  const deptId = employee.departmentId;
  const sectId = employee.sectionId;

  // Query broadcasts targeted for this employee
  const targetConditions = [eq(broadcasts.targetType, "all")];

  if (deptId) {
    targetConditions.push(
      and(eq(broadcasts.targetType, "department"), eq(broadcasts.targetId, deptId))!
    );
  }

  if (sectId) {
    targetConditions.push(
      and(eq(broadcasts.targetType, "section"), eq(broadcasts.targetId, sectId))!
    );
  }

  // Get all broadcasts matching the target conditions
  const eligibleBroadcasts = await db
    .select({
      id: broadcasts.id,
      title: broadcasts.title,
      content: broadcasts.content,
      imageUrl: broadcasts.imageUrl,
      linkUrl: broadcasts.linkUrl,
      mediaType: broadcasts.mediaType,
      targetType: broadcasts.targetType,
      maxPopups: broadcasts.maxPopups,
      viewsCount: sql<number>`coalesce(${broadcastInteractions.viewsCount}, 0)::int`,
      dismissed: sql<boolean>`coalesce(${broadcastInteractions.dismissed}, false)`,
      liked: broadcastInteractions.liked,
      categoryName: broadcastCategories.name,
    })
    .from(broadcasts)
    .leftJoin(
      broadcastInteractions,
      and(
        eq(broadcasts.id, broadcastInteractions.broadcastId),
        eq(broadcastInteractions.userId, session.user.id)
      )
    )
    .leftJoin(broadcastCategories, eq(broadcasts.categoryId, broadcastCategories.id))
    .where(
      and(
        eq(broadcasts.isActive, true),
        or(...targetConditions)
      )
    )
    .orderBy(desc(broadcasts.createdAt));

  // Filter based on capping logic:
  // Show if viewsCount < maxPopups AND dismissed is false AND no reaction given (liked is null)
  const filtered = eligibleBroadcasts.filter(
    (b) => b.viewsCount < b.maxPopups && !b.dismissed && b.liked === null
  );

  // Regenerate signed URLs for images
  return Promise.all(
    filtered.map(async (item) => ({
      ...item,
      imageUrl: item.imageUrl ? await getS3ObjectReadUrl(item.imageUrl) : item.imageUrl,
    }))
  );
}

// 6. Get all historical broadcasts (visible to the user)
export async function getHistoricalBroadcastsForMobile() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return [];
  }

  // Get employee details
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1);

  if (!employee) {
    return [];
  }

  const deptId = employee.departmentId;
  const sectId = employee.sectionId;

  const targetConditions: SQL[] = [eq(broadcasts.targetType, "all")];

  if (deptId) {
    targetConditions.push(
      and(eq(broadcasts.targetType, "department"), eq(broadcasts.targetId, deptId))!
    );
  }

  if (sectId) {
    targetConditions.push(
      and(eq(broadcasts.targetType, "section"), eq(broadcasts.targetId, sectId))!
    );
  }

  const history = await db
    .select({
      id: broadcasts.id,
      title: broadcasts.title,
      content: broadcasts.content,
      imageUrl: broadcasts.imageUrl,
      linkUrl: broadcasts.linkUrl,
      mediaType: broadcasts.mediaType,
      targetType: broadcasts.targetType,
      createdAt: broadcasts.createdAt,
      liked: broadcastInteractions.liked,
      dismissed: sql<boolean>`coalesce(${broadcastInteractions.dismissed}, false)`,
      viewsCount: sql<number>`coalesce(${broadcastInteractions.viewsCount}, 0)::int`,
      categoryName: broadcastCategories.name,
    })
    .from(broadcasts)
    .leftJoin(
      broadcastInteractions,
      and(
        eq(broadcasts.id, broadcastInteractions.broadcastId),
        eq(broadcastInteractions.userId, session.user.id)
      )
    )
    .leftJoin(broadcastCategories, eq(broadcasts.categoryId, broadcastCategories.id))
    .where(
      and(
        eq(broadcasts.isActive, true),
        or(...targetConditions)
      )
    )
    .orderBy(desc(broadcasts.createdAt));

  // Regenerate signed URLs for images
  const historyWithFreshUrls = await Promise.all(
    history.map(async (item) => ({
      ...item,
      imageUrl: item.imageUrl ? await getS3ObjectReadUrl(item.imageUrl) : item.imageUrl,
    }))
  );

  return historyWithFreshUrls;
}

// 7. Track interactions: view, dismiss, like, dislike
export async function interactWithBroadcast(
  broadcastId: number,
  type: "view" | "dismiss" | "like" | "dislike" | "unlike"
) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Check if interaction already exists
  const [existing] = await db
    .select()
    .from(broadcastInteractions)
    .where(
      and(
        eq(broadcastInteractions.broadcastId, broadcastId),
        eq(broadcastInteractions.userId, session.user.id)
      )
    )
    .limit(1);

  if (existing) {
    // Update existing
    const updateData: Partial<typeof broadcastInteractions.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (type === "view") {
      updateData.viewsCount = existing.viewsCount + 1;
    } else if (type === "dismiss") {
      updateData.dismissed = true;
    } else if (type === "like") {
      updateData.liked = true;
    } else if (type === "dislike") {
      updateData.liked = false;
    } else if (type === "unlike") {
      updateData.liked = null;
    }

    await db
      .update(broadcastInteractions)
      .set(updateData)
      .where(eq(broadcastInteractions.id, existing.id));
  } else {
    // Insert new
    const insertData = {
      broadcastId,
      userId: session.user.id,
      viewsCount: type === "view" ? 1 : 0,
      dismissed: type === "dismiss",
      liked: type === "like" ? true : type === "dislike" ? false : null,
    };

    await db.insert(broadcastInteractions).values(insertData);
  }

  revalidatePath("/dashboard/command-center");
  revalidatePath("/mobile/dashboard");
  return { success: true };
}

// 8. Fetch target metadata (departments & sections)
export async function getTargetMetadata() {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return { departments: [], sections: [], userRoleInfo: { isSuperOrHrAdmin: false, isSectionHead: false, managedSectionIds: [] } };
  }

  const perms = await getCreatorPermissions(session.user.email);

  const depts = await db
    .select({ id: masterDepartments.id, name: masterDepartments.name })
    .from(masterDepartments)
    .where(eq(masterDepartments.isActive, true))
    .orderBy(masterDepartments.name);

  const sects = await db
    .select({
      id: masterSections.id,
      name: masterSections.name,
      departmentId: masterSections.departmentId,
    })
    .from(masterSections)
    .where(eq(masterSections.isActive, true))
    .orderBy(masterSections.name);

  // Filter sections if the user is a Section Head but not Admin
  const filteredSections = perms.isSuperOrHrAdmin
    ? sects
    : sects.filter((s) => perms.managedSectionIds.includes(s.id));

  const filteredDepartments = perms.isSuperOrHrAdmin ? depts : [];

  return {
    departments: filteredDepartments,
    sections: filteredSections,
    userRoleInfo: {
      isSuperOrHrAdmin: perms.isSuperOrHrAdmin,
      isSectionHead: perms.isSectionHead,
      managedSectionIds: perms.managedSectionIds,
    },
  };
}

// 9. Fetch all active categories
export async function getBroadcastCategories() {
  return db
    .select()
    .from(broadcastCategories)
    .where(eq(broadcastCategories.isActive, true))
    .orderBy(broadcastCategories.name);
}

// 10. Create a new category dynamically
export async function createBroadcastCategory(name: string) {
  const session = await getServerSession();
  if (!session?.user?.id || !session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const perms = await getCreatorPermissions(session.user.email);
  if (!perms.isSuperOrHrAdmin && !perms.isSectionHead) {
    throw new Error("Unauthorized");
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Category name cannot be empty");
  }

  // Check if exists
  const [existing] = await db
    .select()
    .from(broadcastCategories)
    .where(eq(sql`lower(${broadcastCategories.name})`, trimmedName.toLowerCase()))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [newCat] = await db
    .insert(broadcastCategories)
    .values({ name: trimmedName })
    .returning();

  return newCat;
}

// 11. Fetch feedback analytics for a broadcast (names, departments, sections who liked/disliked)
export async function getBroadcastAnalytics(broadcastId: number) {
  const session = await getServerSession();
  if (!session?.user?.id || !session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const perms = await getCreatorPermissions(session.user.email);
  if (!perms.isSuperOrHrAdmin && !perms.isSectionHead) {
    throw new Error("Unauthorized");
  }

  // Get users who liked
  const likedUsers = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      department: masterDepartments.name,
      section: masterSections.name,
      updatedAt: broadcastInteractions.updatedAt,
    })
    .from(broadcastInteractions)
    .innerJoin(employees, eq(broadcastInteractions.userId, employees.authUserId))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .where(
      and(
        eq(broadcastInteractions.broadcastId, broadcastId),
        eq(broadcastInteractions.liked, true)
      )
    )
    .orderBy(desc(broadcastInteractions.updatedAt));

  // Get users who disliked
  const dislikedUsers = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      department: masterDepartments.name,
      section: masterSections.name,
      updatedAt: broadcastInteractions.updatedAt,
    })
    .from(broadcastInteractions)
    .innerJoin(employees, eq(broadcastInteractions.userId, employees.authUserId))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .where(
      and(
        eq(broadcastInteractions.broadcastId, broadcastId),
        eq(broadcastInteractions.liked, false)
      )
    )
    .orderBy(desc(broadcastInteractions.updatedAt));

  // Grouped likes by department
  const departmentLikes = await db
    .select({
      departmentId: employees.departmentId,
      departmentName: masterDepartments.name,
      count: sql<number>`count(*)::int`,
    })
    .from(broadcastInteractions)
    .innerJoin(employees, eq(broadcastInteractions.userId, employees.authUserId))
    .innerJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .where(
      and(
        eq(broadcastInteractions.broadcastId, broadcastId),
        eq(broadcastInteractions.liked, true)
      )
    )
    .groupBy(employees.departmentId, masterDepartments.name)
    .orderBy(desc(sql`count(*)`));

  // Grouped likes by section
  const sectionLikes = await db
    .select({
      sectionId: employees.sectionId,
      sectionName: masterSections.name,
      count: sql<number>`count(*)::int`,
    })
    .from(broadcastInteractions)
    .innerJoin(employees, eq(broadcastInteractions.userId, employees.authUserId))
    .innerJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .where(
      and(
        eq(broadcastInteractions.broadcastId, broadcastId),
        eq(broadcastInteractions.liked, true)
      )
    )
    .groupBy(employees.sectionId, masterSections.name)
    .orderBy(desc(sql`count(*)`));

  return {
    likedUsers,
    dislikedUsers,
    departmentLikes,
    sectionLikes,
  };
}
