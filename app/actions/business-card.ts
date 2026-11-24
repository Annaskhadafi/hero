'use server';

import { db } from '@/db';
import { expoBusinessCards, type ExpoBusinessCard } from '@/db/schema/expo-business-cards';
import { extractBusinessCardFromImage, type BusinessCardExtraction } from '@/lib/business-card-ai';
import { uploadFile } from '@/app/actions/upload';
import { getServerSession } from '@/lib/auth-session';
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
  cardImageUrl: z.string().default(''),
  notes: z.string().default(''),
  category: z.enum(['lead', 'client', 'vendor', 'partner', 'other']).default('lead'),
  rating: z.enum(['hot', 'warm', 'cold']).default('warm'),
});

export type BusinessCardFormInput = z.infer<typeof BusinessCardSchema>;

export async function scanBusinessCardAction(formData: FormData): Promise<{
  success: boolean;
  cardImageUrl?: string;
  extracted?: BusinessCardExtraction;
  error?: string;
}> {
  try {
    const file = formData.get('file') as File | null;
    if (!file) {
      return { success: false, error: 'File gambar kartu nama tidak ditemukan' };
    }

    // 1. Upload to persistent S3 storage
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('uploadTarget', 'business-cards');
    const uploadResult = await uploadFile(uploadFormData);

    let cardImageUrl = '';
    if (uploadResult.success && uploadResult.url) {
      cardImageUrl = uploadResult.url;
    } else {
      console.warn('S3 upload warning, proceeding with extraction:', uploadResult.error);
    }

    // 2. Read buffer for Vision AI
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileBase64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    // 3. Extract contact entities via AI Vision
    const aiResult = await extractBusinessCardFromImage({ fileBase64, mimeType });

    return {
      success: true,
      cardImageUrl,
      extracted: aiResult.data,
    };
  } catch (error: any) {
    console.error('[scanBusinessCardAction] Error:', error);
    return {
      success: false,
      error: error?.message || 'Gagal memproses gambar kartu nama',
    };
  }
}

export async function saveBusinessCardAction(rawInput: BusinessCardFormInput): Promise<{
  success: boolean;
  id?: number;
  error?: string;
}> {
  try {
    const session = await getServerSession();
    const validated = BusinessCardSchema.parse(rawInput);

    if (validated.id) {
      // Update existing
      await db
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
          cardImageUrl: validated.cardImageUrl,
          notes: validated.notes,
          category: validated.category,
          rating: validated.rating,
          updatedAt: new Date(),
        })
        .where(eq(expoBusinessCards.id, validated.id));

      safeRevalidatePath('/dashboard/business-cards');
      return { success: true, id: validated.id };
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
        cardImageUrl: validated.cardImageUrl,
        notes: validated.notes,
        category: validated.category,
        rating: validated.rating,
        createdById: session?.user?.id || null,
        createdByName: session?.user?.name || 'Sistem',
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
    const conditions = [];

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
        )
      );
    }

    if (params?.expoName?.trim()) {
      conditions.push(eq(expoBusinessCards.expoName, params.expoName.trim()));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

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
    await db.delete(expoBusinessCards).where(eq(expoBusinessCards.id, id));
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
