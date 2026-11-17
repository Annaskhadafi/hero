import { db } from '../db';
import { masterApd } from '../db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('Seeding additional APD items...');

  const itemsToAdd = [
    {
      code: 'APD-027',
      name: 'Tudung Kepala / Kupluk (Makatac)',
      category: 'APD',
      unit: 'Pcs',
      hasSize: false,
      sizeOptions: [] as string[],
      minStock: 5,
      isQtyOnly: true,
      isActive: true,
      notes: 'Maintenance Rim - Tudung kepala / kupluk katun tahan panas (Makatac)',
    },
    {
      code: 'APD-028',
      name: 'Cotton Filter Respirator Honeywell',
      category: 'APD',
      unit: 'Pcs',
      hasSize: false,
      sizeOptions: [] as string[],
      minStock: 10,
      isQtyOnly: true,
      isActive: true,
      notes: 'Honeywell 7506N95 NIOSH N95 NBR P2 S (W3542654) - Filter katun respirator partikel & debu',
    },
    {
      code: 'APD-029',
      name: 'Jaket & Kaos Tangan Welder',
      category: 'APD',
      unit: 'Set',
      hasSize: false,
      sizeOptions: [] as string[],
      minStock: 3,
      isQtyOnly: true,
      isActive: true,
      notes: 'Khusus Welder (3 Orang) - Jaket dan sarung tangan las tahan panas',
    },
    {
      code: 'APD-030',
      name: 'Helmet + Face Shield 3M',
      category: 'APD',
      unit: 'Set',
      hasSize: false,
      sizeOptions: [] as string[],
      minStock: 2,
      isQtyOnly: true,
      isActive: true,
      notes: 'Maintenance Rim - Helm pelindung terintegrasi face shield 3M',
    },
    {
      code: 'APD-031',
      name: 'Sepatu Safety Krusher Texas (Booth)',
      category: 'APD',
      unit: 'Pasang',
      hasSize: true,
      sizeOptions: ['38', '39', '40', '41', '42', '43', '44', '45', '46'],
      minStock: 5,
      isQtyOnly: true,
      isActive: true,
      notes: 'Untuk karyawan laki-laki Site Vale Sorowako',
    },
    {
      code: 'APD-032',
      name: 'Sepatu Safety Krusher Nevada (3/4)',
      category: 'APD',
      unit: 'Pasang',
      hasSize: true,
      sizeOptions: ['36', '37', '38', '39', '40', '41', '42'],
      minStock: 2,
      isQtyOnly: true,
      isActive: true,
      notes: 'Untuk karyawan perempuan Site Vale Sorowako',
    },
  ];

  for (const item of itemsToAdd) {
    const existing = await db.select().from(masterApd).where(eq(masterApd.code, item.code));
    if (existing.length === 0) {
      await db.insert(masterApd).values(item);
      console.log(`Inserted ${item.code} - ${item.name}`);
    } else {
      await db.update(masterApd).set(item).where(eq(masterApd.code, item.code));
      console.log(`Updated ${item.code} - ${item.name}`);
    }
  }

  console.log('Seeding finished successfully.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
