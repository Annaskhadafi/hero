import { pgTable, serial, text, varchar, timestamp, integer } from "drizzle-orm/pg-core"

export const repairFormWo = pgTable("repair_form_wo", {
  id: serial("id").primaryKey(),

  // Data referensi dari WIP Repair (external API)
  idWo: varchar("id_wo", { length: 100 }),
  tireSn: varchar("tire_sn", { length: 100 }),
  customer: varchar("customer", { length: 255 }),
  site: varchar("site", { length: 255 }),
  storeLoc: varchar("store_loc", { length: 100 }),
  brand: varchar("brand", { length: 100 }),
  pattern: varchar("pattern", { length: 100 }),
  size: varchar("size", { length: 100 }),
  injury: text("injury"),
  jobType: varchar("job_type", { length: 100 }),
  remark: text("remark"),
  inspectDate: varchar("inspect_date", { length: 50 }),
  inspector: varchar("inspector", { length: 255 }),
  receivedDate: varchar("received_date", { length: 50 }),
  receiver: varchar("receiver", { length: 255 }),

  // Data pengajuan WO
  jenisPengajuan: varchar("jenis_pengajuan", { length: 50 }).default("repair").notNull(),
  // repair | non_repair
  deskripsiPekerjaan: text("deskripsi_pekerjaan"),
  noPengajuan: varchar("no_pengajuan", { length: 100 }).unique(),
  tanggalPengajuan: timestamp("tanggal_pengajuan").defaultNow().notNull(),
  pemohon: varchar("pemohon", { length: 255 }),
  catatanPengajuan: text("catatan_pengajuan"),
  statusPengajuan: varchar("status_pengajuan", { length: 50 }).default("pending").notNull(),
  // pending | approved | rejected | diproses

  // Hasil pengajuan (diisi setelah WO terbit)
  noWoTerbit: varchar("no_wo_terbit", { length: 100 }),
  tanggalWoTerbit: timestamp("tanggal_wo_terbit"),

  // Audit
  sortOrder: integer("sort_order").default(0).notNull(),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
