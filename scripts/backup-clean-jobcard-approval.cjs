const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function backupAndClean() {
  console.log('=== STARTING JOBCARD APPROVAL DATA BACKUP & CLEANUP ===');

  // 1. Fetch & Backup jobcard approval rows
  const apprs = await pool.query("SELECT * FROM hero_approvals WHERE activity_type = 'jobcard_qc' OR resolution_source = 'jobcard_qc_mobile' OR tire_jobcard_id IS NOT NULL");
  const matrices = await pool.query("SELECT * FROM hero_approval_matrices WHERE transaction_type = 'jobcard_qc'");
  const matrixSteps = await pool.query("SELECT * FROM hero_approval_matrix_steps WHERE matrix_id IN (SELECT id FROM hero_approval_matrices WHERE transaction_type = 'jobcard_qc')");
  const notifEvents = await pool.query("SELECT * FROM hero_notification_events WHERE event_type IN ('jobcard_approval_request', 'jobcard_approved', 'jobcard_rejected')");

  const backupData = {
    timestamp: new Date().toISOString(),
    approvals: apprs.rows,
    matrices: matrices.rows,
    matrixSteps: matrixSteps.rows,
    notificationEvents: notifEvents.rows,
  };

  const backupPath = path.join(__dirname, '..', 'backup-jobcard-approval-data.json');
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(`Backup saved to ${backupPath} (${apprs.rows.length} approvals, ${matrices.rows.length} matrices).`);

  // 2. Safely delete Jobcard approval records from hero_approvals, hero_approval_matrix_steps, hero_approval_matrices
  if (apprs.rows.length > 0) {
    await pool.query("DELETE FROM hero_approvals WHERE activity_type = 'jobcard_qc' OR resolution_source = 'jobcard_qc_mobile' OR tire_jobcard_id IS NOT NULL");
    console.log('Deleted Jobcard approval records from hero_approvals.');
  }

  if (matrixSteps.rows.length > 0) {
    await pool.query("DELETE FROM hero_approval_matrix_steps WHERE matrix_id IN (SELECT id FROM hero_approval_matrices WHERE transaction_type = 'jobcard_qc')");
    console.log('Deleted Jobcard matrix steps.');
  }

  if (matrices.rows.length > 0) {
    await pool.query("DELETE FROM hero_approval_matrices WHERE transaction_type = 'jobcard_qc'");
    console.log('Deleted Jobcard matrices from hero_approval_matrices.');
  }

  if (notifEvents.rows.length > 0) {
    await pool.query("DELETE FROM hero_notification_events WHERE event_type IN ('jobcard_approval_request', 'jobcard_approved', 'jobcard_rejected')");
    console.log('Deleted Jobcard notification events.');
  }

  // 3. Ensure existing jobcards have logical status 'Completed'
  const updateRes = await pool.query("UPDATE hero_tire_repair_jobcards SET status = 'Completed' WHERE status IN ('In Progress', 'Waiting Approval', 'Pending Approval', 'Pending') OR status IS NULL");
  console.log(`Updated ${updateRes.rowCount} existing Jobcard status records to 'Completed'.`);

  await pool.end();
  console.log('=== BACKUP & CLEANUP COMPLETED SUCCESSFULLY ===');
}

backupAndClean().catch((err) => {
  console.error('Error during backup & clean:', err);
  process.exit(1);
});
