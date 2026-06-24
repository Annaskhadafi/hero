import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import crypto from "crypto";

import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { getServerSession } from "@/lib/auth-session";

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(payload: any, secret: string): string {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signatureInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signatureInput}.${signature}`;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const redirectParam = searchParams.get("redirect") || "";

    const email = session.user.email;
    const name = session.user.name || "User";

    // Query employee_sn from employees table
    const [employee] = await db
      .select({
        employeeSn: employees.employeeSn,
        name: employees.name,
      })
      .from(employees)
      .where(eq(employees.email, email))
      .limit(1);

    const sn = employee?.employeeSn || email; // Fallback to email if SN is empty
    const displayName = employee?.name || name;

    const secret = process.env.LMS_JWT_SECRET;
    const lmsUrl = process.env.LMS_SITE_URL || "https://chitralearning.com";

    if (!secret) {
      console.error("[LMS SSO] LMS_JWT_SECRET is not configured in .env");
      return NextResponse.json({ error: "SSO secret not configured" }, { status: 500 });
    }

    // Payload expires in 60 seconds
    const payload = {
      iss: "hero-sso",
      email,
      sn,
      name: displayName,
      exp: Math.floor(Date.now() / 1000) + 60,
      ...(redirectParam && { redirect: redirectParam }),
    };

    const token = signJwt(payload, secret);
    let redirectUrl = `${lmsUrl}/wp-json/hero-sso/v1/login?token=${token}`;

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[LMS SSO] Error generating SSO redirect:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
