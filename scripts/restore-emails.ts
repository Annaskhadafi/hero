import { config } from 'dotenv';
import { Pool } from 'pg';
import * as XLSX from 'xlsx';

config({ path: '.env.local' });

async function main() {
  const url = process.env.DATABASE_URL || '';
  const pool = new Pool({ connectionString: url });

  try {
    console.log('--- Scanning DB and Excel for Email Restoration ---');
    const empRes = await pool.query('SELECT id, employee_sn, name, email, auth_user_id FROM hero_employees');
    console.log('Total employees in DB:', empRes.rows.length);

    const userRes = await pool.query('SELECT id, name, email FROM "user"');
    console.log('Total auth users in DB:', userRes.rows.length);

    const wb = XLSX.readFile('NEW DATA EMAIL KARYAWAN.xlsx');
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const excelRows = XLSX.utils.sheet_to_json<any>(sheet);
    console.log('Total rows in NEW DATA EMAIL KARYAWAN.xlsx:', excelRows.length);

    const empBySn = new Map<string, any>();
    empRes.rows.forEach(r => {
      if (r.employee_sn) empBySn.set(String(r.employee_sn).trim().toLowerCase(), r);
    });

    let matched = 0;
    let willUpdate = 0;
    let notInDb = 0;
    const updateList: Array<{
      empId: number;
      authUserId: string | null;
      sn: string;
      name: string;
      oldEmail: string;
      newEmail: string;
    }> = [];

    excelRows.forEach(row => {
      const sn = String(row.SN || row.sn || '').trim().toLowerCase();
      const excelEmail = String(row.Email || row.email || '').trim();
      if (!sn || !excelEmail) return;

      const emp = empBySn.get(sn);
      if (emp) {
        matched++;
        if (emp.email.trim().toLowerCase() !== excelEmail.toLowerCase()) {
          willUpdate++;
          updateList.push({
            empId: emp.id,
            authUserId: emp.auth_user_id,
            sn: emp.employee_sn,
            name: emp.name,
            oldEmail: emp.email,
            newEmail: excelEmail,
          });
        }
      } else {
        notInDb++;
      }
    });

    console.log('\n--- Analysis Result ---');
    console.log('Total matched employees by SN:', matched);
    console.log('Employees needing email restoration:', willUpdate);
    console.log('SN in Excel not found in DB:', notInDb);
    console.log('\nSample 10 updates to perform:');
    console.log(JSON.stringify(updateList.slice(0, 10), null, 2));

    const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--apply');
    if (isDryRun) {
      console.log('\n[DRY RUN] No changes were made to the database.');
      console.log('To apply changes, run: npx tsx scripts/restore-emails.ts --apply');
      return;
    }

    console.log('\n[APPLYING RESTORATION] Updating emails in database...');

    let updatedEmp = 0;
    let updatedAuth = 0;
    let errorCount = 0;

    for (let i = 0; i < updateList.length; i++) {
      const item = updateList[i];
      try {
        await pool.query('UPDATE hero_employees SET email = $1 WHERE id = $2', [item.newEmail, item.empId]);
        updatedEmp++;

        if (item.authUserId) {
          const existingUser = await pool.query('SELECT id FROM "user" WHERE LOWER(email) = LOWER($1)', [item.newEmail]);
          if (existingUser.rows.length > 0) {
            const existingUserId = existingUser.rows[0].id;
            if (existingUserId !== item.authUserId) {
              await pool.query('UPDATE hero_employees SET auth_user_id = $1 WHERE id = $2', [existingUserId, item.empId]);
            }
          } else {
            await pool.query('UPDATE "user" SET email = $1 WHERE id = $2', [item.newEmail, item.authUserId]);
            updatedAuth++;
          }
        }
      } catch (rowErr: any) {
        errorCount++;
        console.error(`Error updating row ${i + 1} (${item.sn} - ${item.name}):`, rowErr?.message || rowErr);
      }

      if ((i + 1) % 50 === 0 || i === updateList.length - 1) {
        console.log(`Progress: ${i + 1}/${updateList.length} processed (Success: ${updatedEmp}, Errors: ${errorCount})...`);
      }
    }

    console.log(`\nSUCCESS: Restored ${updatedEmp} employee emails and ${updatedAuth} auth user emails! Errors: ${errorCount}`);

  } catch (err) {
    console.error('Error during email restoration:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main().catch(console.error);