import { db } from "@/db";
import { heroMasterAtk } from "@/db/schema/atk";
import { sql } from "drizzle-orm";

const standardAtkItems = [
  // Kertas & Buku
  { code: "ATK-PPR-001", name: "Kertas HVS A4 75gsm (PaperOne)", category: "Kertas & Buku", unit: "Rim", description: "Kertas cetak HVS ukuran A4 75 gram", minStock: 20 },
  { code: "ATK-PPR-002", name: "Kertas HVS F4/Folio 75gsm (PaperOne)", category: "Kertas & Buku", unit: "Rim", description: "Kertas cetak HVS ukuran F4 75 gram", minStock: 15 },
  { code: "ATK-PPR-003", name: "Buku Tulis Ekspedisi Folio Hardcover", category: "Kertas & Buku", unit: "Buku", description: "Buku tanda terima / ekspedisi hardcover 100 lembar", minStock: 10 },
  { code: "ATK-PPR-004", name: "Post-it Notes 3x3 Kuning (3M)", category: "Kertas & Buku", unit: "Pad", description: "Kertas tempel memo 76x76mm isi 100 sheets", minStock: 25 },
  { code: "ATK-PPR-005", name: "Kertas Fax / Thermal Paper Roll 80mm", category: "Kertas & Buku", unit: "Rol", description: "Kertas struk thermal roll", minStock: 10 },

  // Alat Tulis & Koreksi
  { code: "ATK-PEN-001", name: "Ballpoint Standard AE7 0.5mm Hitam", category: "Alat Tulis & Koreksi", unit: "Box", description: "Pulpen gel hitam 1 box isi 12 pcs", minStock: 30 },
  { code: "ATK-PEN-002", name: "Ballpoint Standard AE7 0.5mm Biru", category: "Alat Tulis & Koreksi", unit: "Box", description: "Pulpen gel biru 1 box isi 12 pcs", minStock: 20 },
  { code: "ATK-PEN-003", name: "Spidol Whiteboard Snowman Hitam", category: "Alat Tulis & Koreksi", unit: "Box", description: "Spidol papan tulis boardmarker isi 12 pcs", minStock: 15 },
  { code: "ATK-PEN-004", name: "Spidol Permanent Snowman Hitam", category: "Alat Tulis & Koreksi", unit: "Pcs", description: "Spidol permanen tahan air warna hitam", minStock: 20 },
  { code: "ATK-PEN-005", name: "Highlighter / Stabilo Boss Warna-Warni", category: "Alat Tulis & Koreksi", unit: "Set", description: "Set highlighter 4 warna (Kuning, Hijau, Pink, Oranye)", minStock: 10 },
  { code: "ATK-PEN-006", name: "Correction Tape / Tip-Ex Kertas (Joyko)", category: "Alat Tulis & Koreksi", unit: "Pcs", description: "Pita koreksi tipe roll 12m", minStock: 25 },
  { code: "ATK-PEN-007", name: "Pensil 2B Faber-Castell", category: "Alat Tulis & Koreksi", unit: "Lusin", description: "Pensil kayu 2B isi 12 pcs", minStock: 10 },

  // Arsip & Binder
  { code: "ATK-DOC-001", name: "Ordner Bantex Folio 7cm Hitam/Biru", category: "Arsip & Binder", unit: "Pcs", description: "Binder arsip tebal lever arch file F4", minStock: 20 },
  { code: "ATK-DOC-002", name: "Map Snelhechter Kertas Folio (Diamond)", category: "Arsip & Binder", unit: "Pak", description: "Map kertas jepit snelhechter isi 50 lembar", minStock: 15 },
  { code: "ATK-DOC-003", name: "Map Plastik L-Folder A4 Bening", category: "Arsip & Binder", unit: "Lusin", description: "Map plastik clear L shape isi 12 pcs", minStock: 20 },
  { code: "ATK-DOC-004", name: "Box File Plastik Keranjang (Bantex)", category: "Arsip & Binder", unit: "Pcs", description: "Tempat penyimpanan dokumen meja", minStock: 15 },
  { code: "ATK-DOC-005", name: "Amplop Coklat Tali Folio / F4", category: "Arsip & Binder", unit: "Pak", description: "Amplop coklat bertali isi 100 lembar", minStock: 10 },

  // Aksesoris & Peralatan Meja
  { code: "ATK-DSK-001", name: "Stepler Max HD-10", category: "Aksesoris & Peralatan Meja", unit: "Pcs", description: "Alat jepret staples ukuran kecil", minStock: 15 },
  { code: "ATK-DSK-002", name: "Isi Staples No. 10 (Max)", category: "Aksesoris & Peralatan Meja", unit: "Box", description: "Isi staples No. 10 kecil isi 1000 staples", minStock: 40 },
  { code: "ATK-DSK-003", name: "Binder Clip No. 107 (19mm)", category: "Aksesoris & Peralatan Meja", unit: "Kotak", description: "Klip jepit kertas kecil isi 12 pcs", minStock: 20 },
  { code: "ATK-DSK-004", name: "Binder Clip No. 260 (51mm)", category: "Aksesoris & Peralatan Meja", unit: "Kotak", description: "Klip jepit kertas besar isi 12 pcs", minStock: 15 },
  { code: "ATK-DSK-005", name: "Paper Clip / Trigonal Clip No. 3", category: "Aksesoris & Peralatan Meja", unit: "Kotak", description: "Klip kawat kertas isi 100 pcs", minStock: 25 },
  { code: "ATK-DSK-006", name: "Gunting Kertas Joyko Sedang 7 Inch", category: "Aksesoris & Peralatan Meja", unit: "Pcs", description: "Gunting stainless steel gagang karet", minStock: 10 },
  { code: "ATK-DSK-007", name: "Cutter Joyko A-300 + Isi Pisau", category: "Aksesoris & Peralatan Meja", unit: "Set", description: "Pisau cutter kecil beserta isi refill blade", minStock: 12 },
  { code: "ATK-DSK-008", name: "Lakban Bening Daimaru 2 Inch (48mm)", category: "Aksesoris & Peralatan Meja", unit: "Rol", description: "Lakban plastik bening 100 yard", minStock: 20 },
  { code: "ATK-DSK-009", name: "Lakban Coklat Daimaru 2 Inch (48mm)", category: "Aksesoris & Peralatan Meja", unit: "Rol", description: "Lakban packing coklat 100 yard", minStock: 20 },
  { code: "ATK-DSK-010", name: "Double Tape 3M Foam 24mm", category: "Aksesoris & Peralatan Meja", unit: "Rol", description: "Pita perekat busa bolak-balik kuat", minStock: 15 },
  { code: "ATK-DSK-011", name: "Penggaris Besi 30cm", category: "Aksesoris & Peralatan Meja", unit: "Pcs", description: "Penggaris stainless steel 30 cm", minStock: 10 },
];

export async function seedMasterAtk() {
  console.log("Seeding Master Data ATK...");
  let count = 0;

  for (const item of standardAtkItems) {
    await db
      .insert(heroMasterAtk)
      .values({
        code: item.code,
        name: item.name,
        category: item.category,
        unit: item.unit,
        description: item.description,
        minStock: item.minStock,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: heroMasterAtk.code,
        set: {
          name: item.name,
          category: item.category,
          unit: item.unit,
          description: item.description,
          minStock: item.minStock,
          isActive: true,
          updatedAt: new Date(),
        },
      });
    count++;
  }

  console.log(`Successfully seeded ${count} Master ATK items.`);
}

if (require.main === module) {
  seedMasterAtk()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed Master ATK failed:", err);
      process.exit(1);
    });
}
