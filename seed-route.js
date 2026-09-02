const { Pool } = require('pg');

async function seed() {
  console.log('Seeding activity route...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hero?schema=public'
  });

  try {
    const libsToEnsure = [
      { code: 'MNT-001', name: 'mounting' },
      { code: 'DSM-001', name: 'dismounting' },
      { code: 'SUP-001', name: 'support operator' },
      { code: 'SUP-002', name: 'support lainnya' }
    ];

    const libMap = new Map();
    
    for (const lib of libsToEnsure) {
      const res = await pool.query('SELECT id FROM hero_activity_libraries WHERE activity_code = $1', [lib.code]);
      if (res.rows && res.rows.length > 0) {
        libMap.set(lib.name, res.rows[0].id);
      } else {
        const ins = await pool.query(
          'INSERT INTO hero_activity_libraries (activity_code, activity_name) VALUES ($1, $2) ON CONFLICT (activity_code) DO UPDATE SET activity_name = EXCLUDED.activity_name RETURNING id',
          [lib.code, lib.name]
        );
        libMap.set(lib.name, ins.rows[0].id);
      }
    }

    // Check if route template already exists and clean them up
    await pool.query('DELETE FROM hero_activity_route_templates WHERE route_code IN ($1, $2, $3, $4)', ['RTE-TYRE-OPS', 'RTE-ROTASI-TYRE', 'RTE-REPLACE-TYRE', 'RTE-SUPPORT-CUST']);

    const routesToCreate = [
      {
        code: 'RTE-ROTASI-TYRE',
        name: 'Rotasi Tyre',
        desc: 'Generated route for Rotasi Tyre',
        groups: [
          { key: 'mounting', name: 'Mounting', items: ['mounting'] },
          { key: 'dismounting', name: 'Dismounting', items: ['dismounting'] }
        ]
      },
      {
        code: 'RTE-REPLACE-TYRE',
        name: 'Replace Tyre',
        desc: 'Generated route for Replace Tyre',
        groups: [
          { key: 'mounting', name: 'Mounting', items: ['mounting'] },
          { key: 'dismounting', name: 'Dismounting', items: ['dismounting'] }
        ]
      },
      {
        code: 'RTE-SUPPORT-CUST',
        name: 'Support Customer',
        desc: 'Generated route for Support Customer',
        groups: [
          { key: 'support_operator', name: 'Support Operator', items: ['support operator'] },
          { key: 'support_lainnya', name: 'Support Lainnya', items: ['support lainnya'] }
        ]
      }
    ];

    for (const r of routesToCreate) {
      const templateRes = await pool.query(`
        INSERT INTO hero_activity_route_templates 
        (department_id, section_id, route_code, route_name, description) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING id
      `, [2, 34, r.code, r.name, r.desc]);
      
      const templateId = templateRes.rows[0].id;
      console.log('Created Template:', r.name);

      let order = 1;
      for (const g of r.groups) {
        const groupRes = await pool.query(`
          INSERT INTO hero_activity_route_groups
          (route_template_id, group_key, group_name, sort_order)
          VALUES ($1, $2, $3, $4)
          RETURNING id, group_name
        `, [templateId, g.key, g.name, order++]);
        
        const groupId = groupRes.rows[0].id;
        console.log('  Created Group:', groupRes.rows[0].group_name);

        let itemOrder = 1;
        for (const itemName of g.items) {
          const libId = libMap.get(itemName);
          if (!libId) {
            throw new Error('Missing library ID for ' + itemName);
          }
          await pool.query(`
            INSERT INTO hero_activity_route_items
            (route_group_id, library_activity_id, item_label, sort_order)
            VALUES ($1, $2, $3, $4)
          `, [groupId, libId, itemName, itemOrder++]);
          console.log('    Created Item:', itemName);
        }
      }
    }

    console.log('Done!');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

seed();
