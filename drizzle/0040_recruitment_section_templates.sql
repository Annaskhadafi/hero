-- CREATE TABLE: hero_recruitment_section_templates
CREATE TABLE IF NOT EXISTS "hero_recruitment_section_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer,
	"requirements" text DEFAULT '' NOT NULL,
	"qualifications" jsonb DEFAULT '[]',
	"mandatory_fields" jsonb DEFAULT '[]',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Foreign key constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hero_recruitment_section_templates_section_id_hero_master_sections_id_fk'
  ) THEN
    ALTER TABLE "hero_recruitment_section_templates" ADD CONSTRAINT "hero_recruitment_section_templates_section_id_hero_master_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."hero_master_sections"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;

-- Index on section_id
CREATE INDEX IF NOT EXISTS "hero_recruitment_section_templates_section_id_idx" ON "hero_recruitment_section_templates" ("section_id");

-- Insert default templates for common sections (will be expanded by seed script)
INSERT INTO "hero_recruitment_section_templates" ("section_id", "requirements", "qualifications", "mandatory_fields") VALUES
  (NULL, 'Mengoperasikan kendaraan / alat berat sesuai SOP. Memastikan kondisi kendaraan prima. Mematuhi peraturan lalu lintas dan K3. Bekerja shift.\n\nDeskripsi: Mengendarai kendaraan operasional untuk aktivitas hauling, loading, atau transportasi. Bertanggung jawab atas keamanan muatan, perawatan ringan, dan koordinasi dengan dispatcher.', '["Pendidikan Min. SMA/SMK", "Pengalaman Min. 1 Tahun", "Memiliki SIM C"]', '["cv", "dateOfBirth", "address", "gender", "drivingLicenses"]'),
  (NULL, 'Menangani administrasi harian: filing, data entry, surat-menyurat. Mengelola jadwal meeting dan koordinasi antar departemen. Membuat laporan periodik. Melayani tamu dan telepon dengan profesional.', '["Pendidikan Min. D3", "Menguasai Microsoft Office", "Bahasa Inggris Aktif"]', '["cv", "dateOfBirth", "address", "gender", "education", "workExperience"]'),
  (NULL, 'Melakukan perawatan preventif dan korektif pada mesin / peralatan. Membaca technical drawing dan manual. Menggunakan tools dan measuring instruments dengan benar. Mengisi maintenance log dan laporan kerja.', '["Pendidikan Min. SMA/SMK", "Pengalaman Min. 1 Tahun", "Memiliki SIM C"]', '["cv", "dateOfBirth", "address", "gender", "certificates", "workExperience"]'),
  (NULL, 'Memastikan kepatuhan terhadap peraturan K3. Melakukan safety inspection, hazard identification, dan risk assessment. Menyelenggarakan safety induction dan toolbox meeting. Menyusun laporan kecelakaan kerja.', '["Pendidikan Min. D3", "Pengalaman Min. 1 Tahun", "Bahasa Inggris Aktif"]', '["cv", "dateOfBirth", "address", "gender", "certificates", "education", "workExperience"]'),
  (NULL, 'Mengelola penerimaan, penyimpanan, dan pengeluaran barang. Melakukan stock opname. Mengoperasikan forklift (sertifikat diutamakan). Memelihara gudang tetap rapi dan aman.', '["Pendidikan Min. SMA/SMK", "Pengalaman Min. 1 Tahun", "Memiliki SIM C"]', '["cv", "dateOfBirth", "address", "gender", "certificates", "workExperience"]')
ON CONFLICT DO NOTHING;
