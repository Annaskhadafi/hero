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

  // Additional header & items fields for Repair & Service WO forms
  hari: varchar("hari", { length: 50 }),
  tanggal: varchar("tanggal", { length: 50 }),
  totalAmount: varchar("total_amount", { length: 100 }),
  items: text("items"), // Stores JSON array of item rows
  noPo: varchar("no_po", { length: 255 }),
  tanggalPo: varchar("tanggal_po", { length: 50 }),

  // Audit
  sortOrder: integer("sort_order").default(0).notNull(),
  createdBy: varchar("created_by", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const repairMasterCai = pgTable("repair_master_cai", {
  id: serial("id").primaryKey(),
  customer: varchar("customer", { length: 255 }).default("OTHER CUSTOMER").notNull(),
  size: varchar("size", { length: 100 }).notNull(),
  brand: varchar("brand", { length: 100 }),
  cai: varchar("cai", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).default("Tire Repair").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export const repairWipPo = pgTable("repair_wip_po", {
  idWo: varchar("id_wo", { length: 100 }).primaryKey().notNull(),
  noPo: varchar("no_po", { length: 255 }).notNull(),
  poDate: varchar("po_date", { length: 50 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
