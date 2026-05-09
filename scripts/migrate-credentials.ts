import { db } from "@/db";
import { account, user } from "@/db/schema/auth";
import { eq } from "drizzle-orm";

/**
 * Migration Script: Fix existing credential account accountId values
 *
 * This script migrates existing credential accounts from UUID-based accountId
 * to normalized email-based accountId for Better Auth compatibility.
 */

async function migrateCredentialAccounts() {
  console.log("🔄 Starting credential account migration...\n");

  try {
    // Get all credential accounts with user info
    const credentials = await db
      .select({
        id: account.id,
        accountId: account.accountId,
        providerId: account.providerId,
        userId: account.userId,
        userEmail: user.email,
      })
      .from(account)
      .innerJoin(user, eq(account.userId, user.id))
      .where(eq(account.providerId, "credential"));

    console.log(`Found ${credentials.length} credential accounts to check\n`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const cred of credentials) {
      const normalizedEmail = cred.userEmail.trim().toLowerCase();
      const needsMigration = cred.accountId !== normalizedEmail;

      if (needsMigration) {
        console.log(`🔄 Migrating: ${cred.userEmail}`);
        console.log(`   Old accountId: ${cred.accountId}`);
        console.log(`   New accountId: ${normalizedEmail}`);

        await db
          .update(account)
          .set({
            accountId: normalizedEmail,
            updatedAt: new Date(),
          })
          .where(eq(account.id, cred.id));

        migratedCount++;
        console.log(`   ✅ Migrated\n`);
      } else {
        console.log(`✅ ${cred.userEmail} - Already correct\n`);
        skippedCount++;
      }
    }

    console.log("📊 Migration Summary:");
    console.log(`   🔄 Migrated: ${migratedCount}`);
    console.log(`   ✅ Skipped (already correct): ${skippedCount}`);
    console.log(`   Total: ${credentials.length}`);

    if (migratedCount > 0) {
      console.log("\n✅ Migration completed successfully!");
      console.log("   Users can now login with their email and password.");
    } else {
      console.log("\n✅ No migration needed - all accounts already correct!");
    }

  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

migrateCredentialAccounts();
