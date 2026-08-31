import { sql } from "drizzle-orm";
import { db } from "@/db";

async function main() {
  const apply = process.argv.includes("--apply");
  const runId = `employee-site-repair-${new Date().toISOString().replace(/[:.]/g, "-")}`;

  const candidates = await db.execute(sql`
    with matched as (
      select distinct on (e.id)
        e.id as employee_id,
        e.site_id as current_site_id,
        s.id as target_site_id,
        s.name as target_site_name
      from hero_employees e
      join hero_sites s
        on lower(trim(e.work_location)) = lower(trim(s.name))
        or (
          lower(trim(e.work_location)) = lower(trim(coalesce(s.location, '')))
          and 1 = (
            select count(*)
            from hero_sites sx
            where lower(trim(coalesce(sx.location, ''))) = lower(trim(e.work_location))
          )
        )
      where e.work_location is not null
        and trim(e.work_location) <> ''
        and e.is_active = true
        and e.site_id is distinct from s.id
      order by e.id,
        case when lower(trim(e.work_location)) = lower(trim(s.name)) then 0 else 1 end,
        s.id
    )
    select
      target_site_id,
      target_site_name,
      current_site_id,
      count(*)::int as employee_count
    from matched
    group by target_site_id, target_site_name, current_site_id
    order by target_site_name, current_site_id;
  `);

  console.table(candidates.rows);

  if (!apply) {
    console.log("Dry-run only. Jalankan dengan --apply setelah backup production berhasil.");
    return;
  }

  await db.transaction(async (tx) => {
    await tx.execute(sql`
      create table if not exists hero_employee_site_repair_backup (
        run_id text not null,
        employee_id integer not null,
        old_site_id integer,
        new_site_id integer not null,
        work_location text,
        created_at timestamptz not null default now(),
        primary key (run_id, employee_id)
      );
    `);

    await tx.execute(sql`
      with matched as (
        select distinct on (e.id)
          e.id as employee_id,
          e.site_id as old_site_id,
          s.id as new_site_id,
          e.work_location
        from hero_employees e
        join hero_sites s
        on lower(trim(e.work_location)) = lower(trim(s.name))
        or (
          lower(trim(e.work_location)) = lower(trim(coalesce(s.location, '')))
          and 1 = (
            select count(*)
            from hero_sites sx
            where lower(trim(coalesce(sx.location, ''))) = lower(trim(e.work_location))
          )
        )
        where e.work_location is not null
          and trim(e.work_location) <> ''
          and e.is_active = true
          and e.site_id is distinct from s.id
        order by e.id,
          case when lower(trim(e.work_location)) = lower(trim(s.name)) then 0 else 1 end,
          s.id
      )
      insert into hero_employee_site_repair_backup (run_id, employee_id, old_site_id, new_site_id, work_location)
      select ${runId}, employee_id, old_site_id, new_site_id, work_location
      from matched;
    `);

    const updated = await tx.execute(sql`
      with matched as (
        select distinct on (e.id)
          e.id as employee_id,
          s.id as new_site_id
        from hero_employees e
        join hero_sites s
        on lower(trim(e.work_location)) = lower(trim(s.name))
        or (
          lower(trim(e.work_location)) = lower(trim(coalesce(s.location, '')))
          and 1 = (
            select count(*)
            from hero_sites sx
            where lower(trim(coalesce(sx.location, ''))) = lower(trim(e.work_location))
          )
        )
        where e.work_location is not null
          and trim(e.work_location) <> ''
          and e.is_active = true
          and e.site_id is distinct from s.id
        order by e.id,
          case when lower(trim(e.work_location)) = lower(trim(s.name)) then 0 else 1 end,
          s.id
      )
      update hero_employees e
      set site_id = matched.new_site_id
      from matched
      where e.id = matched.employee_id;
    `);

    console.log(`Applied ${updated.rowCount ?? 0} employee site repairs.`);
    console.log(`Backup run_id: ${runId}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});