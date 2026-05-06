"use server";

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  cargoManifests,
  cargoManifestItems,
  cargoMasterGoods,
  cargoMasterLocations,
  cargoMasterRecipients,
  employees,
} from "@/db/schema/hero";

// ─── Ensure tables exist ──────────────────────────────────────────────────────

async function ensureCargoManifestTables() {
  await db.execute(sql`
    create table if not exists hero_cargo_manifests (
      id serial primary key,
      manifest_number text not null unique,
      date date not null,
      attention text not null default '',
      transport_via text not null default '',
      shipped_via text not null default '',
      final_destination text not null default '',
      signature_name text not null default '',
      signature_data_url text not null default '',
      status text not null default 'draft',
      created_by_employee_id integer references hero_employees(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await db.execute(sql`
    create table if not exists hero_cargo_manifest_items (
      id serial primary key,
      manifest_id integer not null references hero_cargo_manifests(id) on delete cascade,
      no integer not null default 1,
      description text not null default '',
      serial_number text not null default '',
      qty integer not null default 1,
      brand text not null default '',
      remark text not null default '',
      created_at timestamptz not null default now()
    )
  `);
  await db.execute(sql`
    alter table hero_cargo_manifests
      add column if not exists signature_name text not null default '',
      add column if not exists signature_data_url text not null default ''
  `);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type CargoManifestRecord = {
  id: number;
  manifestNumber: string;
  date: string;
  attention: string;
  transportVia: string;
  shippedVia: string;
  finalDestination: string;
  signatureName: string;
  signatureDataUrl: string;
  status: string;
  createdByEmployeeId: number | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: CargoManifestItemRecord[];
};

export type CargoManifestItemRecord = {
  id: number;
  manifestId: number;
  no: number;
  description: string;
  serialNumber: string;
  qty: number;
  brand: string;
  remark: string;
};

export type CargoManifestMutationState = {
  status: "idle" | "success" | "error";
  message: string;
  manifestId?: number;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getCargoManifests(): Promise<CargoManifestRecord[]> {
  await ensureCargoManifestTables();

  const rows = await db
    .select({
      id: cargoManifests.id,
      manifestNumber: cargoManifests.manifestNumber,
      date: cargoManifests.date,
      attention: cargoManifests.attention,
      transportVia: cargoManifests.transportVia,
      shippedVia: cargoManifests.shippedVia,
      finalDestination: cargoManifests.finalDestination,
      signatureName: cargoManifests.signatureName,
      signatureDataUrl: cargoManifests.signatureDataUrl,
      status: cargoManifests.status,
      createdByEmployeeId: cargoManifests.createdByEmployeeId,
      createdByName: employees.name,
      createdAt: cargoManifests.createdAt,
      updatedAt: cargoManifests.updatedAt,
    })
    .from(cargoManifests)
    .leftJoin(employees, eq(cargoManifests.createdByEmployeeId, employees.id))
    .orderBy(desc(cargoManifests.createdAt));

  const items = await db
    .select()
    .from(cargoManifestItems)
    .orderBy(asc(cargoManifestItems.manifestId), asc(cargoManifestItems.no));

  const itemsByManifest = new Map<number, CargoManifestItemRecord[]>();
  for (const item of items) {
    if (!itemsByManifest.has(item.manifestId)) {
      itemsByManifest.set(item.manifestId, []);
    }
    itemsByManifest.get(item.manifestId)!.push({
      id: item.id,
      manifestId: item.manifestId,
      no: item.no,
      description: item.description,
      serialNumber: item.serialNumber,
      qty: item.qty,
      brand: item.brand,
      remark: item.remark,
    });
  }

  return rows.map((row) => ({
    ...row,
    items: itemsByManifest.get(row.id) ?? [],
  }));
}

export async function getCargoManifestById(id: number): Promise<CargoManifestRecord | null> {
  await ensureCargoManifestTables();

  const [row] = await db
    .select({
      id: cargoManifests.id,
      manifestNumber: cargoManifests.manifestNumber,
      date: cargoManifests.date,
      attention: cargoManifests.attention,
      transportVia: cargoManifests.transportVia,
      shippedVia: cargoManifests.shippedVia,
      finalDestination: cargoManifests.finalDestination,
      signatureName: cargoManifests.signatureName,
      signatureDataUrl: cargoManifests.signatureDataUrl,
      status: cargoManifests.status,
      createdByEmployeeId: cargoManifests.createdByEmployeeId,
      createdByName: employees.name,
      createdAt: cargoManifests.createdAt,
      updatedAt: cargoManifests.updatedAt,
    })
    .from(cargoManifests)
    .leftJoin(employees, eq(cargoManifests.createdByEmployeeId, employees.id))
    .where(eq(cargoManifests.id, id))
    .limit(1);

  if (!row) return null;

  const items = await db
    .select()
    .from(cargoManifestItems)
    .where(eq(cargoManifestItems.manifestId, id))
    .orderBy(asc(cargoManifestItems.no));

  return {
    ...row,
    items: items.map((item) => ({
      id: item.id,
      manifestId: item.manifestId,
      no: item.no,
      description: item.description,
      serialNumber: item.serialNumber,
      qty: item.qty,
      brand: item.brand,
      remark: item.remark,
    })),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function generateManifestNumber(): Promise<string> {
  const result = await db.execute(
    sql`select count(*) as cnt from hero_cargo_manifests`
  );
  const count = Number((result.rows[0] as { cnt: string }).cnt ?? 0) + 1;
  const padded = String(count).padStart(6, "0");
  return `CM-${padded}`;
}

function parseItemsJson(raw: string): Array<Omit<CargoManifestItemRecord, "id" | "manifestId">> {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: Record<string, unknown>, idx: number) => ({
      no: Number(item.no) || idx + 1,
      description: String(item.description ?? ""),
      serialNumber: String(item.serialNumber ?? ""),
      qty: Number(item.qty) || 1,
      brand: String(item.brand ?? ""),
      remark: String(item.remark ?? ""),
    }));
  } catch {
    return [];
  }
}

async function syncCargoMasterData(data: z.infer<typeof manageCargoManifestSchema>) {
  const items = parseItemsJson(data.itemsJson ?? "[]");
  const attention = data.attention.trim();
  const finalDestination = data.finalDestination.trim();

  if (attention) {
    await db
      .insert(cargoMasterRecipients)
      .values({ recipientName: attention })
      .onConflictDoNothing({ target: cargoMasterRecipients.recipientName });
  }

  if (finalDestination) {
    await db
      .insert(cargoMasterLocations)
      .values({ locationName: finalDestination })
      .onConflictDoNothing({ target: cargoMasterLocations.locationName });
  }

  const uniqueItems = Array.from(
    new Map(items.filter((item) => item.description.trim()).map((item) => [item.description.trim(), item])).values(),
  );

  for (const item of uniqueItems) {
    const goodsName = item.description.trim();
    const existing = await db
      .select({ id: cargoMasterGoods.id, brand: cargoMasterGoods.brand })
      .from(cargoMasterGoods)
      .where(eq(cargoMasterGoods.goodsName, goodsName))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(cargoMasterGoods).values({ goodsName, brand: item.brand.trim() });
    } else if (!existing[0].brand && item.brand.trim()) {
      await db
        .update(cargoMasterGoods)
        .set({ brand: item.brand.trim(), updatedAt: new Date() })
        .where(eq(cargoMasterGoods.id, existing[0].id));
    }
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────

const manageCargoManifestSchema = z.object({
  intent: z.enum(["create", "update", "update-status", "delete"]),
  id: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().positive().optional(),
  ),
  date: z.string().trim().optional().default(""),
  attention: z.string().trim().max(200).optional().default(""),
  transportVia: z.string().trim().max(200).optional().default(""),
  shippedVia: z.string().trim().max(200).optional().default(""),
  finalDestination: z.string().trim().max(200).optional().default(""),
  signatureName: z.string().trim().max(200).optional().default(""),
  signatureDataUrl: z.string().trim().max(250_000).optional().default(""),
  status: z.string().trim().max(50).optional().default("draft"),
  itemsJson: z.string().trim().optional().default("[]"),
});

export async function manageCargoManifestAction(
  _prev: CargoManifestMutationState,
  formData: FormData,
): Promise<CargoManifestMutationState> {
  await ensureCargoManifestTables();

  const parsed = manageCargoManifestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Validasi gagal." };
  }

  const data = parsed.data;
  const now = new Date();

  try {
    if (data.intent === "create") {
      const manifestNumber = await generateManifestNumber();
      const dateValue = data.date || new Date().toISOString().split("T")[0];
      const [inserted] = await db
        .insert(cargoManifests)
        .values({
          manifestNumber,
          date: dateValue,
          attention: data.attention ?? "",
          transportVia: data.transportVia ?? "",
          shippedVia: data.shippedVia ?? "",
          finalDestination: data.finalDestination ?? "",
          signatureName: data.signatureName ?? "",
          signatureDataUrl: data.signatureDataUrl ?? "",
          status: data.status ?? "draft",
          updatedAt: now,
        })
        .returning({ id: cargoManifests.id });

      const items = parseItemsJson(data.itemsJson ?? "[]");
      if (items.length > 0) {
        await db.insert(cargoManifestItems).values(
          items.map((item) => ({ ...item, manifestId: inserted.id })),
        );
      }
      await syncCargoMasterData(data);

      revalidatePath("/dashboard/cargo-manifest");
      return { status: "success", message: `Cargo Manifest ${manifestNumber} berhasil dibuat.`, manifestId: inserted.id };
    }

    if (data.intent === "update") {
      if (!data.id) return { status: "error", message: "ID manifest tidak valid." };

      await db
        .update(cargoManifests)
        .set({
          date: data.date || new Date().toISOString().split("T")[0],
          attention: data.attention ?? "",
          transportVia: data.transportVia ?? "",
          shippedVia: data.shippedVia ?? "",
          finalDestination: data.finalDestination ?? "",
          signatureName: data.signatureName ?? "",
          signatureDataUrl: data.signatureDataUrl ?? "",
          status: data.status ?? "draft",
          updatedAt: now,
        })
        .where(eq(cargoManifests.id, data.id));

      // Replace items
      await db.delete(cargoManifestItems).where(eq(cargoManifestItems.manifestId, data.id));
      const items = parseItemsJson(data.itemsJson ?? "[]");
      if (items.length > 0) {
        await db.insert(cargoManifestItems).values(
          items.map((item) => ({ ...item, manifestId: data.id! })),
        );
      }
      await syncCargoMasterData(data);

      revalidatePath("/dashboard/cargo-manifest");
      return { status: "success", message: "Cargo Manifest berhasil diperbarui." };
    }

    if (data.intent === "update-status") {
      if (!data.id) return { status: "error", message: "ID manifest tidak valid." };

      await db
        .update(cargoManifests)
        .set({ status: data.status ?? "draft", updatedAt: now })
        .where(eq(cargoManifests.id, data.id));

      revalidatePath("/dashboard/cargo-manifest");
      return { status: "success", message: "Status berhasil diperbarui." };
    }

    if (data.intent === "delete") {
      if (!data.id) return { status: "error", message: "ID manifest tidak valid." };
      await db.delete(cargoManifests).where(eq(cargoManifests.id, data.id));
      revalidatePath("/dashboard/cargo-manifest");
      return { status: "success", message: "Cargo Manifest berhasil dihapus." };
    }

    return { status: "error", message: "Intent tidak dikenal." };
  } catch (error) {
    console.error("[manageCargoManifestAction]", error);
    return { status: "error", message: "Terjadi kesalahan server." };
  }
}

// ─── CSV Import ───────────────────────────────────────────────────────────────

export type CargoImportState = {
  status: "idle" | "success" | "error";
  message: string;
  importedCount?: number;
};

export async function importCargoManifestsAction(
  _prev: CargoImportState,
  formData: FormData,
): Promise<CargoImportState> {
  await ensureCargoManifestTables();

  const rawCsv = formData.get("rawCsv") as string;
  if (!rawCsv?.trim()) {
    return { status: "error", message: "File CSV tidak boleh kosong." };
  }

  try {
    const lines = rawCsv.trim().split(/\r?\n/);
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    
    const getCol = (row: string[], key: string) => {
      const idx = headers.indexOf(key);
      return idx >= 0 ? (row[idx] ?? "").trim() : "";
    };

    let importedCount = 0;
    const now = new Date();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const date = getCol(cols, "date") || getCol(cols, "tanggal") || new Date().toISOString().split("T")[0];
      const attention = getCol(cols, "attention");
      const transportVia = getCol(cols, "transport_via");
      const shippedVia = getCol(cols, "shipped_via");
      const finalDestination = getCol(cols, "final_destination");
      const status = getCol(cols, "status") || "draft";

      const manifestNumber = await generateManifestNumber();
      await db.insert(cargoManifests).values({
        manifestNumber,
        date,
        attention,
        transportVia,
        shippedVia,
        finalDestination,
        status,
        updatedAt: now,
      });

      importedCount++;
    }

    revalidatePath("/dashboard/cargo-manifest");
    return { status: "success", message: `${importedCount} manifest berhasil diimpor.`, importedCount };
  } catch (error) {
    console.error("[importCargoManifestsAction]", error);
    return { status: "error", message: "Gagal mengimpor data CSV." };
  }
}
