import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { employees as heroEmployees } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    const authRes = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      asResponse: true,
    });

    if (!authRes.ok) {
      const errorData = await authRes.json().catch(() => null);
      return NextResponse.json(
        {
          success: false,
          error: errorData?.message || "Email atau password salah.",
        },
        { status: 401 }
      );
    }

    const setCookieHeader = authRes.headers.get("set-cookie") || "";

    // Fetch employee data
    const employee = await db.query.heroEmployees.findFirst({
      where: eq(heroEmployees.email, email.toLowerCase().trim()),
      columns: {
        id: true,
        employeeSn: true,
        name: true,
        email: true,
        jobTitle: true,
      },
    });

    const response = NextResponse.json({
      success: true,
      cookie: setCookieHeader,
      user: {
        email,
        name: employee?.name || email.split("@")[0],
        employeeId: employee?.id || null,
        employeeSn: employee?.employeeSn || null,
        jobTitle: employee?.jobTitle || null,
      },
    });

    if (setCookieHeader) {
      response.headers.set("Set-Cookie", setCookieHeader);
    }

    return response;
  } catch (error) {
    console.error("[mobile-signin] Error:", error);
    return NextResponse.json(
      { success: false, error: "Terjadi kesalahan pada server auth." },
      { status: 500 }
    );
  }
}
