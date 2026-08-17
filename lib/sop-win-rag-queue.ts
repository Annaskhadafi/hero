import { db } from "@/db";
import {
  sopWinDocuments,
  sopWinRevisions,
  sopWinRagQueue,
} from "@/db/schema/hero";
import { eq, asc, sql, desc } from "drizzle-orm";
import { ingestRagDocument, getRagDocumentChunks } from "@/lib/hero-genius/client";
import { readFile } from "fs/promises";
import { join } from "path";

let isWorkerProcessing = false;

/**
 * Enqueue a document (or revision) to RAG background queue
 */
export async function enqueueSopWinRag(params: {
  documentId: number;
  revisionId?: number | null;
  fileUrl: string;
  fileName: string;
  fileType: "pdf" | "docx";
}) {
  try {
    const [inserted] = await db
      .insert(sopWinRagQueue)
      .values({
        documentId: params.documentId,
        revisionId: params.revisionId || null,
        fileUrl: params.fileUrl,
        fileName: params.fileName,
        fileType: params.fileType,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: sopWinRagQueue.id });

    // Mark document as pending in main table
    await db
      .update(sopWinDocuments)
      .set({
        ragStatus: "pending",
        ragErrorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(sopWinDocuments.id, params.documentId));

    if (params.revisionId) {
      await db
        .update(sopWinRevisions)
        .set({
          ragStatus: "pending",
          ragErrorMessage: null,
        })
        .where(eq(sopWinRevisions.id, params.revisionId));
    }

    // Trigger non-blocking worker in background
    triggerSopWinRagWorker();

    return { success: true, queueId: inserted.id };
  } catch (error: any) {
    console.error("[enqueueSopWinRag] error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Trigger background worker without awaiting
 */
export function triggerSopWinRagWorker() {
  if (isWorkerProcessing) {
    // Already running, next items in DB will be picked up automatically
    return;
  }
  // Launch in background asynchronously
  void processSopWinRagQueue();
}

/**
 * Sequential FIFO worker (Processes strictly 1 document at a time)
 * If a document fails, it continues immediately to the next document, and retries failed items at the end of the queue.
 */
export async function processSopWinRagQueue() {
  if (isWorkerProcessing) {
    return;
  }
  isWorkerProcessing = true;

  try {
    while (true) {
      // 1. Pick the oldest fresh pending item first
      let pendingItems = await db
        .select()
        .from(sopWinRagQueue)
        .where(eq(sopWinRagQueue.status, "pending"))
        .orderBy(asc(sopWinRagQueue.createdAt))
        .limit(1);

      // 2. If no fresh pending items, process items queued for retry at the end
      if (pendingItems.length === 0) {
        pendingItems = await db
          .select()
          .from(sopWinRagQueue)
          .where(eq(sopWinRagQueue.status, "pending_retry"))
          .orderBy(asc(sopWinRagQueue.updatedAt))
          .limit(1);
      }

      if (pendingItems.length === 0) {
        break; // All queue items and retries finished
      }

      const item = pendingItems[0];

      // Mark processing in queue & documents
      await db
        .update(sopWinRagQueue)
        .set({
          status: "processing",
          startedAt: new Date(),
          attempts: sql`${sopWinRagQueue.attempts} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(sopWinRagQueue.id, item.id));

      await db
        .update(sopWinDocuments)
        .set({
          ragStatus: "processing",
          updatedAt: new Date(),
        })
        .where(eq(sopWinDocuments.id, item.documentId));

      if (item.revisionId) {
        await db
          .update(sopWinRevisions)
          .set({ ragStatus: "processing" })
          .where(eq(sopWinRevisions.id, item.revisionId));
      }

      try {
        // Extract raw filename from fileUrl (e.g. /api/uploads/12345_doc.pdf)
        const rawFilename = item.fileUrl.split("/").pop() || "";
        const filePath = join(process.cwd(), "public", "uploads", rawFilename);

        const fileBuffer = await readFile(filePath);
        const mimeType =
          item.fileType === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/pdf";

        const fileBlob = new File([fileBuffer], item.fileName || rawFilename, {
          type: mimeType,
        });

        const ragFormData = new FormData();
        ragFormData.append("file", fileBlob);
        ragFormData.append("auto_ocr", "true");

        // Send to RAG Ingestion API
        const ragRes = await ingestRagDocument(ragFormData);
        const ragDocumentId = ragRes.data?.document_id || null;
        let totalChunks = ragRes.data?.total_chunks ?? 0;

        // If chunk count in ingestion response is 0, verify with getRagDocumentChunks
        if (ragDocumentId && totalChunks === 0) {
          try {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            const chunksRes = await getRagDocumentChunks(ragDocumentId);
            if (chunksRes?.chunks && chunksRes.chunks.length > 0) {
              totalChunks = chunksRes.chunks.length;
            } else if (chunksRes?.total_chunks && chunksRes.total_chunks > 0) {
              totalChunks = chunksRes.total_chunks;
            }
          } catch (chunkErr) {
            console.warn(`[SOP/WIN RAG Queue] Could not fetch chunks for doc ${ragDocumentId}:`, chunkErr);
          }
        }

        // If chunks are still 0 or no document_id, throw error to trigger end-of-queue retry
        if (!ragDocumentId || totalChunks === 0) {
          throw new Error(
            `Hasil ekstraksi/chunking 0 chunk (RAG belum menghasilkan data vektor).`
          );
        }

        // Mark as completed
        await db
          .update(sopWinRagQueue)
          .set({
            status: "completed",
            errorMessage: null,
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(sopWinRagQueue.id, item.id));

        await db
          .update(sopWinDocuments)
          .set({
            ragDocumentId,
            ragStatus: "ready",
            ragErrorMessage: null,
            ragProcessedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(sopWinDocuments.id, item.documentId));

        if (item.revisionId) {
          await db
            .update(sopWinRevisions)
            .set({
              ragDocumentId,
              ragStatus: "ready",
              ragErrorMessage: null,
            })
            .where(eq(sopWinRevisions.id, item.revisionId));
        }

        console.log(
          `[SOP/WIN RAG Queue] Successfully ingested item #${item.id} (Doc #${item.documentId}, Chunks: ${totalChunks}, RAG ID: ${ragDocumentId})`
        );
      } catch (itemErr: any) {
        const errMsg = itemErr?.message || "Gagal memproses OCR atau ingest RAG AI.";
        const currentAttempts = (item.attempts || 0) + 1;
        const MAX_SELF_RETRY_PASSES = 5;

        console.error(
          `[SOP/WIN RAG Queue] Ingestion failed/0 chunks for item #${item.id} (Percobaan ${currentAttempts}/${MAX_SELF_RETRY_PASSES}). Melanjutkan ke dokumen berikutnya...:`,
          errMsg
        );

        if (currentAttempts < MAX_SELF_RETRY_PASSES) {
          // Push to end of queue: status 'pending_retry' with updated timestamp
          const retryNote = `${errMsg} (Akan dicoba ulang di akhir antrian: percobaan ${currentAttempts}/${MAX_SELF_RETRY_PASSES})`;
          await db
            .update(sopWinRagQueue)
            .set({
              status: "pending_retry",
              errorMessage: retryNote,
              updatedAt: new Date(),
            })
            .where(eq(sopWinRagQueue.id, item.id));

          await db
            .update(sopWinDocuments)
            .set({
              ragStatus: "pending",
              ragErrorMessage: retryNote,
              updatedAt: new Date(),
            })
            .where(eq(sopWinDocuments.id, item.documentId));

          if (item.revisionId) {
            await db
              .update(sopWinRevisions)
              .set({
                ragStatus: "pending",
                ragErrorMessage: retryNote,
              })
              .where(eq(sopWinRevisions.id, item.revisionId));
          }
        } else {
          // Max passes reached: mark final failed
          const finalErrMsg = `${errMsg} (Gagal setelah ${MAX_SELF_RETRY_PASSES}x putaran antrian)`;
          await db
            .update(sopWinRagQueue)
            .set({
              status: "failed",
              errorMessage: finalErrMsg,
              updatedAt: new Date(),
            })
            .where(eq(sopWinRagQueue.id, item.id));

          await db
            .update(sopWinDocuments)
            .set({
              ragStatus: "failed",
              ragErrorMessage: finalErrMsg,
              updatedAt: new Date(),
            })
            .where(eq(sopWinDocuments.id, item.documentId));

          if (item.revisionId) {
            await db
              .update(sopWinRevisions)
              .set({
                ragStatus: "failed",
                ragErrorMessage: finalErrMsg,
              })
              .where(eq(sopWinRevisions.id, item.revisionId));
          }
        }
      }

      // Small delay between documents to prevent rate limit spikes
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (globalErr) {
    console.error("[processSopWinRagQueue] Fatal loop error:", globalErr);
  } finally {
    isWorkerProcessing = false;
  }
}

/**
 * Get current RAG Queue stats & list
 */
export async function getSopWinRagQueueStatus() {
  try {
    const queueRows = await db
      .select({
        id: sopWinRagQueue.id,
        documentId: sopWinRagQueue.documentId,
        revisionId: sopWinRagQueue.revisionId,
        fileName: sopWinRagQueue.fileName,
        fileType: sopWinRagQueue.fileType,
        status: sopWinRagQueue.status,
        attempts: sopWinRagQueue.attempts,
        errorMessage: sopWinRagQueue.errorMessage,
        startedAt: sopWinRagQueue.startedAt,
        completedAt: sopWinRagQueue.completedAt,
        createdAt: sopWinRagQueue.createdAt,
        documentTitle: sopWinDocuments.title,
        documentNumber: sopWinDocuments.documentNumber,
      })
      .from(sopWinRagQueue)
      .leftJoin(sopWinDocuments, eq(sopWinRagQueue.documentId, sopWinDocuments.id))
      .orderBy(desc(sopWinRagQueue.createdAt))
      .limit(30);

    const pendingCount = queueRows.filter(
      (r) => r.status === "pending" || r.status === "pending_retry"
    ).length;
    const processingCount = queueRows.filter((r) => r.status === "processing").length;
    const failedCount = queueRows.filter((r) => r.status === "failed").length;

    return {
      success: true,
      isWorkerRunning: isWorkerProcessing,
      pendingCount,
      processingCount,
      failedCount,
      queue: queueRows.map((r) => ({
        ...r,
        startedAt: r.startedAt ? r.startedAt.toISOString() : null,
        completedAt: r.completedAt ? r.completedAt.toISOString() : null,
        createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
      })),
    };
  } catch (error: any) {
    console.error("[getSopWinRagQueueStatus] error:", error);
    return {
      success: false,
      isWorkerRunning: false,
      pendingCount: 0,
      processingCount: 0,
      failedCount: 0,
      queue: [],
    };
  }
}

/**
 * Retry a specific failed queue item or document
 */
export async function retrySopWinRagItem(documentId: number) {
  try {
    const doc = await db
      .select({
        id: sopWinDocuments.id,
        title: sopWinDocuments.title,
        pdfFileUrl: sopWinDocuments.pdfFileUrl,
        docxFileUrl: sopWinDocuments.docxFileUrl,
      })
      .from(sopWinDocuments)
      .where(eq(sopWinDocuments.id, documentId))
      .limit(1);

    if (doc.length === 0) {
      return { success: false, error: "Dokumen tidak ditemukan." };
    }

    const d = doc[0];
    const fileUrl = d.docxFileUrl || d.pdfFileUrl;
    const fileType = d.docxFileUrl ? "docx" : "pdf";
    const fileName = `${d.title}.${fileType}`;

    // Reset status to pending
    await enqueueSopWinRag({
      documentId: d.id,
      fileUrl,
      fileName,
      fileType,
    });

    return { success: true, message: "Dokumen dimasukkan kembali ke antrian AI." };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Retry all failed queue items
 */
export async function retryAllFailedSopWinRag() {
  try {
    const failedDocs = await db
      .select({
        id: sopWinDocuments.id,
        title: sopWinDocuments.title,
        pdfFileUrl: sopWinDocuments.pdfFileUrl,
        docxFileUrl: sopWinDocuments.docxFileUrl,
      })
      .from(sopWinDocuments)
      .where(eq(sopWinDocuments.ragStatus, "failed"));

    for (const d of failedDocs) {
      const fileUrl = d.docxFileUrl || d.pdfFileUrl;
      const fileType = d.docxFileUrl ? "docx" : "pdf";
      const fileName = `${d.title}.${fileType}`;

      await enqueueSopWinRag({
        documentId: d.id,
        fileUrl,
        fileName,
        fileType,
      });
    }

    return {
      success: true,
      message: `${failedDocs.length} dokumen gagal berhasil dimasukkan kembali ke antrian AI.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
