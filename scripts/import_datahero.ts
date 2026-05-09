import { readFileSync } from "fs";
process.env.DATABASE_SSL = "false";
import { db } from "../db";
import { centralServiceEmployees } from "../db/schema/central-service";
import { user } from "../db/schema/auth";

async function main() {
  let fileContent = readFileSync("d:\\[01] PROJECT\\HERO\\datahero.csv", "utf-8");
  if (fileContent.charCodeAt(0) === 0xFEFF) {
    fileContent = fileContent.slice(1);
  }
  const lines = fileContent.split(/\r?\n/).filter((line) => line.trim() !== "");
  
  if (lines.length < 2) {
    console.log("File is empty or has only headers");
    process.exit(0);
  }

  const headers = lines[0].split(";");
  const records = lines.slice(1).map((line) => {
    const values = line.split(";");
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index];
    });
    return record;
  });

  console.log(`Found ${records.length} records in CSV`);

  // 1. Get existing emails in user management
  const users = await db.select({ email: user.email }).from(user);
  const userEmails = new Set(users.map((u) => u.email?.toLowerCase()).filter(Boolean));
  console.log(`Found ${userEmails.size} users in user management`);

  // 2. Get existing employees to avoid duplicate employeeSn
  const existingEmployees = await db.select({ employeeSn: centralServiceEmployees.employeeSn, email: centralServiceEmployees.email }).from(centralServiceEmployees);
  const existingSns = new Set(existingEmployees.map((e) => e.employeeSn));
  const existingEmails = new Set(existingEmployees.map((e) => e.email?.toLowerCase()).filter(Boolean));
  console.log(`Found ${existingSns.size} existing employees in central_service_employees`);

  const toInsert = [];

  for (const record of records) {
    const sn = record["Employee ID"];
    if (!sn) continue; // skip invalid rows

    const email = record["Email Address"]?.trim() || "";
    
    // Check if duplicate in central_service_employees
    if (existingSns.has(sn)) {
      continue;
    }

    if (email && existingEmails.has(email.toLowerCase())) {
      continue;
    }

    // Check if exists in user management
    const isInUserMgmt = email && userEmails.has(email.toLowerCase());
    
    // Import employees NOT in user management
    if (isInUserMgmt) {
      continue;
    }

    toInsert.push({
      employeeSn: sn,
      fullName: record["Employee Name"] || "",
      email: email ? email : null,
      siteName: record["Location / Site"] || "",
      department: record["Department"] || "",
      section: record["Section"]?.trim() || "",
      position: record["Pangkat"] || record["Level"] || "",
      employmentStatus: "active",
      employmentType: record["Demographic Employee Status"]?.toLowerCase() === "contract" ? "contract" : "permanent",
      birthDate: record["Tanggal Lahir"] || null,
      joinDate: record["Join Date"] || null,
      isSyncedToUserManagement: false,
    });
    
    // add to existingSns to prevent duplicates within the file itself
    existingSns.add(sn);
    if (email) {
      existingEmails.add(email.toLowerCase());
    }
  }

  console.log(`Ready to insert ${toInsert.length} new employees`);

  if (toInsert.length > 0) {
    // Insert in batches of 100
    for (let i = 0; i < toInsert.length; i += 100) {
      const batch = toInsert.slice(i, i + 100);
      await db.insert(centralServiceEmployees).values(batch);
      console.log(`Inserted batch ${i / 100 + 1} (${batch.length} records)`);
    }
  }

  console.log("Import completed!");
  process.exit(0);
}

main().catch(console.error);
