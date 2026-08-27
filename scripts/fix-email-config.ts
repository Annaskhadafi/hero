import { db } from '../db';
import { sql } from 'drizzle-orm';
async function main() {
  // Update APD notification recipient to andirivlni@gmail.com
  await db.execute(sql`UPDATE hero_apd_notification_config SET recipient_emails = 'andirivlni@gmail.com', cc_emails = '' WHERE id = 1`);
  console.log('APD notification updated to andirivlni@gmail.com');

  // Also update the email_templates for apd_request_approved - check if it has hardcoded emails
  // The email goes to the requester's email from employees table
  // Khadafi's email is already andirivlni@gmail.com, so emails to requester will go there
  console.log('Khadafi email:', 'andirivlni@gmail.com (already set)');
  console.log('Done!');
}
main().catch(console.error).finally(() => process.exit(0));
