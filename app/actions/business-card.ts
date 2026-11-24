'use server';

import { db } from '@/db';
import { expoBusinessCards, type ExpoBusinessCard } from '@/db/schema/expo-business-cards';
import { extractBusinessCardFromImage, type BusinessCardExtraction } from '@/lib/business-card-ai';
import { uploadAnyFileToS3 } from '@/lib/s3-storage';
import { createHash } from 'node:crypto';
import { getAuthenticatedSession } from '@/lib/rbac';
import { desc, eq, ilike, or, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore outside Next.js request context (e.g. tests or standalone scripts)
  }
}
import { z } from 'zod';

function imagePrefix(owner: string) {
  return `business-cards/${createHash('sha256').update(owner).digest('hex')}`;
}

const BusinessCardSchema = z.object({
  id: z.number().optional(),
  expoName: z.string().default(''),
  contactName: z.string().min(1, 'Nama kontak wajib diisi'),
  companyName: z.string().default(''),
  jobTitle: z.string().default(''),
  phoneNumber: z.string().default(''),
  email: z.string().default(''),
  address: z.string().default(''),
  website: z.string().default(''),
  businessCategory: z.string().nullable().optional(),
  productsServices: z.string().nullable().optional(),
  cardImageUrl: z.string().default(''),
  notes: z.string().default(''),
  category: z.enum(['lead', 'client', 'vendor', 'partner', 'other']).default('lead'),
  rating: z.enum(['hot', 'warm', 'cold']).default('warm'),
});

export type BusinessCardFormInput = z.infer<typeof BusinessCardSchema>;

export async function scanBusinessCardAction(formData: FormData): Promise<{
  success: boolean;
  extractionFailed?: boolean;
  cardImageUrl?: string;
  extracted?: BusinessCardExtraction;
  error?: string;
}> {
  try {
    const session = await getAuthenticatedSession('business_cards', 'create');
    if (!session.user.id) return { success: false, error: 'Unauthorized' };
    const file = formData.get('file');
    if (!(file instanceof File) || !file.size || file.size > 5_000_000 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return { success: false, error: 'File gambar kartu nama tidak ditemukan' };
    }

    // 1. Upload to persistent S3 storage
    const { key } = await uploadAnyFileToS3(file, imagePrefix(session.user.id));
    const cardImageUrl = `/api/uploads/${key}`;

    // 2. Read buffer for Vision AI
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileBase64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    // 3. Extract contact entities via AI Vision
    const aiResult = await extractBusinessCardFromImage({ fileBase64, mimeType });

    if (aiResult.isMockFallback) {
      return { success: false, extractionFailed: true, cardImageUrl, error: 'Ekstraksi kartu nama gagal' };
    }
    return { success: true, cardImageUrl, extracted: aiResult.data };
  } catch (error: any) {
    console.error('[scanBusinessCardAction] Error:', error);
    return {
      success: false,
      error: 'Gagal memproses gambar kartu nama',
    };
  }
}

export async function saveBusinessCardAction(rawInput: BusinessCardFormInput): Promise<{
  success: boolean;
  id?: number;
  error?: string;
}> {
  try {
    const session = await getAuthenticatedSession('business_cards', rawInput.id ? 'edit' : 'create');
    if (!session.user.id) return { success: false, error: 'Unauthorized' };
    const validated = BusinessCardSchema.parse(rawInput);

    if (validated.id) {
      // Update existing
      const updated = await db
        .update(expoBusinessCards)
        .set({
          expoName: validated.expoName,
          contactName: validated.contactName,
          companyName: validated.companyName,
          jobTitle: validated.jobTitle,
          phoneNumber: validated.phoneNumber,
          email: validated.email,
          address: validated.address,
          website: validated.website,
          businessCategory: validated.businessCategory ?? null,
          productsServices: validated.productsServices ?? null,

          notes: validated.notes,
          category: validated.category,
          rating: validated.rating,
          updatedAt: new Date(),
        })
        .where(and(eq(expoBusinessCards.id, validated.id), eq(expoBusinessCards.createdById, session.user.id)))
        .returning({ id: expoBusinessCards.id });
      if (!updated.length) return { success: false, error: 'Kartu tidak ditemukan atau akses ditolak' };

      safeRevalidatePath('/dashboard/business-cards');
      return { success: true, id: validated.id };
    }

    const imageBase = `/api/uploads/${imagePrefix(session.user.id)}/`;
    if (validated.cardImageUrl && (!validated.cardImageUrl.startsWith(imageBase) ||
      !/^[0-9a-f-]{36}\.(?:jpg|jpeg|png|webp)$/.test(validated.cardImageUrl.slice(imageBase.length)))) {
      return { success: false, error: 'Foto kartu tidak valid' };
    }
    // Insert new
    const [inserted] = await db
      .insert(expoBusinessCards)
      .values({
        expoName: validated.expoName,
        contactName: validated.contactName,
        companyName: validated.companyName,
        jobTitle: validated.jobTitle,
        phoneNumber: validated.phoneNumber,
        email: validated.email,
        address: validated.address,
        website: validated.website,
        businessCategory: validated.businessCategory ?? null,
        productsServices: validated.productsServices ?? null,
        cardImageUrl: validated.cardImageUrl,
        notes: validated.notes,
        category: validated.category,
        rating: validated.rating,
        createdById: session.user.id,
        createdByName: session.user.name || '',
      })
      .returning({ id: expoBusinessCards.id });

    safeRevalidatePath('/dashboard/business-cards');
    return { success: true, id: inserted?.id };
  } catch (error: any) {
    console.error('[saveBusinessCardAction] Error:', error);
    return {
      success: false,
      error: error?.errors?.[0]?.message || error?.message || 'Gagal menyimpan kartu nama',
    };
  }
}

export async function getBusinessCardsAction(params?: {
  search?: string;
  expoName?: string;
}): Promise<{
  success: boolean;
  data: ExpoBusinessCard[];
  error?: string;
}> {
  try {
    const session = await getAuthenticatedSession('business_cards', 'view');
    if (!session.user.id) return { success: false, data: [], error: 'Unauthorized' };
    const conditions = [eq(expoBusinessCards.createdById, session.user.id)];

    if (params?.search?.trim()) {
      const q = `%${params.search.trim()}%`;
      conditions.push(
        or(
          ilike(expoBusinessCards.contactName, q),
          ilike(expoBusinessCards.companyName, q),
          ilike(expoBusinessCards.jobTitle, q),
          ilike(expoBusinessCards.expoName, q),
          ilike(expoBusinessCards.phoneNumber, q),
          ilike(expoBusinessCards.email, q)
        )!
      );
    }

    if (params?.expoName?.trim()) {
      conditions.push(eq(expoBusinessCards.expoName, params.expoName.trim()));
    }

    const whereClause = and(...conditions);

    const cards = await db
      .select()
      .from(expoBusinessCards)
      .where(whereClause)
      .orderBy(desc(expoBusinessCards.createdAt));

    return {
      success: true,
      data: cards,
    };
  } catch (error: any) {
    console.error('[getBusinessCardsAction] Error:', error);
    return {
      success: false,
      data: [],
      error: error?.message || 'Gagal mengambil data kartu nama',
    };
  }
}

export async function deleteBusinessCardAction(id: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getAuthenticatedSession('business_cards', 'delete');
    if (!session.user.id) return { success: false, error: 'Unauthorized' };
    const deleted = await db.delete(expoBusinessCards)
      .where(and(eq(expoBusinessCards.id, id), eq(expoBusinessCards.createdById, session.user.id)))
      .returning({ id: expoBusinessCards.id });
    if (!deleted.length) return { success: false, error: 'Kartu tidak ditemukan atau akses ditolak' };
    safeRevalidatePath('/dashboard/business-cards');
    return { success: true };
  } catch (error: any) {
    console.error('[deleteBusinessCardAction] Error:', error);
    return {
      success: false,
      error: error?.message || 'Gagal menghapus kartu nama',
    };
  }
}
