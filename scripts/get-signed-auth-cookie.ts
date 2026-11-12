import { createHmac } from "crypto";
import { db } from "../db";
import { user, session } from "../db/schema/auth";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

async function main() {
  const secret =
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "";

  const [u] = await db
    .select()
    .from(user)
    .where(eq(user.email, "mochamad.khadafi@chitraparatama.co.id"))
    .limit(1);

  if (!u) {
    console.error("User not found!");
    process.exit(1);
  }

  const token = `e2e_playwright_${nanoid(24)}`;
  const now = new Date();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(session).values({
    id: `sess_${nanoid(16)}`,
    token,
    userId: u.id,
    createdAt: now,
    updatedAt: now,
    expiresAt,
    userAgent: "Playwright E2E Runner",
  });

  const signature = createHmac("sha256", secret).update(token).digest("base64url");
  const cookieValue = `${token}.${signature}`;

  console.log(JSON.stringify({ cookieValue, token }));
  process.exit(0);
}

main().catch(console.error);
