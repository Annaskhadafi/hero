import { syncSystemPresets } from "../lib/approval-presets";

async function main() {
  console.log("Seeding system workflow presets...");
  await syncSystemPresets();
  console.log("Presets seeded successfully!");
}

main().catch(err => {
  console.error("Error seeding presets:", err);
  process.exit(1);
});
