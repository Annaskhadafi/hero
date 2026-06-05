const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://onecentral:Wusthochq2018-@31.97.187.38:5433/Onecentral',
});

async function run() {
  try {
    // We do not have a unique constraint on (section, title) necessarily, but let's try.
    // If it inserts duplicates, the user might see two menus, so let's delete first just in case
    await pool.query("DELETE FROM hero_navbar_menu_items WHERE url = '/dashboard/hc/recruitment/tests';");

    await pool.query(`
      INSERT INTO hero_navbar_menu_items (menu_area, section, title, url, icon_name, resource, sort_order, is_visible, open_in_new_tab) 
      VALUES ('main', 'Recruitment Management', 'Online Tests', '/dashboard/hc/recruitment/tests', 'file-text', 'hc_recruitment_tests', 2, true, false);
    `);
    console.log('Added Online Tests to DB');
  } catch (e) {
    console.log(e.message);
  }
  process.exit(0);
}

run();
