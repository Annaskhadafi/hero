import "dotenv/config";

import { readFile } from "node:fs/promises";
import * as path from "node:path";

import { sql } from "drizzle-orm";

import { db } from "../db";

type CsvRow = Record<string, string>;

type MasterSeedRow = {
  sourceCode: string;
  name: string;
  shortCode: string;
};

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "tools", "data_hero_normalized");

function parseCsv(content: string): CsvRow[] {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const parseLine = (line: string) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current);
    return values;
  };

  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

async function loadCsv(fileName: string) {
  const content = await readFile(path.join(DATA_DIR, fileName), "utf8");
  return parseCsv(content);
}

function nullable(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function sanitizeCodeSeed(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "")
    .toUpperCase();
}

function buildShortCodeRecords(
  rows: Array<{ code: string; name: string }>,
  reservedCodes: Iterable<string> = [],
): MasterSeedRow[] {
  const usedCodes = new Set(Array.from(reservedCodes, (code) => code.toUpperCase()));

  return rows.map((row, index) => {
    const nameSeed = sanitizeCodeSeed(row.name);
    const codeSeed = sanitizeCodeSeed(row.code);
    const base = (nameSeed || codeSeed || `X${index + 1}`).slice(0, 3).padEnd(3, "X");
    let candidate = base;
    let suffix = 1;

    while (usedCodes.has(candidate)) {
      const suffixText = `${suffix}`;
      candidate = `${base.slice(0, Math.max(0, 3 - suffixText.length))}${suffixText}`.slice(0, 3);
      suffix += 1;
    }

    usedCodes.add(candidate);

    return {
      sourceCode: row.code,
      name: row.name,
      shortCode: candidate,
    };
  });
}

async function main() {
  const [existingDepartmentCodes, existingSectionCodes, existingPositionCodes] = await Promise.all([
    db.execute(sql`select code from hero_master_departments`),
    db.execute(sql`select code from hero_master_sections`),
    db.execute(sql`select code from hero_master_positions`),
  ]);

  const departments = await loadCsv("master_departments.csv");
  const sections = await loadCsv("master_sections.csv");
  const sites = await loadCsv("master_sites.csv");
  const workLocations = await loadCsv("master_work_locations.csv");
  const jobLevels = await loadCsv("master_job_levels.csv");
  const genders = await loadCsv("master_genders.csv");
  const ageBands = await loadCsv("master_age_bands.csv");
  const serviceBands = await loadCsv("master_service_bands.csv");
  const educations = await loadCsv("master_educations.csv");
  const employeeStatuses = await loadCsv("master_employee_statuses.csv");
  const positions = await loadCsv("master_positions.csv");
  const orgNodes = await loadCsv("organization_nodes.csv");
  const users = await loadCsv("user_management.csv");
  const masterDepartmentSeeds = buildShortCodeRecords(
    departments.map((row) => ({ code: row.department_id, name: row.department_name })),
    existingDepartmentCodes.rows.map((row) => String(row.code ?? "")),
  );
  const masterSectionSeeds = buildShortCodeRecords(
    sections.map((row) => ({ code: row.section_id, name: row.section_name })),
    existingSectionCodes.rows.map((row) => String(row.code ?? "")),
  );
  const masterPositionSeeds = buildShortCodeRecords(
    positions.map((row) => ({ code: row.position_id, name: row.rank_name })),
    existingPositionCodes.rows.map((row) => String(row.code ?? "")),
  );

  await db.transaction(async (tx) => {
    await tx.execute(sql`truncate table hero_hr_employees restart identity cascade`);
    await tx.execute(sql`truncate table hero_hr_org_nodes restart identity cascade`);
    await tx.execute(sql`truncate table hero_hr_positions restart identity cascade`);
    await tx.execute(sql`truncate table hero_hr_sections restart identity cascade`);
    await tx.execute(sql`truncate table hero_hr_departments restart identity cascade`);
    await tx.execute(sql`truncate table hero_hr_sites restart identity cascade`);
    await tx.execute(sql`truncate table hero_hr_work_locations restart identity cascade`);
    await tx.execute(sql`truncate table hero_hr_job_levels cascade`);
    await tx.execute(sql`truncate table hero_hr_genders cascade`);
    await tx.execute(sql`truncate table hero_hr_age_bands cascade`);
    await tx.execute(sql`truncate table hero_hr_service_bands cascade`);
    await tx.execute(sql`truncate table hero_hr_educations cascade`);
    await tx.execute(sql`truncate table hero_hr_employee_statuses cascade`);
    await tx.execute(sql`truncate table hero_hr_location_categories cascade`);

    for (const row of jobLevels) {
      await tx.execute(sql`
        insert into hero_hr_job_levels (code, name) values (${row.job_level_code}, ${row.job_level_name})
      `);
    }

    for (const row of genders) {
      await tx.execute(sql`
        insert into hero_hr_genders (code, name) values (${row.gender_code}, ${row.gender_name})
      `);
    }

    for (const row of ageBands) {
      await tx.execute(sql`
        insert into hero_hr_age_bands (code, name) values (${row.age_band_code}, ${row.age_band_name})
      `);
    }

    for (const row of serviceBands) {
      await tx.execute(sql`
        insert into hero_hr_service_bands (code, name) values (${row.service_band_code}, ${row.service_band_name})
      `);
    }

    for (const row of educations) {
      await tx.execute(sql`
        insert into hero_hr_educations (code, name) values (${row.education_code}, ${row.education_name})
      `);
    }

    for (const row of employeeStatuses) {
      await tx.execute(sql`
        insert into hero_hr_employee_statuses (code, name) values (${row.employee_status_code}, ${row.employee_status_name})
      `);
    }

    await tx.execute(sql`
      insert into hero_hr_location_categories (code, name)
      values ('1', 'Head Office'), ('2', 'Site Office')
      on conflict (code) do nothing
    `);

    for (const row of departments) {
      await tx.execute(sql`
        insert into hero_hr_departments (code, name) values (${row.department_id}, ${row.department_name})
      `);
    }

    for (const row of sections) {
      await tx.execute(sql`
        insert into hero_hr_sections (code, department_id, name)
        values (
          ${row.section_id},
          (select id from hero_hr_departments where code = ${row.department_id}),
          ${row.section_name}
        )
      `);
    }

    for (const row of sites) {
      await tx.execute(sql`
        insert into hero_hr_sites (code, name) values (${row.site_id}, ${row.site_name})
      `);
    }

    for (const row of workLocations) {
      await tx.execute(sql`
        insert into hero_hr_work_locations (code, name) values (${row.work_location_id}, ${row.work_location_name})
      `);
    }

    for (const row of positions) {
      await tx.execute(sql`
        insert into hero_hr_positions (code, level_name, rank_name, job_level_code, employee_status_code, is_managerial)
        values (
          ${row.position_id},
          ${row.level_name},
          ${row.rank_name},
          ${nullable(row.job_level_name) ? sql`(select code from hero_hr_job_levels where name = ${row.job_level_name})` : sql`null`},
          ${nullable(row.employee_status_name) ? sql`(select code from hero_hr_employee_statuses where name = ${row.employee_status_name})` : sql`null`},
          ${row.job_level_name === "Managerial"}
        )
      `);
    }

    for (const row of orgNodes) {
      const parts = row.path.split(" > ").map((part) => part.trim());
      const departmentName = parts[1] ?? null;
      const sectionName = parts[2] ?? null;
      const siteName = parts[3] ?? null;
      const hierarchyLevel = Math.max(0, parts.length - 2);
      await tx.execute(sql`
        insert into hero_hr_org_nodes (code, parent_node_id, node_type, name, department_id, section_id, site_id, work_location_id, hierarchy_level, path_text)
        values (
          ${row.org_node_id},
          ${nullable(row.parent_org_node_id) ? sql`(select id from hero_hr_org_nodes where code = ${row.parent_org_node_id})` : sql`null`},
          ${row.node_type},
          ${row.node_name},
          ${departmentName ? sql`(select id from hero_hr_departments where name = ${departmentName})` : sql`null`},
          ${departmentName && sectionName ? sql`
            (select s.id
             from hero_hr_sections s
             join hero_hr_departments d on d.id = s.department_id
             where s.name = ${sectionName} and d.name = ${departmentName})
          ` : sql`null`},
          ${siteName ? sql`(select id from hero_hr_sites where name = ${siteName})` : sql`null`},
          ${row.node_type === "work_location" ? sql`(select id from hero_hr_work_locations where code = ${row.ref_id})` : sql`null`},
          ${hierarchyLevel},
          ${row.path}
        )
      `);
    }

    for (const row of users) {
      await tx.execute(sql`
        insert into hero_hr_employees (
          employee_id,
          full_name,
          email,
          email_password_migration,
          department_id,
          section_id,
          site_id,
          work_location_id,
          position_id,
          org_node_id,
          join_date,
          birth_date,
          gender_code,
          age_band_code,
          service_band_code,
          education_code,
          demographic_employee_status_code,
          location_category_code,
          account_status
        ) values (
          ${row.employee_id},
          ${row.full_name},
          ${nullable(row.email)},
          ${nullable(row.password_email)},
          (select id from hero_hr_departments where code = ${nullable(row.department_id)}),
          (select id from hero_hr_sections where code = ${nullable(row.section_id)}),
          (select id from hero_hr_sites where code = ${nullable(row.site_id)}),
          (select id from hero_hr_work_locations where code = ${nullable(row.work_location_id)}),
          (select id from hero_hr_positions where code = ${nullable(row.position_id)}),
          (select id from hero_hr_org_nodes where code = ${nullable(row.org_node_id)}),
          ${nullable(row.join_date)},
          ${nullable(row.birth_date)},
          ${nullable(row.gender_code)},
          ${nullable(row.age_band_code)},
          ${nullable(row.service_band_code)},
          ${nullable(row.education_code)},
          ${nullable(row.demographic_employee_status_code)},
          ${nullable(row.location_category_code)},
          'active'
        )
      `);
    }

    for (const seed of masterDepartmentSeeds) {
      await tx.execute(sql`
        update hero_master_departments
        set code = ${seed.shortCode},
            name = ${seed.name},
            is_active = true,
            updated_at = now()
        where name = ${seed.name}
      `);

      await tx.execute(sql`
        insert into hero_master_departments (code, name, description, is_active, created_at, updated_at)
        select ${seed.shortCode}, ${seed.name}, '', true, now(), now()
        where not exists (
          select 1 from hero_master_departments where name = ${seed.name}
        )
      `);
    }

    for (const row of sections) {
      const sectionSeed = masterSectionSeeds.find((seed) => seed.sourceCode === row.section_id);
      const departmentSeed = masterDepartmentSeeds.find((seed) => seed.sourceCode === row.department_id);

      if (!sectionSeed) {
        continue;
      }

      await tx.execute(sql`
        update hero_master_sections
        set code = ${sectionSeed.shortCode},
            name = ${row.section_name},
            department_id = (
              select id from hero_master_departments where code = ${departmentSeed?.shortCode ?? null}
            ),
            is_active = true,
            updated_at = now()
        where name = ${row.section_name}
      `);

      await tx.execute(sql`
        insert into hero_master_sections (code, name, department_id, description, is_active, created_at, updated_at)
        select
          ${sectionSeed.shortCode},
          ${row.section_name},
          (select id from hero_master_departments where code = ${departmentSeed?.shortCode ?? null}),
          '',
          true,
          now(),
          now()
        where not exists (
          select 1 from hero_master_sections where name = ${row.section_name}
        )
      `);
    }

    for (const row of positions) {
      const positionSeed = masterPositionSeeds.find((seed) => seed.sourceCode === row.position_id);
      const employeeForMapping = users.find((user) => user.position_id === row.position_id);
      const departmentSeed = employeeForMapping
        ? masterDepartmentSeeds.find((seed) => seed.sourceCode === employeeForMapping.department_id)
        : null;
      const sectionSeed = employeeForMapping
        ? masterSectionSeeds.find((seed) => seed.sourceCode === employeeForMapping.section_id)
        : null;

      if (!positionSeed) {
        continue;
      }

      await tx.execute(sql`
        update hero_master_positions
        set code = ${positionSeed.shortCode},
            name = ${row.rank_name},
            department_id = (
              select id from hero_master_departments where code = ${departmentSeed?.shortCode ?? null}
            ),
            section_id = (
              select id from hero_master_sections where code = ${sectionSeed?.shortCode ?? null}
            ),
            description = ${`Imported from DATA HERO. Level: ${row.level_name}`},
            is_active = true,
            updated_at = now()
        where name = ${row.rank_name}
      `);

      await tx.execute(sql`
        insert into hero_master_positions (
          code,
          name,
          department_id,
          section_id,
          site_location,
          level,
          description,
          is_active,
          created_at,
          updated_at
        )
        select
          ${positionSeed.shortCode},
          ${row.rank_name},
          (select id from hero_master_departments where code = ${departmentSeed?.shortCode ?? null}),
          (select id from hero_master_sections where code = ${sectionSeed?.shortCode ?? null}),
          '',
          1,
          ${`Imported from DATA HERO. Level: ${row.level_name}`},
          true,
          now(),
          now()
        where not exists (
          select 1 from hero_master_positions where name = ${row.rank_name}
        )
      `);
    }
  });

  console.log("DATA HERO import completed.");
}

main().catch((error) => {
  console.error("DATA HERO import failed.", error);
  process.exit(1);
});
