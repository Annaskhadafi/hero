import { randomUUID } from "crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { account, user } from "@/db/schema/auth";
import { employees } from "@/db/schema/hero";

const EXCLUDED_EMAIL = "mochamad.khadafi@chitraparatama.co.id";
const BATCH_SIZE = 1;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function defaultPassword(employeeSn: string) {
  return `Chitra#${employeeSn.trim()}`;
}

async function upsertCredentialAccount(params: {
  authUserId: string;
  email: string;
  password: string;
  now: Date;
}) {
  const normalizedEmail = normalizeEmail(params.email);
  const passwordHash = await hashPassword(params.password);

  const [existingCredential] = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.providerId, "credential"),
        or(
          eq(account.userId, params.authUserId),
          eq(account.accountId, normalizedEmail),
          eq(account.accountId, params.authUserId),
        ),
      ),
    )
    .limit(1);

  const credentialValues = {
    accountId: normalizedEmail,
    providerId: "credential" as const,
    userId: params.authUserId,
    password: passwordHash,
    updatedAt: params.now,
  };

  if (existingCredential) {
    await db.update(account).set(credentialValues).where(eq(account.id, existingCredential.id));
    return;
  }

  await db.insert(account).values({
    id: randomUUID(),
    ...credentialValues,
    createdAt: params.now,
  });
}

async function syncUserManagementPasswords() {
  console.log("Loading user management accounts...");

  const rows = await db
    .select({
      id: employees.id,
      authUserId: employees.authUserId,
      name: employees.name,
      email: employees.email,
      employeeSn: employees.employeeSn,
    })
    .from(employees);

  console.log(`Found ${rows.length} user management accounts.`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  async function syncEmployee(employee: (typeof rows)[number]) {
    const email = normalizeEmail(employee.email);

    if (!email || email === EXCLUDED_EMAIL) {
      skipped++;
      return;
    }

    const employeeSn = employee.employeeSn.trim();
    if (!employeeSn) {
      failed++;
      console.error(`FAILED ${employee.email}: missing SN`);
      return;
    }

    const now = new Date();
    let authUserId = employee.authUserId;

    if (authUserId) {
      await db
        .update(user)
        .set({ name: employee.name, email, updatedAt: now })
        .where(eq(user.id, authUserId));
    } else {
      const [existingUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);

      if (existingUser) {
        authUserId = existingUser.id;
        await db.update(user).set({ name: employee.name, updatedAt: now }).where(eq(user.id, authUserId));
      } else {
        authUserId = randomUUID();
        await db.insert(user).values({
          id: authUserId,
          name: employee.name,
          email,
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        });
      }

      await db.update(employees).set({ authUserId }).where(eq(employees.id, employee.id));
    }

    await upsertCredentialAccount({
      authUserId,
      email,
      password: defaultPassword(employeeSn),
      now,
    });

    updated++;
    console.log(`OK ${email} -> Chitra#${employeeSn}`);
  }

  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    await Promise.all(
      rows.slice(index, index + BATCH_SIZE).map(async (employee) => {
        try {
          await syncEmployee(employee);
        } catch (error) {
          failed++;
          console.error(`FAILED ${employee.email}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }),
    );
  }

  console.log(JSON.stringify({ updated, skipped, failed, excluded: EXCLUDED_EMAIL }, null, 2));

  if (failed > 0) process.exit(1);

  process.exit(0);
}

syncUserManagementPasswords().catch((error) => {
  console.error(error);
  process.exit(1);
});
