import * as XLSX from "xlsx";
import { writeFile } from "fs/promises";

async function createEmployeeTemplate() {
  console.log("Creating employee import template...");

  const templateData = [
    [
      "SN",
      "Name",
      "Nickname",
      "Email",
      "Phone",
      "Site",
      "Department",
      "Position",
      "Status",
      "Type",
      "ID Card",
      "Birth Date",
      "Birth Place",
      "Address",
      "Join Date",
    ],
    [
      "12345",
      "John Doe",
      "John",
      "john.doe@example.com",
      "081234567890",
      "VALE INDONESIA",
      "Operations",
      "Supervisor",
      "active",
      "permanent",
      "3201234567890123",
      "1990-01-15",
      "Jakarta",
      "Jl. Example No. 123",
      "2020-01-01",
    ],
    [
      "12346",
      "Jane Smith",
      "Jane",
      "",
      "081234567891",
      "PPA BIB",
      "Maintenance",
      "Technician",
      "active",
      "contract",
      "3201234567890124",
      "1992-05-20",
      "Bandung",
      "Jl. Sample No. 456",
      "2021-03-15",
    ],
  ];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(templateData);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 10 },  // SN
    { wch: 25 },  // Name
    { wch: 15 },  // Nickname
    { wch: 30 },  // Email
    { wch: 15 },  // Phone
    { wch: 20 },  // Site
    { wch: 20 },  // Department
    { wch: 20 },  // Position
    { wch: 10 },  // Status
    { wch: 12 },  // Type
    { wch: 18 },  // ID Card
    { wch: 12 },  // Birth Date
    { wch: 15 },  // Birth Place
    { wch: 30 },  // Address
    { wch: 12 },  // Join Date
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  await writeFile("employee_import_template.xlsx", buffer);

  console.log("Created employee_import_template.xlsx");
  console.log("\nTemplate includes:");
  console.log("  - Header row with all required fields");
  console.log("  - 2 sample rows (1 with email, 1 without)");
  console.log("  - Ready to use for import");
}

createEmployeeTemplate().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
