import { sql } from 'drizzle-orm'
import { db } from '../db'

async function run() {
  console.log('Running JSA migration...')
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hero_jsas" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "jsa_number" varchar(255) NOT NULL,
      "job_description" text NOT NULL,
      "equipment_number" varchar(255) NOT NULL,
      "team_members" text NOT NULL,
      "equipment_used" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "permits" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "ppe_requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "risk_level" varchar(50) NOT NULL,
      "signatures" jsonb DEFAULT '{}'::jsonb NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );
  `)
  console.log('Created hero_jsas')

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "hero_jsa_steps" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "jsa_id" uuid NOT NULL,
      "step_order" integer NOT NULL,
      "work_step" text NOT NULL,
      "hazard" text NOT NULL,
      "consequence" text NOT NULL,
      "control" text NOT NULL,
      "residual_risk" varchar(50) NOT NULL,
      "pic" varchar(255) NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    );
  `)
  console.log('Created hero_jsa_steps')

  try {
    await db.execute(sql`
      ALTER TABLE "hero_jsa_steps" ADD CONSTRAINT "hero_jsa_steps_jsa_id_hero_jsas_id_fk" FOREIGN KEY ("jsa_id") REFERENCES "public"."hero_jsas"("id") ON DELETE cascade ON UPDATE no action;
    `)
    console.log('Added foreign key constraint')
  } catch (e: any) {
    if (!e.message.includes('already exists')) {
      throw e
    }
  }

  console.log('Done!')
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
