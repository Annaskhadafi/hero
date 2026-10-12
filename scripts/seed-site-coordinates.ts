import { db } from "../db"
import { sites } from "../db/schema/hero"
import { eq } from "drizzle-orm"

export const SITE_GEO_COORDINATES: Record<string, { lat: string; lng: string }> = {
  "PKA Musi Rawas": { lat: "-3.2000", lng: "103.0500" },
  "CDE - Bengkulu": { lat: "-3.4500", lng: "102.5200" },
  "Sebamban": { lat: "-3.6000", lng: "115.6300" },
  "Balikpapan": { lat: "-1.179166", lng: "116.853649" },
  "Makassar": { lat: "-5.1477", lng: "119.4327" },
  "PPA TJ-Enim": { lat: "-3.7380", lng: "103.7840" },
  "PT SMJ - Berau": { lat: "2.1550", lng: "117.4950" },
  "Palembang": { lat: "-2.9761", lng: "104.7754" },
  "MTN - ME": { lat: "-3.7100", lng: "103.7500" },
  "Pekanbaru": { lat: "0.5071", lng: "101.4478" },
  "Petrosea SDA": { lat: "-3.3500", lng: "127.1000" },
  "CK MIFA": { lat: "4.1800", lng: "96.1800" },
  "BSI - Banyuwangi": { lat: "-8.6250", lng: "114.0500" },
  "CK MHU": { lat: "-0.674612", lng: "116.874275" },
  "Tj. Redeb - Berau": { lat: "2.1600", lng: "117.4800" },
  "Vale - Sorowako": { lat: "-2.5323", lng: "121.3533" },
  "CK BIB": { lat: "-3.6128", lng: "115.6022" },
  "Tj. Adaro": { lat: "-2.1812", lng: "115.5186" },
  "CK BMB": { lat: "-3.0033", lng: "115.1583" },
  "Jakarta": { lat: "-6.2088", lng: "106.8456" },
  "MTN - Berau": { lat: "2.1400", lng: "117.5100" },
  "TU Gresik": { lat: "-7.1566", lng: "112.6555" },
  "CK KIM": { lat: "-1.411259", lng: "101.712370" },
  "Madhani Talatah - ME": { lat: "2.1300", lng: "117.4700" },
  "AMM Mifa Hauling": { lat: "4.211650", lng: "96.246285" },
  "TU Batu Hijau": { lat: "-8.9667", lng: "116.8667" },
  "Sangatta KABO": { lat: "0.4930", lng: "117.5890" },
  "CK NCN": { lat: "4.1500", lng: "96.1600" },
  "PPA BIB": { lat: "-3.6200", lng: "115.6100" },
  "KPUC - Malinau": { lat: "3.5833", lng: "116.6333" },
  "Balikpapan External": { lat: "-1.2100", lng: "116.8900" },
  "Sangatta KPC": { lat: "0.5200", lng: "117.5500" },
  "BUMA Tanjung": { lat: "-2.1900", lng: "115.5300" },
  "AMM Tabang": { lat: "0.5500", lng: "115.9800" },
}

async function main() {
  console.log("Seeding coordinates for hero_sites...")
  const allSites = await db.select().from(sites)
  let updatedCount = 0

  for (const s of allSites) {
    const coords = SITE_GEO_COORDINATES[s.name]
    if (coords) {
      await db
        .update(sites)
        .set({
          geoLatitude: coords.lat,
          geoLongitude: coords.lng,
        })
        .where(eq(sites.id, s.id))
      console.log(`Updated site ${s.name} (${s.id}) -> lat: ${coords.lat}, lng: ${coords.lng}`)
      updatedCount++
    } else {
      console.log(`No preset coords for site: ${s.name}`)
    }
  }

  console.log(`Done! Updated ${updatedCount} sites.`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
