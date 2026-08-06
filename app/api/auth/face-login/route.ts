// Mobile Biometric Face Login Route Handler
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { user, verification } from "@/db/schema/auth";
import { eq, isNotNull, and, or } from "drizzle-orm";
import crypto from "crypto";
import { rarayRecognizeFace, rarayVerifyFace } from "@/lib/raray-vision/client";
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

    // 1. Primary: 1:1 Verification Mode (highly recommended for speed & reliability)
    if (identifier && typeof identifier === "string" && identifier.trim()) {
      const cleanIdentifier = identifier.trim().toLowerCase();
      
      const [emp] = await db
        .select()
        .from(employees)
        .where(
          and(
            eq(employees.isActive, true),
            or(
              eq(employees.email, cleanIdentifier),
              eq(employees.employeeSn, identifier.trim())
            )
          )
        )
        .limit(1);

      if (emp) {
        verificationMode = "1:1";
        console.log("[face-login] Resolved employee for 1:1 verification:", emp.name, "ID:", emp.id);
        try {
          const verifyRes = await rarayVerifyFace({
            employeeId: emp.id,
            imageBuffer,
            mimeType,
          });

          console.log("[face-login] Raray 1:1 verify result:", JSON.stringify(verifyRes));

          if (verifyRes.status === "success" && verifyRes.verified) {
            matchedEmployee = emp;
            confidenceScore = verifyRes.confidence || 0.85;
            console.log("[face-login] 1:1 verification succeeded for:", emp.name);
          } else {
            console.log("[face-login] 1:1 verification failed / match confidence below threshold.");
          }
        } catch (err) {
          console.error("[face-login] Raray 1:1 verify request failed:", err);
        }
      } else {
        console.log("[face-login] Identifier provided but employee not found in active database:", cleanIdentifier);
      }
    }

    // 2. Secondary: Fallback to 1:N Recognition Search (only if 1:1 mode didn't run or fail)
    if (!matchedEmployee) {
      console.log("[face-login] Trying Raray 1:N recognition fallback...");
      try {
        const rarayResult = await rarayRecognizeFace({
          imageBuffer,
          mimeType,
        });

        console.log("[face-login] Raray 1:N result:", JSON.stringify(rarayResult));

        if (rarayResult.status === "success" && rarayResult.recognized && rarayResult.employee_id) {
          const empId = Number(rarayResult.employee_id);
          if (Number.isFinite(empId) && empId > 0) {
            const [foundEmp] = await db
              .select()
              .from(employees)
              .where(and(eq(employees.id, empId), eq(employees.isActive, true)))
              .limit(1);

            if (foundEmp) {
              matchedEmployee = foundEmp;
              confidenceScore = rarayResult.confidence || 0.85;
              console.log("[face-login] 1:N recognition matched active employee:", foundEmp.name);
            }
          }
        }
      } catch (err) {
        console.error("[face-login] Raray 1:N recognition failed:", err);
      }
    }

    // 3. Fallback: Local Server Face-API Embedding comparison
    if (!matchedEmployee) {
      console.log("[face-login] Raray Vision could not match face. Trying local face-api comparison...");
      try {
        const extraction = await extractServerFaceEmbedding(imageBuffer);
        if (extraction && extraction.embedding) {
          console.log("[face-login] Local face-api embedding extracted successfully. Score:", extraction.detectionScore);
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

          if (bestMatch && highestSimilarity >= 0.55) {
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

    // 5. Check if user has login account
    let targetAuthUserId = matchedEmployee.authUserId;

    if (!targetAuthUserId && matchedEmployee.email) {
      const [foundUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, matchedEmployee.email.toLowerCase().trim()))
        .limit(1);

      if (foundUser) {
        targetAuthUserId = foundUser.id;
        await db
          .update(employees)
          .set({ authUserId: foundUser.id })
          .where(eq(employees.id, matchedEmployee.id));
      }
    }

    if (!targetAuthUserId) {
      return NextResponse.json(
        {
          success: false,
          error: `Wajah dikenali sebagai ${matchedEmployee.name}, tetapi akun login belum dibuat. Silakan hubungi Administrator.`,
        },
        { status: 404 }
      );
    }

    if (!matchedEmployee.email) {
      return NextResponse.json(
        {
          success: false,
          error: `Wajah dikenali sebagai ${matchedEmployee.name}, tetapi email tidak terdaftar di data karyawan.`,
        },
        { status: 400 }
      );
    }

    // NATIVE AUTHENTICATION WAY: Generate a temporary magic link login token
    const magicToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    await db.insert(verification).values({
      id: crypto.randomBytes(16).toString("hex"),
      identifier: magicToken,
      value: JSON.stringify({ email: matchedEmployee.email.toLowerCase().trim(), name: matchedEmployee.name }),
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
        email: matchedEmployee.email,
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
