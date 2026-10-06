'use me';
'use server';

import { db } from '@/db';
import { masterApd, apdRequestItems } from '@/db/schema';
import { apdSummaryItems } from '@/db/schema/apd-summary';
import { eq, asc, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export interface MasterApdInput {
  code: string;
  name: string;
  category: string; // 'APD', 'Tools', 'Material'
  unit: string; // 'Pcs', 'Pasang', 'Set', 'Box', 'Roll'
  hasSize: boolean;
  sizeOptions: string[];
  minStock?: number;
  isQtyOnly?: boolean;
  isActive?: boolean;
  notes?: string;
}

const DEFAULT_MASTER_APD_ITEMS: Array<{
  code: string;
  name: string;
  category: string;
  unit: string;
  hasSize: boolean;
  sizeOptions: string[];
}> = [
  { code: 'APD-001', name: 'Safety Shoes', category: 'APD', unit: 'Pasang', hasSize: true, sizeOptions: ['38', '39', '40', '41', '42', '43', '44', '45'] },
  { code: 'APD-002', name: 'Safety Boot Petrova', category: 'APD', unit: 'Pasang', hasSize: true, sizeOptions: ['38', '39', '40', '41', '42', '43', '44'] },
  { code: 'APD-003', name: 'Helmet Kuning', category: 'APD', unit: 'Pcs', hasSize: false, sizeOptions: [] },
  { code: 'APD-004', name: 'Helmet Putih', category: 'APD', unit: 'Pcs', hasSize: false, sizeOptions: [] },
  { code: 'APD-005', name: 'Safety Glasses', category: 'APD', unit: 'Pcs', hasSize: false, sizeOptions: [] },
  { code: 'APD-006', name: 'Safety Goggles', category: 'APD', unit: 'Pcs', hasSize: false, sizeOptions: [] },
  { code: 'APD-007', name: 'Sarung Tangan Ansel', category: 'APD', unit: 'Pasang', hasSize: false, sizeOptions: [] },
  { code: 'APD-008', name: 'Kaos Tangan Dotting', category: 'APD', unit: 'Pasang', hasSize: false, sizeOptions: [] },
  { code: 'APD-009', name: 'Masker', category: 'APD', unit: 'Box', hasSize: false, sizeOptions: [] },
  { code: 'APD-010', name: 'Ear Plug', category: 'APD', unit: 'Pcs', hasSize: false, sizeOptions: [] },
  { code: 'APD-011', name: 'Padlock Merah', category: 'APD', unit: 'Pcs', hasSize: false, sizeOptions: [] },
  { code: 'APD-012', name: 'Padlock Kuning', category: 'APD', unit: 'Pcs', hasSize: false, sizeOptions: [] },
  { code: 'APD-013', name: 'Sisor', category: 'APD', unit: 'Pcs', hasSize: false, sizeOptions: [] },
  { code: 'APD-014', name: 'Apron', category: 'APD', unit: 'Pcs', hasSize: false, sizeOptions: [] },
  { code: 'APD-015', name: 'Sunbrim Helmet', category: 'APD', unit: 'Pcs', hasSize: false, sizeOptions: [] },
  { code: 'APD-016', name: 'Dalaman Helm', category: 'APD', unit: 'Pcs', hasSize: false, sizeOptions: [] },
  { code: 'APD-017', name: 'Tali Kacamata', category: 'APD', unit: 'Pcs', hasSize: false, sizeOptions: [] },
  { code: 'APD-018', name: 'Chin Strap', category: 'APD', unit: 'Pcs', hasSize: false, sizeOptions: [] },
  { code: 'APD-019', name: 'Face Shield Helmet', category: 'APD', unit: 'Pcs', hasSize: false, sizeOptions: [] },
];

export async function getMasterApdListAction(category?: string, activeOnly: boolean = false) {
  try {
    let items = await db.select().from(masterApd).orderBy(asc(masterApd.code));

    // Auto-seed if empty
    if (items.length === 0) {
      await db.insert(masterApd).values(
        DEFAULT_MASTER_APD_ITEMS.map((item) => ({
          code: item.code,
          name: item.name,
          category: item.category,
          unit: item.unit,
          hasSize: item.hasSize,
          sizeOptions: item.sizeOptions,
          isQtyOnly: true,
          isActive: true,
        }))
      );
      items = await db.select().from(masterApd).orderBy(asc(masterApd.code));
    }

    let filtered = items;
    if (category) {
      filtered = filtered.filter((i) => i.category.toLowerCase() === category.toLowerCase());
    }
    if (activeOnly) {
      filtered = filtered.filter((i) => i.isActive);
    }

    return { success: true, data: filtered };
  } catch (error: any) {
    console.error('Error fetching master APD:', error);
    return { success: false, error: error.message || 'Gagal memuat Master Data APD' };
  }
}

export async function createMasterApdAction(input: MasterApdInput) {
  try {
    if (!input.code?.trim()) return { success: false, error: 'Kode APD wajib diisi' };
    if (!input.name?.trim()) return { success: false, error: 'Nama APD wajib diisi' };

    const existingCode = await db
      .select()
      .from(masterApd)
      .where(eq(masterApd.code, input.code.trim()));
    if (existingCode.length > 0) {
      return { success: false, error: `Kode APD '${input.code}' sudah terdaftar` };
    }

    const [newItem] = await db
      .insert(masterApd)
      .values({
        code: input.code.trim(),
        name: input.name.trim(),
        category: input.category || 'APD',
        unit: input.unit || 'Pcs',
        hasSize: input.hasSize || false,
        sizeOptions: input.sizeOptions || [],
        minStock: input.minStock || 0,
        isQtyOnly: input.isQtyOnly ?? true,
        isActive: input.isActive ?? true,
        notes: input.notes?.trim() || '',
      })
      .returning();

    revalidateMasterApdPaths();
    return { success: true, data: newItem };
  } catch (error: any) {
    console.error('Error creating master APD:', error);
    return { success: false, error: error.message || 'Gagal menambah Master APD' };
  }
}

export async function updateMasterApdAction(id: number, input: Partial<MasterApdInput>) {
  try {
    const [existing] = await db.select().from(masterApd).where(eq(masterApd.id, id)).limit(1);
    const oldName = existing?.name;
    const newName = input.name ? input.name.trim() : undefined;

    const [updated] = await db
      .update(masterApd)
      .set({
        ...(input.code && { code: input.code.trim() }),
        ...(newName && { name: newName }),
        ...(input.category && { category: input.category }),
        ...(input.unit && { unit: input.unit }),
        ...(input.hasSize !== undefined && { hasSize: input.hasSize }),
        ...(input.sizeOptions && { sizeOptions: input.sizeOptions }),
        ...(input.minStock !== undefined && { minStock: input.minStock }),
        ...(input.isQtyOnly !== undefined && { isQtyOnly: input.isQtyOnly }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.notes !== undefined && { notes: input.notes.trim() }),
        updatedAt: new Date(),
      })
      .where(eq(masterApd.id, id))
      .returning();

    // If item name changed, update existing request items and summary items so documents reflect the new name
    if (oldName && newName && oldName !== newName) {
      await db
        .update(apdRequestItems)
        .set({ itemType: newName })
        .where(eq(apdRequestItems.itemType, oldName));

      await db
        .update(apdSummaryItems)
        .set({ itemName: newName })
        .where(eq(apdSummaryItems.itemName, oldName));
    }

    revalidateMasterApdPaths();
    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating master APD:', error);
    return { success: false, error: error.message || 'Gagal memperbarui Master APD' };
  }
}

export async function toggleMasterApdStatusAction(id: number, isActive: boolean) {
  try {
    await db
      .update(masterApd)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(masterApd.id, id));

    revalidateMasterApdPaths();
    return { success: true };
  } catch (error: any) {
    console.error('Error toggling master APD status:', error);
    return { success: false, error: error.message || 'Gagal mengubah status Master APD' };
  }
}

export async function deleteMasterApdAction(id: number) {
  try {
    await db.delete(masterApd).where(eq(masterApd.id, id));
    revalidateMasterApdPaths();
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting master APD:', error);
    return { success: false, error: error.message || 'Gagal menghapus Master APD' };
  }
}

function revalidateMasterApdPaths() {
  try {
    revalidatePath('/dashboard/central-service/master-apd');
    revalidatePath('/dashboard/apd/master');
    revalidatePath('/dashboard/apd');
    revalidatePath('/dashboard/summary');
    revalidatePath('/dashboard/apd/new');
  } catch (e) {
    // ignore outside request context
  }
}
