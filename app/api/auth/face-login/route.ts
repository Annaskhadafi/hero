// Mobile Biometric Face Login Route Handler
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { user, verification } from "@/db/schema/auth";
import { eq, isNotNull, and, or } from "drizzle-orm";
import crypto from "crypto";
import { rarayRecognizeFace, rarayVerifyFace, rarayCheckAntiSpoofUniFaceV2 } from "@/lib/raray-vision/client";
import { extractServerFaceEmbedding } from "@/lib/face-recognition/server-face-api";
import { cosineSimilarity } from "@/lib/face-recognition/cosine-similarity";

export async function POST(request: NextRequest) {
  try {
    let body: { imageDataUrl?: string; identifier?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Body request harus berupa JSON yang valid." },
        { status: 400 }
      );
    }

    const { imageDataUrl, identifier } = body;
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json(
        { success: false, error: "Gambar wajah (imageDataUrl) wajib diisi." },
        { status: 400 }
      );
    }

    const matches = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json(
        { success: false, error: "Format imageDataUrl tidak valid." },
        { status: 400 }
      );
    }

    const [, mimeType, base64Data] = matches;
    const imageBuffer = Buffer.from(base64Data, "base64");

    let matchedEmployee: typeof employees.$inferSelect | null = null;
    let confidenceScore = 0;
    let verificationMode = "1:N";

    console.log(
      "[face-login] Starting face login verification. Identifier:",
      identifier || "None (1:N search)",
      "mimeType:",
      mimeType,
      "buffer size:",
      imageBuffer.length
    );

    // 0. Anti-Spoofing Check via UniFace-v2 API
    const antiSpoof = await rarayCheckAntiSpoofUniFaceV2({
      imageBuffer,
      mimeType,
    });

    if (antiSpoof.status === "spoof_detected" || (antiSpoof.status === "success" && !antiSpoof.is_real)) {
      console.warn("[face-login] Spoof attack detected:", antiSpoof.verdict, antiSpoof.confidence);
      return NextResponse.json(
        {
          success: false,
          error: antiSpoof.message || "🚨 Spoofing / Foto Layar Terdeteksi. Harap gunakan wajah asli secara langsung.",
        },
        { status: 401 }
      );
    }

    // 1. Primary: 1:1 Verification Mode — resolves employee by SN/email first, then verifies face
    // When identifier is provided, this is the ONLY path that can succeed.
    // Fallbacks (1:N / local) are ONLY used when no identifier was given (anonymous scan).
    let identifierBoundEmployee: typeof employees.$inferSelect | null = null;

    if (identifier && typeof identifier === "string" && identifier.trim()) {
      const cleanIdentifier = identifier.trim().toLowerCase();
      
      const [row] = await db
        .select({
          employee: employees,
        })
        .from(employees)
        .leftJoin(user, eq(employees.authUserId, user.id))
        .where(
          and(
            eq(employees.isActive, true),
            or(
              eq(employees.email, cleanIdentifier),
              eq(employees.employeeSn, identifier.trim()),
              eq(user.email, cleanIdentifier)
            )
          )
        )
        .limit(1);

      const emp = row?.employee;

      if (!emp) {
        console.log("[face-login] Identifier provided but employee not found in active database:", cleanIdentifier);
        return NextResponse.json(
          { success: false, error: `SN/email "${identifier.trim()}" tidak ditemukan di database karyawan aktif.` },
          { status: 404 }
        );
      }

      identifierBoundEmployee = emp;
      verificationMode = "1:1";
      console.log("[face-login] Resolved employee for 1:1 verification:", emp.name, "ID:", emp.id);

      // Try Raray 1:1 verify
      try {
        const verifyRes = await rarayVerifyFace({
          employeeId: emp.id,
          employeeSn: emp.employeeSn || undefined,
          faceRarayId: emp.faceRarayId || undefined,
          imageBuffer,
          mimeType,
        });

        console.log("[face-login] Raray 1:1 verify result:", JSON.stringify(verifyRes));

        if (verifyRes.status === "success" && verifyRes.verified && (verifyRes.confidence ?? 0) >= 0.65) {
          matchedEmployee = emp;
          confidenceScore = verifyRes.confidence || 0.85;
          console.log("[face-login] 1:1 verification succeeded for:", emp.name, "Confidence:", confidenceScore);
        } else {
          console.log("[face-login] Raray 1:1 verification failed / confidence below threshold 0.65:", verifyRes.confidence);
        }
      } catch (err) {
        console.error("[face-login] Raray 1:1 verify request failed:", err);
      }

      // If Raray 1:1 failed, try local embedding as last resort — but ONLY against the same employee
      if (!matchedEmployee) {
        console.log("[face-login] Raray 1:1 failed. Trying local embedding for same employee:", emp.name);
        try {
          const extraction = await extractServerFaceEmbedding(imageBuffer);
          if (extraction && extraction.embedding && Array.isArray(emp.faceEmbedding) && emp.faceEmbedding.length > 0) {
            const sim = cosineSimilarity(extraction.embedding, emp.faceEmbedding as number[]);
            console.log("[face-login] Local 1:1 embedding similarity for", emp.name, ":", sim);
            if (sim >= 0.65) {
              matchedEmployee = emp;
              confidenceScore = sim;
              verificationMode = "local-1:1";
              console.log("[face-login] Local 1:1 embedding match succeeded for:", emp.name);
            } else {
              console.log("[face-login] Local 1:1 embedding similarity too low:", sim);
            }
          }
        } catch (err) {
          console.error("[face-login] Local 1:1 embedding failed:", err);
        }
      }

      // If still no match, reject — do NOT fall through to 1:N against other employees
      if (!matchedEmployee) {
        return NextResponse.json(
          {
            success: false,
            error: `Wajah tidak cocok dengan data biometrik ${emp.name}. Pastikan wajah Anda menghadap kamera dengan jelas, atau gunakan metode login lain.`,
          },
          { status: 401 }
        );
      }
    }

    // 2. Anonymous mode: No identifier provided — try 1:N recognition across all employees
    if (!matchedEmployee && !identifierBoundEmployee) {
      console.log("[face-login] No identifier. Trying Raray 1:N anonymous recognition...");
      try {
        const rarayResult = await rarayRecognizeFace({
          imageBuffer,
          mimeType,
        });

        console.log("[face-login] Raray 1:N result:", JSON.stringify(rarayResult));

        if (
          rarayResult.status === "success" &&
          rarayResult.recognized &&
          (rarayResult.employee_id || rarayResult.face_id) &&
          (rarayResult.confidence ?? 0) >= 0.65
        ) {
          const rawIdOrSn = String(rarayResult.employee_id || rarayResult.face_id || "").trim();
          const numericId = Number(rawIdOrSn);

          let foundEmp: typeof employees.$inferSelect | null = null;

          // 2a. Try lookup by DB Primary Key ID (if numeric)
          if (!isNaN(numericId) && numericId > 0) {
            const [byPk] = await db
              .select()
              .from(employees)
              .where(and(eq(employees.id, numericId), eq(employees.isActive, true)))
              .limit(1);
            if (byPk) foundEmp = byPk;
          }

          // 2b. Try lookup by employeeSn (e.g., "71261" or stripped "emp-71261")
          if (!foundEmp && rawIdOrSn) {
            const cleanSn = rawIdOrSn.replace(/^emp-/, "").trim();
            const [bySn] = await db
              .select()
              .from(employees)
              .where(and(eq(employees.employeeSn, cleanSn), eq(employees.isActive, true)))
              .limit(1);
            if (bySn) foundEmp = bySn;
          }

          // 2c. Try lookup by faceRarayId
          if (!foundEmp && rawIdOrSn) {
            const cleanFaceId = rawIdOrSn.replace(/^emp-/, "").trim();
            const [byFaceId] = await db
              .select()
              .from(employees)
              .where(
                and(
                  or(
                    eq(employees.faceRarayId, rawIdOrSn),
                    eq(employees.faceRarayId, cleanFaceId)
                  ),
                  eq(employees.isActive, true)
                )
              )
              .limit(1);
            if (byFaceId) foundEmp = byFaceId;
          }

          if (foundEmp) {
            matchedEmployee = foundEmp;
            confidenceScore = rarayResult.confidence || 0.85;
            console.log("[face-login] 1:N recognition matched active employee:", foundEmp.name, "ID:", foundEmp.id, "SN:", foundEmp.employeeSn);
          } else {
            console.warn("[face-login] 1:N recognition matched face ID/SN", rawIdOrSn, "but no active employee found in HERO DB.");
          }
        }
      } catch (err) {
        console.error("[face-login] Raray 1:N recognition failed:", err);
      }
    }

    // 3. Anonymous fallback: Local embedding comparison across all employees (no identifier)
    if (!matchedEmployee && !identifierBoundEmployee) {
      console.log("[face-login] Anonymous: Raray Vision could not match. Trying local embedding...");
      try {
        const extraction = await extractServerFaceEmbedding(imageBuffer);
        if (extraction && extraction.embedding) {
          console.log("[face-login] Local embedding extracted. Score:", extraction.detectionScore);
          const registeredEmployees = await db
            .select()
            .from(employees)
            .where(and(eq(employees.isActive, true), isNotNull(employees.faceEmbedding)));

          let highestSimilarity = 0;
          let bestMatch: typeof employees.$inferSelect | null = null;

          for (const emp of registeredEmployees) {
            if (Array.isArray(emp.faceEmbedding) && emp.faceEmbedding.length > 0) {
              const sim = cosineSimilarity(extraction.embedding, emp.faceEmbedding as number[]);
              if (sim > highestSimilarity) {
                highestSimilarity = sim;
                bestMatch = emp;
              }
            }
          }

          console.log("[face-login] Local embedding best match:", bestMatch ? bestMatch.name : "None", "Similarity:", highestSimilarity);

          if (bestMatch && highestSimilarity >= 0.65) {
            matchedEmployee = bestMatch;
            confidenceScore = highestSimilarity;
          }
        } else {
          console.log("[face-login] Local face-api did not detect any face.");
        }
      } catch (err) {
        console.error("[face-login] Local embedding matching failed:", err);
      }
    }


    // 4. Verification failed response
    if (!matchedEmployee) {
      return NextResponse.json(
        {
          success: false,
          error: "Wajah tidak dikenali atau belum terdaftar. Silakan lakukan registrasi wajah via menu absensi terlebih dahulu.",
        },
        { status: 401 }
      );
    }

    // 5. Check if user has login account and get their registered email
    let targetAuthUserId = matchedEmployee.authUserId;
    let targetUserEmail = "";

    if (targetAuthUserId) {
      const [foundUser] = await db
        .select({ email: user.email })
        .from(user)
        .where(eq(user.id, targetAuthUserId))
        .limit(1);
      if (foundUser) {
        targetUserEmail = foundUser.email;
      }
    } else if (matchedEmployee.email) {
      const [foundUser] = await db
        .select({ id: user.id, email: user.email })
        .from(user)
        .where(eq(user.email, matchedEmployee.email.toLowerCase().trim()))
        .limit(1);

      if (foundUser) {
        targetAuthUserId = foundUser.id;
        targetUserEmail = foundUser.email;
        await db
          .update(employees)
          .set({ authUserId: foundUser.id })
          .where(eq(employees.id, matchedEmployee.id));
      }
    }

    if (!targetAuthUserId || !targetUserEmail) {
      return NextResponse.json(
        {
          success: false,
          error: `Wajah dikenali sebagai ${matchedEmployee.name}, tetapi akun login belum dibuat. Silakan hubungi Administrator.`,
        },
        { status: 404 }
      );
    }

    // NATIVE AUTHENTICATION WAY: Generate a temporary magic link login token
    const magicToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    await db.insert(verification).values({
      id: crypto.randomBytes(16).toString("hex"),
      identifier: magicToken,
      value: JSON.stringify({ email: targetUserEmail.toLowerCase().trim(), name: matchedEmployee.name }),
      expiresAt: expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("[face-login] Created native magic-link token successfully for:", matchedEmployee.name);

    return NextResponse.json({
      success: true,
      message: `Selamat datang kembali, ${matchedEmployee.name}!`,
      confidence: confidenceScore,
      mode: verificationMode,
      token: magicToken,
      user: {
        name: matchedEmployee.name,
        email: targetUserEmail,
        employeeSn: matchedEmployee.employeeSn,
        employeeId: matchedEmployee.id,
      },
    });
  } catch (error: any) {
    console.error("[face-login] Fatal internal error:", error);
    return NextResponse.json(
      { success: false, error: `Terjadi kesalahan internal pada server: ${error?.message || error}` },
      { status: 500 }
    );
  }
}
