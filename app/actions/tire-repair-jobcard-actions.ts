'use server';

import { db } from '@/db';
import {
  tireRepairJobcards,
  tireRepairJobcardInjuries,
  tireRepairJobcardProcesses,
  tireRepairInspections,
  type NewTireRepairJobcard,
  type NewTireRepairJobcardInjury,
  type NewTireRepairJobcardProcess,
  type TireRepairJobcard,
} from '@/db/schema/tire-repair';
import { employees, approvals, notificationEvents, notificationDeliveries } from '@/db/schema/hero';
import { user } from '@/db/schema/auth';
import { eq, desc, asc, and, ilike, sql, inArray, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getServerSession } from '@/lib/auth-session';
import { getCurrentEmployee } from '@/lib/get-current-employee';
import { sendJobcardApprovalEmail } from '@/lib/jobcard-email';
import { resolveApprovalRouteForActivity } from '@/lib/approval-engine';

export interface ProcessPayload {
  processName: string;
  materialUsed?: string;
  qty?: string;
  hours?: string;
  byWhom?: string;
  hardness?: string;
  snHeatPad?: string;
  signQc?: string;
}

export interface InjuryPayload {
  injuryName: string;
  injuryDate?: string;
  dimensiLukaL?: string;
  dimensiLukaW?: string;
  dimensiLukaP?: string;
  dimensiLukaT?: string;
  processes?: ProcessPayload[];
}

export interface CreateJobcardPayload {
  inspectionId?: number;
  woNo?: string;
  woDate?: string;
  plant?: string;
  customerName?: string;
  customerId?: string;
  receivedDate?: string;
  serialNumber: string;
  tireSize: string;
  brand?: string;
  pattern?: string;
  tireConstruction?: string;
  status?: string;
  offRepairDate?: string;
  signQc?: string;
  byHeadSection?: string;
  injuries?: InjuryPayload[];
}

export interface JobcardRecord extends TireRepairJobcard {
  injuries: Array<{
    id: number;
    jobcardId: number;
    injuryName: string;
    injuryDate: Date;
    dimensiLukaL: string | null;
    dimensiLukaW: string | null;
    dimensiLukaP: string | null;
    dimensiLukaT: string | null;
    sortOrder: number;
    createdAt: Date;
    processes: Array<{
      id: number;
      injuryId: number;
      processName: string;
      materialUsed: string | null;
      qty: string | null;
      hours: string | null;
      byWhom: string | null;
      hardness: string | null;
      snHeatPad: string | null;
      signQc: string | null;
      createdAt: Date;
    }>;
  }>;
}

export async function ensureJobcardSchema(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "hero_tire_repair_jobcards" (
        "id" serial PRIMARY KEY,
        "jobcard_no" varchar(100) NOT NULL UNIQUE,
        "wo_no" varchar(100),
        "wo_date" timestamp,
        "inspection_id" integer REFERENCES "hero_tire_repair_inspections"("id") ON DELETE SET NULL,
        "plant" varchar(150) NOT NULL DEFAULT 'Workshop Sangatta',
        "customer_name" varchar(255) NOT NULL DEFAULT 'PT Kaltim Prima Coal',
        "customer_id" varchar(100),
        "received_date" timestamp NOT NULL DEFAULT now(),
        "serial_number" varchar(100) NOT NULL,
        "tire_size" varchar(100) NOT NULL,
        "brand" varchar(100),
        "pattern" varchar(100),
        "tire_construction" varchar(50) NOT NULL DEFAULT 'RADIAL',
        "status" varchar(50) NOT NULL DEFAULT 'In Progress',
        "off_repair_date" timestamp,
        "sign_qc" varchar(255),
        "by_head_section" varchar(255),
        "created_by" integer REFERENCES "hero_employees"("id") ON DELETE SET NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "hero_tire_repair_jobcard_injuries" (
        "id" serial PRIMARY KEY,
        "jobcard_id" integer NOT NULL REFERENCES "hero_tire_repair_jobcards"("id") ON DELETE CASCADE,
        "injury_name" varchar(150) NOT NULL,
        "injury_date" timestamp NOT NULL DEFAULT now(),
        "dimensi_luka_l" varchar(50),
        "dimensi_luka_w" varchar(50),
        "dimensi_luka_p" varchar(50),
        "dimensi_luka_t" varchar(50),
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "hero_tire_repair_jobcard_processes" (
        "id" serial PRIMARY KEY,
        "injury_id" integer NOT NULL REFERENCES "hero_tire_repair_jobcard_injuries"("id") ON DELETE CASCADE,
        "process_name" varchar(100) NOT NULL,
        "material_used" varchar(255),
        "qty" varchar(100),
        "hours" varchar(100),
        "by_whom" varchar(255),
        "hardness" varchar(100),
        "sn_heat_pad" varchar(100),
        "sign_qc" varchar(100),
        "created_at" timestamp NOT NULL DEFAULT now()
      );
    `);
  } catch (error) {
    console.error('ensureJobcardSchema error:', error);
  }
}

export async function getTireRepairJobcardsAction(filters: { searchSN?: string; status?: string; plant?: string } = {}) {
  try {
    await ensureJobcardSchema();
    const conditions = [];

    if (filters.searchSN && filters.searchSN.trim()) {
      conditions.push(ilike(tireRepairJobcards.serialNumber, `%${filters.searchSN.trim()}%`));
    }
    if (filters.status && filters.status !== 'ALL') {
      conditions.push(eq(tireRepairJobcards.status, filters.status));
    }
    if (filters.plant && filters.plant !== 'ALL') {
      conditions.push(eq(tireRepairJobcards.plant, filters.plant));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select()
      .from(tireRepairJobcards)
      .where(whereClause)
      .orderBy(desc(tireRepairJobcards.createdAt));

    const jcIds = list.map((j) => j.id);
    let allInjuries: any[] = [];
    let allProcesses: any[] = [];

    if (jcIds.length > 0) {
      allInjuries = await db
        .select()
        .from(tireRepairJobcardInjuries)
        .where(inArray(tireRepairJobcardInjuries.jobcardId, jcIds))
        .orderBy(asc(tireRepairJobcardInjuries.sortOrder), asc(tireRepairJobcardInjuries.id));

      const injuryIds = allInjuries.map((i) => i.id);
      if (injuryIds.length > 0) {
        allProcesses = await db
          .select()
          .from(tireRepairJobcardProcesses)
          .where(inArray(tireRepairJobcardProcesses.injuryId, injuryIds))
          .orderBy(asc(tireRepairJobcardProcesses.id));
      }
    }

    const processesByInjuryId = new Map<number, any[]>();
    allProcesses.forEach((p) => {
      const existing = processesByInjuryId.get(p.injuryId) || [];
      existing.push(p);
      processesByInjuryId.set(p.injuryId, existing);
    });

    const injuriesByJobcardId = new Map<number, any[]>();
    allInjuries.forEach((inj) => {
      const existing = injuriesByJobcardId.get(inj.jobcardId) || [];
      existing.push({
        ...inj,
        processes: processesByInjuryId.get(inj.id) || [],
      });
      injuriesByJobcardId.set(inj.jobcardId, existing);
    });

    const result: JobcardRecord[] = list.map((j) => ({
      ...j,
      injuries: injuriesByJobcardId.get(j.id) || [],
    }));

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error('getTireRepairJobcardsAction error:', error);
    return {
      success: false,
      message: error?.message || 'Gagal memuat data jobcard repair',
      data: [],
    };
  }
}

export async function getTireRepairJobcardByIdAction(id: number) {
  try {
    await ensureJobcardSchema();
    const jcRows = await db
      .select()
      .from(tireRepairJobcards)
      .where(eq(tireRepairJobcards.id, id))
      .limit(1);

    if (jcRows.length === 0) {
      return { success: false, message: 'Jobcard tidak ditemukan' };
    }

    const jc = jcRows[0];

    const injuries = await db
      .select()
      .from(tireRepairJobcardInjuries)
      .where(eq(tireRepairJobcardInjuries.jobcardId, id))
      .orderBy(asc(tireRepairJobcardInjuries.sortOrder), asc(tireRepairJobcardInjuries.id));

    const injuryIds = injuries.map((i) => i.id);
    let processes: any[] = [];
    if (injuryIds.length > 0) {
      processes = await db
        .select()
        .from(tireRepairJobcardProcesses)
        .where(inArray(tireRepairJobcardProcesses.injuryId, injuryIds))
        .orderBy(asc(tireRepairJobcardProcesses.id));
    }

    const processesByInjuryId = new Map<number, any[]>();
    processes.forEach((p) => {
      const existing = processesByInjuryId.get(p.injuryId) || [];
      existing.push(p);
      processesByInjuryId.set(p.injuryId, existing);
    });

    const fullInjuries = injuries.map((inj) => ({
      ...inj,
      processes: processesByInjuryId.get(inj.id) || [],
    }));

    return {
      success: true,
      data: {
        ...jc,
        injuries: fullInjuries,
      } as JobcardRecord,
    };
  } catch (error: any) {
    console.error('getTireRepairJobcardByIdAction error:', error);
    return { success: false, message: error?.message || 'Gagal memuat data jobcard' };
  }
}

function parseSafeDate(val: any): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export async function createTireRepairJobcardAction(payload: CreateJobcardPayload) {
  try {
    const isFinalSubmit = payload.status?.trim() === 'Completed';

    if (isFinalSubmit) {
      if (!payload.woNo?.trim()) {
        return { success: false, message: 'Nomor WO (W/O #) wajib diisi saat Submit Final.' };
      }
      if (!payload.serialNumber?.trim()) {
        return { success: false, message: 'Serial Number wajib diisi saat Submit Final.' };
      }
      if (!payload.tireSize?.trim()) {
        return { success: false, message: 'Ukuran tire wajib diisi saat Submit Final.' };
      }
    }

    await ensureJobcardSchema();
    const currentEmp = await getCurrentEmployee();
    const createdByUserId: number | null = currentEmp?.id ?? null;

    const maxRes = await db.select({ maxId: sql<number>`COALESCE(max(id), 0)` }).from(tireRepairJobcards);
    let seq = Math.max(Number(maxRes[0]?.maxId || 0) + 1, 1);
    const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
    let jobcardNo = `JC-${yearMonth}-${String(seq).padStart(3, '0')}`;

    let exists = await db
      .select({ id: tireRepairJobcards.id })
      .from(tireRepairJobcards)
      .where(eq(tireRepairJobcards.jobcardNo, jobcardNo))
      .limit(1);

    while (exists.length > 0) {
      seq += 1;
      jobcardNo = `JC-${yearMonth}-${String(seq).padStart(3, '0')}`;
      exists = await db
        .select({ id: tireRepairJobcards.id })
        .from(tireRepairJobcards)
        .where(eq(tireRepairJobcards.jobcardNo, jobcardNo))
        .limit(1);
    }

    const insertJobcard: NewTireRepairJobcard = {
      jobcardNo,
      woNo: payload.woNo?.trim() || 'Waiting WO',
      woDate: parseSafeDate(payload.woDate),
      inspectionId: payload.inspectionId || null,
      plant: payload.plant?.trim() || 'Workshop Sangatta',
      customerName: payload.customerName?.trim() || 'PT Kaltim Prima Coal',
      customerId: payload.customerId?.trim() || null,
      receivedDate: parseSafeDate(payload.receivedDate) || new Date(),
      serialNumber: payload.serialNumber?.trim() ? payload.serialNumber.trim().toUpperCase() : `DRAFT-${Date.now()}`,
      tireSize: payload.tireSize?.trim() || '-',
      brand: payload.brand?.trim()?.toUpperCase() || 'MICHELIN',
      pattern: payload.pattern?.trim() || 'E4',
      tireConstruction: payload.tireConstruction || 'RADIAL',
      status: payload.status?.trim() || 'In Progress',
      offRepairDate: parseSafeDate(payload.offRepairDate),
      signQc: payload.signQc?.trim() || currentEmp?.name || 'Renaldo',
      byHeadSection: payload.byHeadSection?.trim() || null,
      createdBy: createdByUserId,
    };

    const createdRows = await db.insert(tireRepairJobcards).values(insertJobcard).returning();
    const createdJobcard = createdRows[0];

    if (payload.injuries && payload.injuries.length > 0) {
      for (let i = 0; i < payload.injuries.length; i++) {
        const inj = payload.injuries[i];
        const insertInj: NewTireRepairJobcardInjury = {
          jobcardId: createdJobcard.id,
          injuryName: inj.injuryName || `Injury #${i + 1}`,
          injuryDate: parseSafeDate(inj.injuryDate) || new Date(),
          dimensiLukaL: inj.dimensiLukaL || null,
          dimensiLukaW: inj.dimensiLukaW || null,
          dimensiLukaP: inj.dimensiLukaP || null,
          dimensiLukaT: inj.dimensiLukaT || null,
          sortOrder: i,
        };

        const createdInjRows = await db.insert(tireRepairJobcardInjuries).values(insertInj).returning();
        const createdInj = createdInjRows[0];

        if (inj.processes && inj.processes.length > 0) {
          const procToInsert: NewTireRepairJobcardProcess[] = inj.processes.map((p) => ({
            injuryId: createdInj.id,
            processName: p.processName,
            materialUsed: p.materialUsed || null,
            qty: p.qty || null,
            hours: p.hours || null,
            byWhom: p.byWhom || null,
            hardness: p.hardness || null,
            snHeatPad: p.snHeatPad || null,
            signQc: p.signQc || null,
          }));
          await db.insert(tireRepairJobcardProcesses).values(procToInsert);
        }
      }
    }

    try {
      revalidatePath('/mobile/tire-repair/jobcard');
      revalidatePath('/mobile/tire-repair');
      revalidatePath('/dashboard/repair-retread/jobcard');
    } catch (e) {
      // Ignore static store missing errors in background context
    }

    return {
      success: true,
      message: `Jobcard ${jobcardNo} berhasil diterbitkan (Selesai).`,
      data: createdJobcard,
    };
  } catch (error: any) {
    console.error('createTireRepairJobcardAction error:', error);
    return {
      success: false,
      message: error?.message || 'Gagal membuat Repair Job Card',
    };
  }
}

export async function deleteTireRepairJobcardAction(id: number) {
  try {
    await ensureJobcardSchema();
    await db.delete(tireRepairJobcards).where(eq(tireRepairJobcards.id, id));

    revalidatePath('/mobile/tire-repair/jobcard');
    revalidatePath('/mobile/tire-repair');
    revalidatePath('/dashboard/repair-retread/jobcard');

    return {
      success: true,
      message: 'Jobcard berhasil dihapus',
    };
  } catch (error: any) {
    console.error('deleteTireRepairJobcardAction error:', error);
    return {
      success: false,
      message: error?.message || 'Gagal menghapus Jobcard',
    };
  }
}

export async function updateTireRepairJobcardAction(
  id: number,
  payload: Partial<CreateJobcardPayload>
) {
  try {
    await ensureJobcardSchema();

    const updateJobcard: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (payload.woNo !== undefined) updateJobcard.woNo = payload.woNo?.trim() || 'Waiting WO';
    if (payload.woDate !== undefined) updateJobcard.woDate = payload.woDate ? new Date(payload.woDate) : null;
    if (payload.inspectionId !== undefined) updateJobcard.inspectionId = payload.inspectionId || null;
    if (payload.plant !== undefined) updateJobcard.plant = payload.plant?.trim() || 'Workshop Sangatta';
    if (payload.customerName !== undefined) updateJobcard.customerName = payload.customerName?.trim() || 'PT Kaltim Prima Coal';
    if (payload.customerId !== undefined) updateJobcard.customerId = payload.customerId?.trim() || null;
    if (payload.receivedDate !== undefined) updateJobcard.receivedDate = payload.receivedDate ? new Date(payload.receivedDate) : new Date();
    if (payload.serialNumber !== undefined) updateJobcard.serialNumber = payload.serialNumber.trim() ? payload.serialNumber.trim().toUpperCase() : `DRAFT-${id}`;
    if (payload.tireSize !== undefined) updateJobcard.tireSize = payload.tireSize.trim() || '-';
    if (payload.brand !== undefined) updateJobcard.brand = payload.brand?.trim().toUpperCase() || 'MICHELIN';
    if (payload.pattern !== undefined) updateJobcard.pattern = payload.pattern?.trim() || 'E4';
    if (payload.tireConstruction !== undefined) updateJobcard.tireConstruction = payload.tireConstruction || 'RADIAL';
    if (payload.status !== undefined) updateJobcard.status = payload.status || 'In Progress';
    if (payload.offRepairDate !== undefined) updateJobcard.offRepairDate = payload.offRepairDate ? new Date(payload.offRepairDate) : null;
    if (payload.signQc !== undefined) updateJobcard.signQc = payload.signQc?.trim() || null;
    if (payload.byHeadSection !== undefined) updateJobcard.byHeadSection = payload.byHeadSection?.trim() || null;

    const updatedRows = await db
      .update(tireRepairJobcards)
      .set(updateJobcard)
      .where(eq(tireRepairJobcards.id, id))
      .returning();

    if (payload.injuries !== undefined) {
      const existingInjuries = await db
        .select({ id: tireRepairJobcardInjuries.id })
        .from(tireRepairJobcardInjuries)
        .where(eq(tireRepairJobcardInjuries.jobcardId, id));

      const existingInjIds = existingInjuries.map((i) => i.id);
      if (existingInjIds.length > 0) {
        await db
          .delete(tireRepairJobcardProcesses)
          .where(inArray(tireRepairJobcardProcesses.injuryId, existingInjIds));
      }

      await db
        .delete(tireRepairJobcardInjuries)
        .where(eq(tireRepairJobcardInjuries.jobcardId, id));

      if (payload.injuries && payload.injuries.length > 0) {
        for (let i = 0; i < payload.injuries.length; i++) {
          const inj = payload.injuries[i];
          const insertInj: NewTireRepairJobcardInjury = {
            jobcardId: id,
            injuryName: inj.injuryName || `Injury #${i + 1}`,
            injuryDate: inj.injuryDate ? new Date(inj.injuryDate) : new Date(),
            dimensiLukaL: inj.dimensiLukaL || null,
            dimensiLukaW: inj.dimensiLukaW || null,
            dimensiLukaP: inj.dimensiLukaP || null,
            dimensiLukaT: inj.dimensiLukaT || null,
            sortOrder: i,
          };

          const createdInjRows = await db.insert(tireRepairJobcardInjuries).values(insertInj).returning();
          const createdInj = createdInjRows[0];

          if (inj.processes && inj.processes.length > 0) {
            const procToInsert: NewTireRepairJobcardProcess[] = inj.processes.map((p) => ({
              injuryId: createdInj.id,
              processName: p.processName,
              materialUsed: p.materialUsed || null,
              qty: p.qty || null,
              hours: p.hours || null,
              byWhom: p.byWhom || null,
              hardness: p.hardness || null,
              snHeatPad: p.snHeatPad || null,
              signQc: p.signQc || null,
            }));
            await db.insert(tireRepairJobcardProcesses).values(procToInsert);
          }
        }
      }
    }

    try {
      revalidatePath('/mobile/tire-repair/jobcard');
      revalidatePath('/mobile/tire-repair');
      revalidatePath('/dashboard/repair-retread/jobcard');
    } catch (e) {
      // Ignore static store missing errors in background context
    }

    return {
      success: true,
      message: 'Repair Job Card berhasil diperbarui',
      data: updatedRows[0],
    };
  } catch (error: any) {
    console.error('updateTireRepairJobcardAction error:', error);
    return {
      success: false,
      message: error?.message || 'Gagal memperbarui Repair Job Card',
    };
  }
}

export async function getJobcardQcDefaultApproverAction() {
  return {
    success: true,
    defaultQcName: 'Renaldo',
  };
}

