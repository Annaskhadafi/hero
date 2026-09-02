import { db } from './db/index';

async function seed() {
  console.log('Seeding activity route...');
  
  // 1. Ensure library activities exist for the examples
  const libsToEnsure = [
    { code: 'MNT-001', name: 'mounting' },
    { code: 'DSM-001', name: 'dismounting' },
    { code: 'SUP-001', name: 'support operator' },
    { code: 'SUP-002', name: 'support lainnya' }
  ];

  const libMap = new Map<string, number>();
  
  for (const lib of libsToEnsure) {
    const res = await db.execute(`SELECT id FROM hero_activity_libraries WHERE activity_code = '${lib.code}'`);
    if (res.rowCount > 0) {
      libMap.set(lib.name, res.rows[0].id as number);
    } else {
      const ins = await db.execute(
        `INSERT INTO hero_activity_libraries (activity_code, activity_name) VALUES ('${lib.code}', '${lib.name}') RETURNING id`
      );
      libMap.set(lib.name, ins.rows[0].id as number);
    }
  }

  // Check if route template already exists
  const existingTemplate = await db.execute(`SELECT id FROM hero_activity_route_templates WHERE route_code = 'RTE-TYRE-OPS'`);
  if (existingTemplate.rowCount > 0) {
      console.log('Template RTE-TYRE-OPS already exists, deleting it to recreate...');
      await db.execute(`DELETE FROM hero_activity_route_templates WHERE route_code = 'RTE-TYRE-OPS'`);
  }

  // 2. Create Route Template for Central Services / Service Operation Others
  const templateRes = await db.execute(`
    INSERT INTO hero_activity_route_templates 
    (department_id, section_id, route_code, route_name, description) 
    VALUES (2, 34, 'RTE-TYRE-OPS', 'SOP Tyre Operations & Support', 'Generated from user request for Rotasi Tyre, Replace Tyre, Support Customer') 
    RETURNING id
  `);
  
  const templateId = templateRes.rows[0].id as number;
  console.log('Created Template:', templateId);

  // 3. Create Groups
  const groups = [
    { key: 'rotasi_tyre', name: 'Rotasi Tyre', items: ['mounting', 'dismounting'] },
    { key: 'replace_tyre', name: 'Replace Tyre', items: ['mounting', 'dismounting'] },
    { key: 'support_customer', name: 'Support Customer', items: ['support operator', 'support lainnya'] }
  ];

  let order = 1;
  for (const g of groups) {
    const groupRes = await db.execute(`
      INSERT INTO hero_activity_route_groups
      (route_template_id, group_key, group_name, sort_order)
      VALUES (${templateId}, '${g.key}', '${g.name}', ${order++})
      RETURNING id, group_name
    `);
    
    const groupId = groupRes.rows[0].id as number;
    console.log('  Created Group:', groupRes.rows[0].group_name);

    let itemOrder = 1;
    for (const itemName of g.items) {
      const libId = libMap.get(itemName)!;
      await db.execute(`
        INSERT INTO hero_activity_route_items
        (route_group_id, library_activity_id, item_label, sort_order)
        VALUES (${groupId}, ${libId}, '${itemName}', ${itemOrder++})
      `);
      console.log('    Created Item:', itemName);
    }
  }

  console.log('Done!');
  process.exit(0);
}

seed().catch(console.error);
