import { db } from "../db";
import { hcRecruitments, hcCertificates, hrEmployees } from "../db/schema/hero";
import { eq } from "drizzle-orm";
import fs from "fs";

// Helper to parse values from INSERT INTO statement
function parseInsertValues(sql: string, tableName: string) {
  const regex = new RegExp(`INSERT INTO \\\`?${tableName}\\\`? \\(([^)]+)\\) VALUES\\s*([\\s\\S]+);`, "i");
  const match = sql.match(regex);
  if (!match) return [];
  
  const columns = match[1].split(",").map(c => c.trim().replace(/`/g, ""));
  
  // Very simplistic parser for values (assumes no complex escaping/newlines in strings)
  const valuesString = match[2];
  
  const rows: Record<string, string>[] = [];
  let currentRow: string[] = [];
  let inString = false;
  let currentVal = "";
  
  for (let i = 0; i < valuesString.length; i++) {
    const char = valuesString[i];
    const nextChar = valuesString[i+1];
    
    if (char === "'" && valuesString[i-1] !== '\\') {
      inString = !inString;
    } else if (char === "," && !inString) {
      currentRow.push(currentVal.trim().replace(/^'|'$/g, ""));
      currentVal = "";
    } else if (char === ")" && !inString) {
      currentRow.push(currentVal.trim().replace(/^'|'$/g, ""));
      currentVal = "";
      
      const rowObj: Record<string, string> = {};
      columns.forEach((col, idx) => {
        rowObj[col] = currentRow[idx];
      });
      rows.push(rowObj);
      
      currentRow = [];
      // Skip comma or whitespace until next parenthesis
      while (i + 1 < valuesString.length && valuesString[i+1] !== '(') {
        i++;
      }
      i++; // skip '('
    } else {
      currentVal += char;
    }
  }
  
  return rows;
}

function safeDate(d: string | undefined): Date {
  if (!d || d === "0000-00-00") return new Date();
  const date = new Date(d);
  return isNaN(date.getTime()) ? new Date() : date;
}

async function main() {
  console.log("Reading SQL dump...");
  const sql = fs.readFileSync("D:/[01] PROJECT/u703973018_chrisv2.sql", "utf8");
  
  console.log("Clearing old data to prevent duplicates...");
  await db.delete(hcRecruitments);
  await db.delete(hcCertificates);

  console.log("Parsing recruitment...");
  const recruitments = parseInsertValues(sql, "recruitment");
  if (recruitments.length > 0) {
    console.log(`Found ${recruitments.length} recruitments, inserting...`);
    for (const r of recruitments) {
      if (!r.job_title) continue;
      await db.insert(hcRecruitments).values({
        jobTitle: r.job_title,
        department: "-",
        totalRequested: parseInt(r.total_requested || "1", 10) || 1,
        section: r.section || "-",
        status: r.status || "Sourcing",
        startDate: safeDate(r.request_date),
        endDate: safeDate(r.due_date),
      });
    }
  }

  console.log("Parsing sertfikat_sio...");
  const sio = parseInsertValues(sql, "sertfikat_sio");
  if (sio.length > 0) {
    console.log(`Found ${sio.length} SIO certificates, inserting...`);
    for (const s of sio) {
      if (!s.karyawan) continue;
      // Try to link with employee
      const [emp] = await db.select().from(hrEmployees).where(eq(hrEmployees.fullName, s.karyawan)).limit(1);
      
      await db.insert(hcCertificates).values({
        employeeId: emp ? emp.id : null,
        employeeName: s.karyawan,
        certificateType: "SIO",
        licenseNumber: s.lisensi || "-",
        issuedDate: new Date("2020-01-01"), // Dummy date since not present
        expiryDate: safeDate(s.masa_berlaku),
        status: "Active"
      });
    }
  }

  console.log("Parsing sertifikat_pop...");
  const pop = parseInsertValues(sql, "sertifikat_pop");
  if (pop.length > 0) {
    console.log(`Found ${pop.length} POP certificates, inserting...`);
    for (const p of pop) {
      if (!p.karyawan) continue;
      const [emp] = await db.select().from(hrEmployees).where(eq(hrEmployees.fullName, p.karyawan)).limit(1);
      
      await db.insert(hcCertificates).values({
        employeeId: emp ? emp.id : null,
        employeeName: p.karyawan,
        certificateType: "POP",
        licenseNumber: "N/A", // Not present in POP table
        issuedDate: new Date("2020-01-01"),
        expiryDate: safeDate(p.masa_berlaku),
        status: "Active"
      });
    }
  }

  console.log("Parsing employee contracts...");
  const employees = parseInsertValues(sql, "employee");
  if (employees.length > 0) {
    console.log(`Found ${employees.length} employees, updating contract dates...`);
    for (const e of employees) {
      if (!e.sn || e.sn === "''") continue;
      
      let contractStart = e.contract_start && !e.contract_start.startsWith("0000") ? e.contract_start : null;
      let contractEnd = e.contract_end && !e.contract_end.startsWith("0000") ? e.contract_end : null;
      
      // Basic validation for pg date
      if (contractStart && isNaN(new Date(contractStart).getTime())) contractStart = null;
      if (contractEnd && isNaN(new Date(contractEnd).getTime())) contractEnd = null;
      
      if (contractStart || contractEnd) {
        await db.update(hrEmployees)
          .set({ 
            contractStart: contractStart, 
            contractEnd: contractEnd 
          })
          .where(eq(hrEmployees.employeeId, e.sn));
      }
    }
  }

  console.log("Import complete!");
  process.exit(0);
}

main().catch(console.error);
