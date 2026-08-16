"use server";

import { ingestRagDocument } from "@/lib/hero-genius/client";

export async function uploadToKnowledgeBase(formData: FormData) {
  try {
    const result = await ingestRagDocument(formData);
    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error("[uploadToKnowledgeBase] error:", error);
    return {
      success: false,
      error: error.message || "Failed to upload document to knowledge base",
    };
  }
}
