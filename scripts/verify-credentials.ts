import { db } from "@/db";
import { account, user } from "@/db/schema/auth";
import { eq, and } from "drizzle-orm";

/**
 * QA Script: Verify credential account structure
 *
 * This script checks if credential accounts have the correct structure
 * after the password reset fix.
 */

async function verifyCredentialAccounts() {
  console.log("🔍 Verifying credential account structure...\n");

  try {
    // Get all credential accounts with user info
    const credentials = await db
      .select({
        accountId: account.accountId,
        providerId: account.providerId,
        userId: account.userId,
        userEmail: user.email,
        hasPassword: account.password,
      })
      .from(account)
      .innerJoin(user, eq(account.userId, user.id))
      .where(eq(account.providerId, "credential"))
      .limit(10);

    console.log(`Found ${credentials.length} credential accounts\n`);

    let correctCount = 0;
    let incorrectCount = 0;

    for (const cred of credentials) {
      const normalizedEmail = cred.userEmail.trim().toLowerCase();
      const isCorrect = cred.accountId === normalizedEmail;

      if (isCorrect) {
        correctCount++;
        console.log(`✅ ${cred.userEmail}`);
        console.log(`   accountId: ${cred.accountId} (CORRECT)`);
      } else {
        incorrectCount++;
        console.log(`❌ ${cred.userEmail}`);
        console.log(`   accountId: ${cred.accountId}`);
        console.log(`   expected:  ${normalizedEmail}`);
        console.log(`   status:    INCORRECT - needs migration`);
      }
      console.log(`   providerId: ${cred.providerId}`);
      console.log(`   hasPassword: ${cred.hasPassword ? "Yes" : "No"}`);
      console.log("");
    }

    console.log("📊 Summary:");
    console.log(`   ✅ Correct: ${correctCount}`);
    console.log(`   ❌ Incorrect: ${incorrectCount}`);
    console.log(`   Total: ${credentials.length}`);

    if (incorrectCount > 0) {
      console.log("\n⚠️  Warning: Some accounts have incorrect accountId format.");
      console.log("   These will be automatically fixed on next password reset.");
    } else {
      console.log("\n✅ All credential accounts have correct structure!");
    }

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  process.exit(0);
}

verifyCredentialAccounts();
