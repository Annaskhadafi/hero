import { db } from "@/db";
import {
  sopWinDocuments,
  sopWinRevisions,
  sopWinRagQueue,
} from "@/db/schema/hero";
import { eq, asc, sql, desc, or, and, inArray } from "drizzle-orm";
import { ingestRagDocument, getRagDocumentChunks, listRagDocuments } from "@/lib/hero-genius/client";
import { isS3UploadConfigured, getS3ObjectForProxy } from "@/lib/s3-storage";
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
    // Check if there is already a pending or processing item for this document
    const existing = await db
      .select({ id: sopWinRagQueue.id, status: sopWinRagQueue.status })
      .from(sopWinRagQueue)
      .where(
        and(
          eq(sopWinRagQueue.documentId, params.documentId),
          inArray(sopWinRagQueue.status, ["pending", "pending_retry", "processing"])
        )
      )
      .limit(1);

    let queueId: number;
    if (existing.length > 0) {
      queueId = existing[0].id;
      // Reset attempts and status if it was pending_retry
      await db
        .update(sopWinRagQueue)
        .set({
          status: "pending",
          fileUrl: params.fileUrl,
          fileName: params.fileName,
          fileType: params.fileType,
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(sopWinRagQueue.id, queueId));
    } else {
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
      queueId = inserted.id;
    }

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

    return { success: true, queueId };
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
    return;
  }
  // Launch in background asynchronously
  void processSopWinRagQueue();
}

/**
 * Sequential FIFO worker with S3 proxy support & smart chunk polling
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
        let fileBuffer: Buffer | null = null;

        // 1. Primary: Try S3 Object storage proxy (handles is3.cloudhost.id, cloud storage, etc.)
        if (isS3UploadConfigured() && item.fileUrl) {
          try {
            const s3Obj = await getS3ObjectForProxy(item.fileUrl);
            if (s3Obj?.body) {
              fileBuffer = Buffer.from(s3Obj.body);
            }
          } catch (s3Err) {
            console.warn(`[SOP/WIN RAG Queue] S3 proxy fetch error for #${item.id}:`, s3Err);
          }
        }

        // 2. Secondary: Try local filesystem (public/uploads)
        if (!fileBuffer && item.fileUrl) {
          try {
            const rawFilename = item.fileUrl.split("/").pop() || "";
            const decodedFilename = decodeURIComponent(rawFilename);
            const filePath = join(process.cwd(), "public", "uploads", decodedFilename);
            fileBuffer = await readFile(filePath);
          } catch (_) {
            try {
              const rawFilename = item.fileUrl.split("/").pop() || "";
              const filePath = join(process.cwd(), "public", "uploads", rawFilename);
              fileBuffer = await readFile(filePath);
            } catch (_) {}
          }
        }

        // 3. Fallback: Authenticated HTTP fetch via Vision proxy
        if (!fileBuffer && item.fileUrl) {
          const resolvedUrl = item.fileUrl.startsWith("http")
            ? item.fileUrl
            : `https://vision.chitraparatama.com${item.fileUrl.startsWith("/") ? "" : "/"}${item.fileUrl}`;
          const resp = await fetch(resolvedUrl);
          if (!resp.ok) {
            throw new Error(`Gagal mengunduh file dokumen (${resp.status} ${resp.statusText})`);
          }
          const arrayBuf = await resp.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuf);
        }

        if (!fileBuffer || fileBuffer.length === 0) {
          throw new Error("File dokumen tidak ditemukan di penyimpanan server (S3 / Local).");
        }

        const mimeType =
          item.fileType === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/pdf";

        const fileBlob = new File([fileBuffer as any], item.fileName || "document.pdf", {
          type: mimeType,
        });

        const ragFormData = new FormData();
        ragFormData.append("file", fileBlob);
        ragFormData.append("auto_ocr", "true");

        // Send to RAG Ingestion API
        const ragRes = await ingestRagDocument(ragFormData);
        const ragDocumentId = ragRes.document_id || ragRes.data?.document_id || null;
        let totalChunks = ragRes.total_chunks ?? ragRes.data?.total_chunks ?? 0;

        // If chunk count in ingestion response is 0, poll getRagDocumentChunks up to 3 times
        if (ragDocumentId && totalChunks === 0) {
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              await new Promise((resolve) => setTimeout(resolve, 2500));
              const chunksRes = await getRagDocumentChunks(ragDocumentId);
              if (chunksRes?.chunks && chunksRes.chunks.length > 0) {
                totalChunks = chunksRes.chunks.length;
                break;
              } else if (chunksRes?.total_chunks && chunksRes.total_chunks > 0) {
                totalChunks = chunksRes.total_chunks;
                break;
              }
            } catch (chunkErr) {
              console.warn(`[SOP/WIN RAG Queue] Polling chunks attempt ${attempt}/3 for doc ${ragDocumentId}:`, chunkErr);
            }
          }
        }

        // If chunks are still 0 and no document_id, throw error to trigger retry
        if (!ragDocumentId && totalChunks === 0) {
          throw new Error(
            `Hasil ekstraksi/chunking 0 chunk (RAG belum menghasilkan data vektor).`
          );
        }

        // Mark as completed
        const remoteS3Url = ragRes.s3_url || ragRes.data?.s3_url || null;

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
            ragDocumentId: ragDocumentId || undefined,
            ragChunksCount: totalChunks,
            ragStatus: "ready",
            ragErrorMessage: null,
            ragProcessedAt: new Date(),
            ...(remoteS3Url ? { pdfFileUrl: remoteS3Url } : {}),
            updatedAt: new Date(),
          })
          .where(eq(sopWinDocuments.id, item.documentId));

        if (item.revisionId) {
          await db
            .update(sopWinRevisions)
            .set({
              ragDocumentId: ragDocumentId || undefined,
              ragChunksCount: totalChunks,
              ragStatus: "ready",
              ragErrorMessage: null,
              ...(remoteS3Url ? { pdfFileUrl: remoteS3Url } : {}),
            })
            .where(eq(sopWinRevisions.id, item.revisionId));
        }

        console.log(
          `[SOP/WIN RAG Queue] Successfully ingested item #${item.id} (Doc #${item.documentId}, Chunks: ${totalChunks}, RAG ID: ${ragDocumentId}, S3: ${remoteS3Url || "N/A"})`
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
              ragChunksCount: 0,
              ragStatus: "failed",
              ragErrorMessage: finalErrMsg,
              updatedAt: new Date(),
            })
            .where(eq(sopWinDocuments.id, item.documentId));

          if (item.revisionId) {
            await db
              .update(sopWinRevisions)
              .set({
                ragChunksCount: 0,
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
    // Auto-recover stale 'processing' jobs that exceeded 3 minutes (e.g. from server restart or hung requests)
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    const staleItems = await db
      .select()
      .from(sopWinRagQueue)
      .where(
        and(
          eq(sopWinRagQueue.status, "processing"),
          or(
            sql`${sopWinRagQueue.startedAt} < ${threeMinutesAgo}`,
            sql`${sopWinRagQueue.createdAt} < ${threeMinutesAgo}`
          )
        )
      );

    for (const stale of staleItems) {
      // If the doc is already ready in sopWinDocuments, mark queue completed
      const [doc] = await db
        .select({ ragStatus: sopWinDocuments.ragStatus, ragChunksCount: sopWinDocuments.ragChunksCount })
        .from(sopWinDocuments)
        .where(eq(sopWinDocuments.id, stale.documentId));

      if (doc?.ragStatus === "ready" && (doc.ragChunksCount ?? 0) > 0) {
        await db
          .update(sopWinRagQueue)
          .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
          .where(eq(sopWinRagQueue.id, stale.id));
      } else {
        // Reset to pending_retry
        await db
          .update(sopWinRagQueue)
          .set({
            status: "pending_retry",
            errorMessage: "Waktu pemrosesan melebihi batas (stale auto-recovery)",
            updatedAt: new Date(),
          })
          .where(eq(sopWinRagQueue.id, stale.id));
      }
    }

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
      .limit(50);

    const pendingCount = queueRows.filter(
      (r) => r.status === "pending" || r.status === "pending_retry"
    ).length;
    const processingCount = queueRows.filter((r) => r.status === "processing").length;
    const failedCount = queueRows.filter((r) => r.status === "failed").length;

    // If there are pending items and worker is not currently running, trigger it
    if ((pendingCount > 0 || processingCount > 0) && !isWorkerProcessing) {
      triggerSopWinRagWorker();
    }

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
 * Sync SOP/WIN documents with actual RAG Knowledge Base and automatically enqueue any unchunked (0 chunks) documents
 */
export async function syncAndAutoChunkAllSopWinDocuments() {
  try {
    console.log("[RAG Sync] Fetching existing documents from RAG API...");
    let ragDocs: any[] = [];
    try {
      const ragRes = await listRagDocuments();
      ragDocs = ragRes.documents || [];
    } catch (e: any) {
      console.warn("[RAG Sync] Could not fetch listRagDocuments:", e.message);
    }

    // Get all DB documents
    const allDbDocs = await db
      .select({
        id: sopWinDocuments.id,
        documentNumber: sopWinDocuments.documentNumber,
        title: sopWinDocuments.title,
        pdfFileUrl: sopWinDocuments.pdfFileUrl,
        docxFileUrl: sopWinDocuments.docxFileUrl,
        ragDocumentId: sopWinDocuments.ragDocumentId,
        ragChunksCount: sopWinDocuments.ragChunksCount,
        ragStatus: sopWinDocuments.ragStatus,
      })
      .from(sopWinDocuments);

    let updatedCount = 0;
    let autoEnqueuedCount = 0;

    for (const doc of allDbDocs) {
      // Find matching document in RAG Knowledge Base
      const matchingRag = ragDocs.find((r) => {
        if (doc.ragDocumentId && r.id === doc.ragDocumentId) return true;
        // Match by filename or documentNumber
        const rawFilename = (doc.pdfFileUrl || doc.docxFileUrl || "").split("/").pop() || "";
        if (rawFilename && r.filename && (r.filename.includes(rawFilename) || rawFilename.includes(r.filename))) return true;
        if (doc.documentNumber && r.filename && r.filename.includes(doc.documentNumber)) return true;
        return false;
      });

      if (matchingRag && (matchingRag.total_chunks || 0) > 0) {
        // Document exists in RAG with chunks
        await db
          .update(sopWinDocuments)
          .set({
            ragDocumentId: matchingRag.id,
            ragChunksCount: matchingRag.total_chunks || 0,
            ragStatus: "ready",
            ragErrorMessage: null,
            updatedAt: new Date(),
          })
          .where(eq(sopWinDocuments.id, doc.id));
        updatedCount++;
      } else {
        // Document NOT chunked or 0 chunks in RAG: Auto-enqueue for chunking!
        console.log(`[RAG Sync] Document ${doc.documentNumber} (${doc.title}) has 0 chunks. Auto-enqueuing for RAG chunking...`);
        const fileUrl = doc.docxFileUrl || doc.pdfFileUrl;
        const fileType = doc.docxFileUrl ? "docx" : "pdf";
        const fileName = `${doc.documentNumber}-${doc.title}.${fileType}`;

        await enqueueSopWinRag({
          documentId: doc.id,
          fileUrl,
          fileName,
          fileType,
        });

        autoEnqueuedCount++;
      }
    }

    // Trigger worker to start processing immediately
    triggerSopWinRagWorker();

    return {
      success: true,
      totalDocuments: allDbDocs.length,
      syncedWithChunks: updatedCount,
      autoEnqueuedCount,
      message: `Sinkronisasi selesai. ${updatedCount} dokumen siap dengan chunks, ${autoEnqueuedCount} dokumen otomatis masuk antrian chunking.`,
    };
  } catch (error: any) {
    console.error("[syncAndAutoChunkAllSopWinDocuments] error:", error);
    return {
      success: false,
      error: error.message || "Gagal sinkronisasi dan auto-chunking dokumen.",
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
        documentNumber: sopWinDocuments.documentNumber,
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
    const fileName = `${d.documentNumber}-${d.title}.${fileType}`;

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
 * Retry all failed queue items and re-enqueue unchunked documents
 */
export async function retryAllFailedSopWinRag() {
  try {
    // 1. Reset all existing failed / pending_retry queue records to pending
    await db
      .update(sopWinRagQueue)
      .set({
        status: "pending",
        attempts: 0,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(or(eq(sopWinRagQueue.status, "failed"), eq(sopWinRagQueue.status, "pending_retry")));

    // 2. Find any docs that are failed or have 0 chunks
    const failedDocs = await db
      .select({
        id: sopWinDocuments.id,
        documentNumber: sopWinDocuments.documentNumber,
        title: sopWinDocuments.title,
        pdfFileUrl: sopWinDocuments.pdfFileUrl,
        docxFileUrl: sopWinDocuments.docxFileUrl,
      })
      .from(sopWinDocuments)
      .where(or(eq(sopWinDocuments.ragStatus, "failed"), eq(sopWinDocuments.ragChunksCount, 0)));

    for (const d of failedDocs) {
      const fileUrl = d.docxFileUrl || d.pdfFileUrl;
      if (!fileUrl) continue;
      const fileType = d.docxFileUrl ? "docx" : "pdf";
      const fileName = `${d.documentNumber}-${d.title}.${fileType}`;

      await enqueueSopWinRag({
        documentId: d.id,
        fileUrl,
        fileName,
        fileType,
      });
    }

    triggerSopWinRagWorker();

    return {
      success: true,
      message: `${failedDocs.length} dokumen berhasil dimasukkan ke antrian AI dan worker dijalankan.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete a specific queue item by queue ID
 */
export async function deleteSopWinRagQueueItem(queueId: number) {
  try {
    await db.delete(sopWinRagQueue).where(eq(sopWinRagQueue.id, queueId));
    return { success: true, message: "Item antrian berhasil dihapus." };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal menghapus item antrian." };
  }
}

/**
 * Clear all completed, failed, or stuck queue items
 */
export async function clearAllCompletedOrFailedQueue() {
  try {
    await db
      .delete(sopWinRagQueue)
      .where(or(eq(sopWinRagQueue.status, "completed"), eq(sopWinRagQueue.status, "failed")));
    return { success: true, message: "Riwayat antrian berhasil dibersihkan." };
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal membersihkan antrian." };
  }
}

