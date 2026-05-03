/**
 * PT Chitra Paratama Organizational Structure Seed
 * Effective: 1 January 2026
 * Source: Org. Chart Chitra Paratama Jan 2026.pdf
 * 
 * Run: npx tsx lib/org-chitra-seed.ts
 */
import { db } from "@/db";
import {
  masterDepartments, masterSections, masterPositions,
  orgChartStructures, orgChartNodes, orgNodeAssignments,
  employees, sites,
} from "@/db/schema/hero";
import { eq, and, isNull } from "drizzle-orm";

// ─── DEPARTMENT MAP (PDF → DB code) ────────────────────────────────────────
// Using existing department codes from the database
const DEPT_MAP = {
  DIRECTOR:     "MAN",    // Management
  FINANCE:      "F-BIMA", // Finance Business Partner
  HC:           "HC",     // Human Capital
  LEGAL:        "LEGAL",  // Legal & ERM
  SUPPLY:       "SCM",    // Supply Chain Dept
  SALES:        "BC",     // Sales Operation
  CENTRAL:      "CEN",    // Central Services
  SUPPORT:      "SFM",    // Support Facilities Management
  CPI_IA:       "BPI",    // CI & Audit
  BIMA:         "BIMA",   // BI & Marketing (legacy)
} as const;

// ─── SECTION MAP (PDF name → DB code) ──────────────────────────────────────
const SECTION_MAP: Record<string, { code: string; deptCode: string }> = {
  "Board Secretary":                    { code: "SEC_CP_BOARD",       deptCode: "MAN" },
  "General Manager":                    { code: "SEC_CP_GM",          deptCode: "MAN" },
  "Finance Business Partner":           { code: "FBC",                deptCode: "F-BIMA" },
  "Finance Support & External Relation":{ code: "FER",                deptCode: "F-BIMA" },
  "Finance & Accounting":               { code: "FIN",                deptCode: "F-BIMA" },
  "Treasury":                           { code: "SEC_CP_TREASURY",    deptCode: "F-BIMA" },
  "Accounting & Asset":                 { code: "SEC_CP_ACC_ASSET",   deptCode: "F-BIMA" },
  "Reporting & Budget":                 { code: "SEC_CP_REPORTING",   deptCode: "F-BIMA" },
  "Finance Operations":                 { code: "SEC_CP_FIN_OPS",     deptCode: "F-BIMA" },
  "Business Innovation & Marketing":    { code: "BIM",                deptCode: "F-BIMA" },
  "Marketing & Corporate Comm":         { code: "MAR",                deptCode: "BIMA" },
  "Database & Innovation":              { code: "DBI",                deptCode: "F-BIMA" },
  "Information Technology":             { code: "IT",                 deptCode: "F-BIMA" },
  "Human Resources & GA":               { code: "HR",                 deptCode: "HC" },
  "Training Center":                    { code: "SEC_human_capital_training_center", deptCode: "HC" },
  "HSE":                                { code: "HSE",                deptCode: "HC" },
  "Corporate Wellness":                 { code: "WEL",                deptCode: "HC" },
  "Legal & ERM":                        { code: "SEC_legal___erm_legal___erm__insurance", deptCode: "LEGAL" },
  "Supply Chain Management":            { code: "SEC_CP_SCM",         deptCode: "SCM" },
  "EXIM Compliance & Principal":        { code: "SEC_supply_chain_dept_export_import_compliance___principal_relation", deptCode: "SCM" },
  "Logistic Management":                { code: "SEC_supply_chain_dept_logistic_management", deptCode: "SCM" },
  "Procurement":                        { code: "SEC_supply_chain_dept_procurement", deptCode: "SCM" },
  "Inventory":                          { code: "SEC_supply_chain_dept_inventory", deptCode: "SCM" },
  "Billing":                            { code: "SEC_supply_chain_dept_biling", deptCode: "SCM" },
  "Warehouse & Distribution":           { code: "SEC_supply_chain_dept_warehouse___distribution", deptCode: "SCM" },
  "Office Strategic Management":        { code: "OFM",                deptCode: "MAN" },
  "CPI & IA Reps":                      { code: "BPI",                deptCode: "MAN" },
  "Quality Management":                 { code: "CI",                 deptCode: "BPI" },
  "National Sales":                     { code: "SEC_sales_operation_national_sales", deptCode: "BC" },
  "Major Account":                      { code: "SEC_sales_operation_major_account", deptCode: "BC" },
  "Sales Kalimantan":                   { code: "SEC_sales_operation_sales_kalimantan", deptCode: "BC" },
  "Sales Sulawesi & East Indonesia":    { code: "SEC_sales_operation_sales_east_indonesia", deptCode: "BC" },
  "Service Operation MVC":              { code: "SVC",                deptCode: "CEN" },
  "Service Operation Others":           { code: "SVO",                deptCode: "CEN" },
  "Repair / Retread Operation":         { code: "RPR",                deptCode: "CEN" },
  "Technical":                          { code: "TE",                 deptCode: "CEN" },
  "Product Accessories":                { code: "PA",                 deptCode: "CEN" },
  "Facility & Maintenance":             { code: "SEC_support_facilities_management_support_facility_management", deptCode: "SFM" },
  "Hub Representatives":                { code: "SEC_CP_HUB_REPS",    deptCode: "SFM" },
};

// ─── EMPLOYEE DATA (from PDF + existing DB) ─────────────────────────────────
// Format: [name, email, department, section, jobTitle, accessRole, siteId]
// siteId: 3=Chitra Head Office, 4=Balikpapan, 5=Bengalon
type EmpSeed = [string, string, string, string, string, string, number];

const EMPLOYEE_SEEDS: EmpSeed[] = [
  // ── DIRECTOR OFFICE ──
  ["Hidayat Rahman",          "hidayat.rahman@chitraparatama.co.id",     "DIRECTOR", "Board Secretary",              "Director",                   "Super Admin",    3],
  ["Freshya Ochtovita",       "freshya.ochtovita@chitraparatama.co.id",  "DIRECTOR", "Board Secretary",              "Board Secretary",            "Manager",        3],
  ["Person Sihaloho",         "person.sihaloho@chitraparatama.co.id",    "DIRECTOR", "General Manager",              "General Manager",            "Manager",        3],

  // ── FINANCE BUSINESS PARTNERS ──
  ["Febrian Dani",            "febrian.dani@chitraparatama.co.id",       "FINANCE",  "Finance Business Partner",      "Manager Finance BP",          "Manager",        3],
  ["Selfiatu Zahroh",         "selfiatu.zahroh@chitraparatama.co.id",    "FINANCE",  "Finance Support & External Relation","Manager Finance Support", "Manager",        3],
  ["Amama Ira Amalia P.",     "amama.ira@chitraparatama.co.id",          "FINANCE",  "Finance & Accounting",          "Supervisor Finance & Accounting","Manager",      3],
  ["Meita Putri R.",          "meita.putri@chitraparatama.co.id",        "FINANCE",  "Treasury",                      "Coordinator Treasury",        "Staff",          3],
  ["Havid Raka R.P.",         "havid.raka@chitraparatama.co.id",         "FINANCE",  "Treasury",                      "Staff Treasury",              "Staff",          3],
  ["Syamsul Bahri",           "syamsul.bahri@chitraparatama.co.id",      "FINANCE",  "Accounting & Asset",            "Supervisor Accounting",       "Manager",        3],
  ["Evo Dwi Yulianti",        "evo.yulianti@chitraparatama.co.id",       "FINANCE",  "Accounting & Asset",            "Staff Accounting",            "Staff",          3],
  ["Dwi Astuti",              "dwi.astuti@chitraparatama.co.id",         "FINANCE",  "Finance Operations",            "Coordinator Finance",         "Staff",          3],
  ["Aulia Rizki W.",          "aulia.rizki@chitraparatama.co.id",        "FINANCE",  "Finance Operations",            "Staff Finance",               "Staff",          3],
  ["Tini Dwi Saripah",        "tini.saripah@chitraparatama.co.id",       "FINANCE",  "Finance Operations",            "Admin Finance",               "Staff",          3],
  ["Priyono",                 "priyono@chitraparatama.co.id",            "FINANCE",  "Reporting & Budget",            "Staff Reporting",             "Staff",          3],

  // ── BUSINESS INNOVATION & MARKETING ──
  ["Arif Maulana G.",         "arif.maulana@chitraparatama.co.id",       "FINANCE",  "Business Innovation & Marketing","Supervisor BI Marketing",    "Manager",        3],
  ["Andana G.",               "andana.g@chitraparatama.co.id",           "BIMA",     "Marketing & Corporate Comm",     "Coordinator Marketing",       "Staff",          3],
  ["Luthfi Saiful S.",        "luthfi.saiful@chitraparatama.co.id",      "FINANCE",  "Database & Innovation",          "Supervisor Database",         "Manager",        3],
  ["Muhammad Al Qadim",       "muhammad.alqadim@chitraparatama.co.id",   "FINANCE",  "Database & Innovation",          "Coordinator Database",        "Staff",          3],
  ["M. Naufal Pratama M.",    "naufal.pratama@chitraparatama.co.id",     "FINANCE",  "Database & Innovation",          "Leader Database",             "Staff",          3],
  ["Muh. Herdiman Effendi",   "herdiman.effendi@chitraparatama.co.id",   "FINANCE",  "Database & Innovation",          "Innovation Engineer",         "Staff",          3],
  ["M. Ali Porwanto",         "ali.porwanto@chitraparatama.co.id",       "FINANCE",  "Database & Innovation",          "Innovation Engineer",         "Staff",          3],
  ["Dinda Saputri",           "dinda.saputri@chitraparatama.co.id",      "FINANCE",  "Database & Innovation",          "Database Engineer",           "Staff",          3],
  ["Fakhi Rohandi",           "fakhi.rohandi@chitraparatama.co.id",      "FINANCE",  "Database & Innovation",          "Database Engineer",           "Staff",          3],
  ["Aditya Jarangmula N.",    "aditya.jarangmula@chitraparatama.co.id",  "FINANCE",  "Information Technology",         "Supervisor IT",               "Manager",        3],
  ["Firmanto Setiyantoro",    "firmanto.setiyantoro@chitraparatama.co.id","FINANCE",  "Information Technology",         "IT Coordinator",              "Staff",          3],
  ["Gilang Suryo Wirawan",    "gilang.suryo@chitraparatama.co.id",       "FINANCE",  "Information Technology",         "IT Support",                  "Staff",          3],

  // ── HUMAN CAPITAL ──
  ["Rendra Rachman",          "rendra.rachman@chitraparatama.co.id",     "HC",       "Human Resources & GA",           "Manager Human Capital",       "Manager",        3],
  ["Muhammad Iqbal",          "muhammad.iqbal@chitraparatama.co.id",     "HC",       "Human Resources & GA",           "Supervisor HR-GA",            "Manager",        3],
  ["Putri R. Fitriana",       "putri.fitriana@chitraparatama.co.id",     "HC",       "Human Resources & GA",           "HR Development & Comben",     "Staff",          3],
  ["Kesuma Bagaskara",        "kesuma.bagaskara@chitraparatama.co.id",   "HC",       "Human Resources & GA",           "HR Operation & IR",           "Staff",          3],
  ["Adila Tri Arizona",       "adila.arizona@chitraparatama.co.id",      "HC",       "Human Resources & GA",           "HR Recruitment & GA",         "Staff",          3],
  ["Ridho Akmal S.",          "ridho.akmal@chitraparatama.co.id",        "HC",       "Training Center",                "Coordinator Training",        "Staff",          3],
  ["Aris Budi Santoso",       "aris.budi@chitraparatama.co.id",          "HC",       "Training Center",                "Trainer",                     "Staff",          3],
  ["Andi Safari",             "andi.safari@chitraparatama.co.id",        "HC",       "HSE",                            "Coordinator HSE",             "Staff",          3],
  ["Saipudin",                "saipudin@chitraparatama.co.id",           "HC",       "HSE",                            "HSE Leader",                  "Staff",          3],
  ["Danny Hangga I.",         "danny.hangga@chitraparatama.co.id",       "HC",       "HSE",                            "HSE Officer",                 "Staff",          3],
  ["Herlambang Wijaya K.",    "herlambang.wijaya@chitraparatama.co.id",  "HC",       "HSE",                            "HSE Officer",                 "Staff",          3],
  ["Irfan Rifai R.",          "irfan.rifai@chitraparatama.co.id",        "HC",       "HSE",                            "HSE Officer",                 "Staff",          3],
  ["M. Wahyu I.",             "wahyu.i@chitraparatama.co.id",            "HC",       "HSE",                            "HSE Officer",                 "Staff",          3],
  ["Ade Fazri",               "ade.fazri@chitraparatama.co.id",          "HC",       "HSE",                            "HSE Officer",                 "Staff",          3],
  ["Fathurrahman Sufi",       "fathurrahman.sufi@chitraparatama.co.id",  "HC",       "HSE",                            "HSE Officer",                 "Staff",          3],
  ["Ade Saharu",              "ade.saharu@chitraparatama.co.id",         "HC",       "HSE",                            "HSE Admin",                   "Staff",          3],
  ["Sugeng Wasiat",           "sugeng.wasiat@chitraparatama.co.id",      "HC",       "HSE",                            "HSE Reps HO",                 "Staff",          3],
  ["Tirta Risdianto",         "tirta.risdianto@chitraparatama.co.id",    "HC",       "Corporate Wellness",             "Supervisor Wellness",         "Manager",        3],

  // ── LEGAL & ERM ──
  ["Paulus Stupa Gumilang",   "paulus.stupa@chitraparatama.co.id",       "LEGAL",    "Legal & ERM",                    "Manager Legal & ERM",         "Manager",        3],
  ["Septi Dian Rahmawati",    "septi.dian@chitraparatama.co.id",         "LEGAL",    "Legal & ERM",                    "Legal & ERM Staff",           "Staff",          3],

  // ── SUPPLY CHAIN MANAGEMENT ──
  ["Bekti Widyasmoro",        "bekti.widyasmoro@chitraparatama.co.id",   "SUPPLY",   "Supply Chain Management",        "Manager Supply Chain",        "Manager",        3],
  ["Didik Yusdian",           "didik.yusdian@chitraparatama.co.id",      "SUPPLY",   "EXIM Compliance & Principal",    "Manager EXIM",                "Manager",        3],
  ["Ali Rahman",              "ali.rahman@chitraparatama.co.id",         "SUPPLY",   "Logistic Management",            "Supervisor Logistic",         "Manager",        3],
  ["Nico Saputra",            "nico.saputra@chitraparatama.co.id",       "SUPPLY",   "EXIM Compliance & Principal",    "Coordinator EXIM",            "Staff",          3],
  ["Sofyan Darmawan",         "sofyan.darmawan@chitraparatama.co.id",    "SUPPLY",   "EXIM Compliance & Principal",    "Staff EXIM",                  "Staff",          3],
  ["Abdul Rajab",             "abdul.rajab@chitraparatama.co.id",        "SUPPLY",   "Procurement",                    "Coordinator Procurement",     "Staff",          3],
  ["Sigit Ratriawan",         "sigit.ratriawan@chitraparatama.co.id",    "SUPPLY",   "Inventory",                      "Leader Inventory",            "Staff",          3],
  ["Sugeng Wasiat",           "sugeng.wasiat2@chitraparatama.co.id",     "SUPPLY",   "Billing",                        "Coordinator Billing",         "Staff",          3], // Concurrent with HSE
  ["Maulani",                 "maulani@chitraparatama.co.id",            "SUPPLY",   "Warehouse & Distribution",       "Coordinator Warehouse",       "Staff",          3],
  ["Karmiyanto",              "karmiyanto@chitraparatama.co.id",         "SUPPLY",   "Warehouse & Distribution",       "Leader Warehouse",            "Staff",          3],

  // ── OFFICE STRATEGIC MANAGEMENT ──
  ["Asep Firdaus",            "asep.firdaus@chitraparatama.co.id",       "DIRECTOR", "Office Strategic Management",    "Supervisor OSM",              "Manager",        3],

  // ── CPI & INTERNAL AUDIT ──
  ["Bardynia Susi E.",        "bardynia.susi@chitraparatama.co.id",      "CPI_IA",   "CPI & IA Reps",                  "Manager CPI & IA",            "Manager",        3],
  ["Ria Anissa Putri",        "ria.anissa@chitraparatama.co.id",         "CPI_IA",   "Quality Management",             "Staff Quality",               "Staff",          3],

  // ── SALES OPERATION ──
  ["Yean Alan Fabian",        "yean.alan@chitraparatama.co.id",          "SALES",    "National Sales",                 "Manager National Sales",      "Manager",        3],
  ["Agung Ari P.",            "agung.ari@chitraparatama.co.id",          "SALES",    "Major Account",                  "Manager Major Account",       "Manager",        3],
  ["Ocky Hegar Pratama",      "ocky.hegar@chitraparatama.co.id",         "SALES",    "Major Account",                  "Manager Major Account",       "Manager",        3],
  ["Ketut S. Wisnukepakisan", "ketut.wisnu@chitraparatama.co.id",        "SALES",    "Sales Kalimantan",               "Coordinator Sales Kalimantan","Staff",          4],
  ["Zulfikar",                "zulfikar@chitraparatama.co.id",           "SALES",    "Sales Kalimantan",               "Sales Kalimantan",            "Staff",          4],
  ["M. Ikbal Laisa",          "ikbal.laisa@chitraparatama.co.id",        "SALES",    "Sales Kalimantan",               "Sales Kalimantan",            "Staff",          4],
  ["Nur Sabrina",             "nur.sabrina@chitraparatama.co.id",        "SALES",    "Sales Kalimantan",               "Sales Kalimantan",            "Staff",          4],
  ["Bambang Irawan",          "bambang.irawan@chitraparatama.co.id",     "SALES",    "Sales Kalimantan",               "Sales Kalimantan",            "Staff",          4],
  ["Gregorius D. S.",         "gregorius.ds@chitraparatama.co.id",       "SALES",    "Major Account",                  "Sales Major Account",         "Staff",          3],
  ["Riki Darmawan",           "riki.darmawan@chitraparatama.co.id",      "SALES",    "Major Account",                  "Sales Major Account",         "Staff",          3],
  ["Michael Adrian",          "michael.adrian@chitraparatama.co.id",     "SALES",    "Major Account",                  "Coordinator Major Account",   "Staff",          3],
  ["Buri Antoni",             "buri.antoni@chitraparatama.co.id",        "SALES",    "Major Account",                  "Supervisor Major Account",    "Manager",        3],
  ["Harriz Ichwan",           "harriz.ichwan@chitraparatama.co.id",      "SALES",    "Major Account",                  "Sales Palembang",             "Staff",          3],
  ["Agung Purnomo",           "agung.purnomo@chitraparatama.co.id",      "SALES",    "Major Account",                  "Sales Admin",                 "Staff",          3],
  ["Riyandi Saputra",         "riyandi.saputra@chitraparatama.co.id",    "SALES",    "Major Account",                  "Warehouse & Sales Admin",     "Staff",          3],
  ["M. Furqon",               "m.furqon@chitraparatama.co.id",           "SALES",    "Sales Sulawesi & East Indonesia","Sales East Indonesia",        "Staff",          3],

  // ── CENTRAL SERVICES ──
  ["Romy Hidayat",            "romy.hidayat@chitraparatama.co.id",       "CENTRAL",  "Service Operation MVC",          "Manager Central Services",    "Manager",        3],
  ["Apriyanto",               "apriyanto@chitraparatama.co.id",          "CENTRAL",  "Service Operation MVC",          "Supervisor Service MVC",      "Manager",        3],
  ["Catur Keswanto",          "catur.keswanto@chitraparatama.co.id",     "CENTRAL",  "Service Operation MVC",          "Service Staff MVC",           "Staff",          5],
  ["Junaidi",                 "junaidi@chitraparatama.co.id",            "CENTRAL",  "Service Operation Others",       "Coordinator Service Others",  "Staff",          5],
  ["Rendi Asmari",            "rendi.asmari@chitraparatama.co.id",       "CENTRAL",  "Service Operation Others",       "Service Staff Others",        "Staff",          5],
  ["Ary Maulana",             "ary.maulana@chitraparatama.co.id",        "CENTRAL",  "Repair / Retread Operation",     "Leader Repair/Retread",       "Staff",          5],
  ["Renaldo",                 "renaldo@chitraparatama.co.id",            "CENTRAL",  "Repair / Retread Operation",     "Repair/Retread Planner",      "Staff",          5],
  ["Dedi Irawan",             "dedi.irawan@chitraparatama.co.id",        "CENTRAL",  "Repair / Retread Operation",     "Repair/Retread Staff",        "Staff",          5],
  ["Reza Iskandar",           "reza.iskandar@chitraparatama.co.id",      "CENTRAL",  "Repair / Retread Operation",     "Leader WsKPC",                "Staff",          5],
  ["Aris Susanto",            "aris.susanto@chitraparatama.co.id",       "CENTRAL",  "Repair / Retread Operation",     "Leader Ws Kabo",              "Staff",          5],
  ["M. Abian",                "m.abian@chitraparatama.co.id",            "CENTRAL",  "Technical",                      "Coordinator Technical",       "Staff",          5],
  ["Febrial Hariri",          "febrial.hariri@chitraparatama.co.id",     "CENTRAL",  "Technical",                      "Leader Technical Sumatra",    "Staff",          5],
  ["Tommy Indra Aldiny R.",   "tommy.indra@chitraparatama.co.id",        "CENTRAL",  "Technical",                      "Leader Technical South Kal",  "Staff",          4],
  ["Luthfi Mahendra Y.",      "luthfi.mahendra@chitraparatama.co.id",    "CENTRAL",  "Product Accessories",            "Coordinator Product Acc",     "Staff",          3],
  ["Fadjar Ismail",           "fadjar.ismail@chitraparatama.co.id",      "CENTRAL",  "Product Accessories",            "PA Coordinator",              "Staff",          3],
  ["Unggul H.",               "unggul.h@chitraparatama.co.id",           "CENTRAL",  "Product Accessories",            "PA Staff",                    "Staff",          3],
  ["Mustari",                 "mustari@chitraparatama.co.id",            "CENTRAL",  "Product Accessories",            "PA Staff",                    "Staff",          3],
  ["Khairul Indrawan",        "khairul.indrawan@chitraparatama.co.id",   "CENTRAL",  "Product Accessories",            "Technician",                  "Staff",          3],

  // ── SUPPORT FACILITIES MANAGEMENT ──
  ["Susanto",                 "susanto@chitraparatama.co.id",            "SUPPORT",  "Facility & Maintenance",         "Manager Support Facilities",  "Manager",        3],
  ["Didik Wahyudi",           "didik.wahyudi@chitraparatama.co.id",      "SUPPORT",  "Facility & Maintenance",         "Supervisor Facility",         "Manager",        3],
  ["Sandy Tj.",               "sandy.tj@chitraparatama.co.id",           "SUPPORT",  "Facility & Maintenance",         "Maintenance Leader",          "Staff",          5],
  ["Yudhi Santoso",           "yudhi.santoso@chitraparatama.co.id",      "SUPPORT",  "Facility & Maintenance",         "Maintenance & Electrical",    "Staff",          5],
  ["Pendi Krisdianto",        "pendi.krisdianto@chitraparatama.co.id",   "SUPPORT",  "Facility & Maintenance",         "Maintenance & Electrical",    "Staff",          5],
  ["Rahmat Khaerudin",        "rahmat.khaerudin@chitraparatama.co.id",   "SUPPORT",  "Facility & Maintenance",         "Maintenance & Electrical",    "Staff",          5],
  ["Fahrulroji B.C.",         "fahrulroji.bc@chitraparatama.co.id",      "SUPPORT",  "Facility & Maintenance",         "Maintenance & Electrical",    "Staff",          5],

  // ── EXISTING EMPLOYEES (keep as-is, ensure they're in org chart) ──
  // Mochamad Annas Khadafi — already exists (id=5), in Marketing & Corporate Comm section
  // Budi Santoso — already exists (id=8), map to Training Center as "Aris Budi Santoso"
  // Manajer — already exists (id=9), keep as is
];

// ─── ORG CHART NODE HIERARCHY ──────────────────────────────────────────────
// [label, sectionCode, parentKey, employeeName (or null)]
type NodeDef = [string, string, string | null, string | null];

const ORG_NODES: NodeDef[] = [
  // LEVEL 1: Director
  ["Director",              "Board Secretary",             null,               "Hidayat Rahman"],
  ["Board Secretary",       "Board Secretary",             "Director",          "Freshya Ochtovita"],
  ["General Manager",       "General Manager",             "Director",          "Person Sihaloho"],

  // LEVEL 2: Under General Manager
  ["Supply Chain Mgmt",     "Supply Chain Management",     "General Manager",   "Bekti Widyasmoro"],
  ["EXIM & Compliance",     "EXIM Compliance & Principal", "Supply Chain Mgmt", "Didik Yusdian"],
  ["Logistic Management",   "Logistic Management",         "Supply Chain Mgmt", "Ali Rahman"],
  ["EXIM Operations",       "EXIM Compliance & Principal", "Logistic Management","Nico Saputra"],
  ["Procurement",           "Procurement",                 "Logistic Management","Abdul Rajab"],
  ["Inventory",             "Inventory",                   "Logistic Management","Sigit Ratriawan"],
  ["Billing",               "Billing",                     "Logistic Management","Sugeng Wasiat"],
  ["Warehouse & Dist.",     "Warehouse & Distribution",    "Logistic Management","Maulani"],

  ["Office Strategic Mgmt", "Office Strategic Management", "General Manager",   "Asep Firdaus"],

  ["CPI & IA Reps",         "CPI & IA Reps",               "General Manager",   "Bardynia Susi E."],
  ["Quality Management",    "Quality Management",          "CPI & IA Reps",     "Ria Anissa Putri"],
  ["BP Improvement",        "CPI & IA Reps",               "CPI & IA Reps",     "Bardynia Susi E."],
  ["IA Representatives",    "CPI & IA Reps",               "CPI & IA Reps",     "Bardynia Susi E."],

  ["National Sales",        "National Sales",              "General Manager",   "Yean Alan Fabian"],
  ["Major Account 1",       "Major Account",               "National Sales",    "Agung Ari P."],
  ["Major Account 2",       "Major Account",               "National Sales",    "Ocky Hegar Pratama"],
  ["Sales Kalimantan",      "Sales Kalimantan",            "Major Account 2",   "Ketut S. Wisnukepakisan"],
  ["Sales Java",            "Major Account",               "Major Account 2",   "Michael Adrian"],
  ["Sales Palembang",       "Major Account",               "Major Account 2",   "Buri Antoni"],
  ["Sales Sulawesi & East", "Sales Sulawesi & East Indonesia","National Sales", "M. Furqon"],

  ["Central Services",      "Service Operation MVC",       "General Manager",   "Romy Hidayat"],
  ["Service MVC",           "Service Operation MVC",       "Central Services",  "Apriyanto"],
  ["Service Others",        "Service Operation Others",    "Central Services",  "Junaidi"],
  ["Repair/Retread",        "Repair / Retread Operation",  "Central Services",  "Ary Maulana"],
  ["Technical",             "Technical",                   "Central Services",  "M. Abian"],
  ["Product Accessories",   "Product Accessories",         "Central Services",  "Luthfi Mahendra Y."],

  ["Support Facilities",    "Facility & Maintenance",      "General Manager",   "Susanto"],
  ["Facility & Maint.",     "Facility & Maintenance",      "Support Facilities","Didik Wahyudi"],

  // LEVEL 2: Under Director (not GM)
  ["Finance BP",            "Finance Business Partner",    "Director",          "Febrian Dani"],
  ["Finance Support",       "Finance Support & External Relation","Finance BP","Selfiatu Zahroh"],
  ["Finance & Accounting",  "Finance & Accounting",        "Finance BP",        "Amama Ira Amalia P."],
  ["Treasury",              "Treasury",                    "Finance & Accounting","Meita Putri R."],
  ["Accounting & Asset",    "Accounting & Asset",          "Finance & Accounting","Syamsul Bahri"],
  ["Reporting & Budget",    "Reporting & Budget",          "Finance & Accounting","Amama Ira Amalia P."],
  ["Finance Operations",    "Finance Operations",          "Finance & Accounting","Dwi Astuti"],
  ["BI & Marketing",        "Business Innovation & Marketing","Finance BP",     "Arif Maulana G."],
  ["Marketing & Corp Comm", "Marketing & Corporate Comm",   "BI & Marketing",   "Andana G."],
  ["Database & Innovation", "Database & Innovation",        "BI & Marketing",   "Luthfi Saiful S."],
  ["Information Technology","Information Technology",       "BI & Marketing",   "Aditya Jarangmula N."],

  ["Human Capital",         "Human Resources & GA",        "Director",          "Rendra Rachman"],
  ["HR & GA",               "Human Resources & GA",        "Human Capital",     "Muhammad Iqbal"],
  ["Training Center",       "Training Center",             "Human Capital",     "Ridho Akmal S."],
  ["HSE",                   "HSE",                         "Human Capital",     "Andi Safari"],
  ["Corporate Wellness",    "Corporate Wellness",          "Human Capital",     "Tirta Risdianto"],

  ["Legal & ERM",           "Legal & ERM",                 "Director",          "Paulus Stupa Gumilang"],
];

// ─── SEED FUNCTION ──────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Seeding PT Chitra Paratama Org Chart...\n");

  // ── 1. Get site ──
  const allSites = await db.select().from(sites);
  if (allSites.length === 0) { console.error("❌ No site found. Create a site first."); process.exit(1); }
  console.log(`📍 Sites: ${allSites.map(s => s.name).join(", ")}`);

  // ── 2. Departments ── (ensure all needed departments exist)
  const newDepts = [
    { code: "MAN",  name: "Management",                     description: "Director Office & Management", isActive: true },
    { code: "HC",   name: "Human Capital",                  description: "Human Capital Department",     isActive: true },
    { code: "LEGAL",name: "Legal & ERM",                    description: "Legal & Enterprise Risk Mgmt", isActive: true },
    { code: "SCM",  name: "Supply Chain Dept",              description: "Supply Chain Management",      isActive: true },
    { code: "BC",   name: "Sales Operation",                description: "Sales Operation Department",   isActive: true },
    { code: "CEN",  name: "Central Services",               description: "Central Services Department",  isActive: true },
    { code: "SFM",  name: "Support Facilities Management",  description: "Support Facilities Mgmt",      isActive: true },
    { code: "BPI",  name: "CI & Audit",                     description: "Continuous Improvement & IA",  isActive: true },
    { code: "F-BIMA",name:"Finance Business Partner",       description: "Finance Business Partner",      isActive: true },
    { code: "BIMA", name: "BI & Marketing",                 description: "Business Innovation & Marketing",isActive: true },
  ];

  for (const d of newDepts) {
    const existing = await db.select().from(masterDepartments).where(eq(masterDepartments.code, d.code));
    if (existing.length === 0) {
      await db.insert(masterDepartments).values(d);
      console.log(`  ✅ Dept: ${d.code} — ${d.name}`);
    }
  }

  const deptRecords = await db.select().from(masterDepartments);
  const deptByCode = new Map(deptRecords.map(d => [d.code, d.id]));
  console.log(`  📊 ${deptRecords.length} departments total\n`);

  // ── 3. Sections ── (ensure all needed sections exist)
  for (const [key, { code, deptCode }] of Object.entries(SECTION_MAP)) {
    const deptId = deptByCode.get(deptCode) ?? null;
    const existing = await db.select().from(masterSections).where(eq(masterSections.code, code));
    if (existing.length === 0) {
      await db.insert(masterSections).values({ code, name: key, departmentId: deptId, description: "", isActive: true });
      console.log(`  ✅ Section: ${code} — ${key} (dept: ${deptCode})`);
    }
  }

  const sectionRecords = await db.select().from(masterSections);
  const sectionByCode = new Map(sectionRecords.map(s => [s.code, s.id]));
  console.log(`  📊 ${sectionRecords.length} sections total\n`);

  // ── 4. Positions ── (create generic positions by level)
  const positionDefs = [
    { code: "POS_DIRECTOR",   name: "Director",             level: 1, deptCode: "MAN" },
    { code: "POS_GM",         name: "General Manager",      level: 2, deptCode: "MAN" },
    { code: "POS_MGR",        name: "Manager",              level: 2, deptCode: null },
    { code: "POS_SR_SPV",     name: "Sr. Supervisor",       level: 3, deptCode: null },
    { code: "POS_SPV",        name: "Supervisor",           level: 3, deptCode: null },
    { code: "POS_COORD",      name: "Coordinator",          level: 4, deptCode: null },
    { code: "POS_LEADER",     name: "Leader",               level: 4, deptCode: null },
    { code: "POS_SR_STAFF",   name: "Sr. Staff",            level: 5, deptCode: null },
    { code: "POS_STAFF",      name: "Staff",                level: 5, deptCode: null },
    { code: "POS_ENGINEER",   name: "Engineer",             level: 5, deptCode: null },
    { code: "POS_TECHNICIAN", name: "Technician",           level: 5, deptCode: null },
  ];

  for (const p of positionDefs) {
    const existing = await db.select().from(masterPositions).where(eq(masterPositions.code, p.code));
    if (existing.length === 0) {
      await db.insert(masterPositions).values({
        code: p.code, name: p.name, level: p.level,
        departmentId: p.deptCode ? deptByCode.get(p.deptCode) ?? null : null,
        sectionId: null, siteLocation: "", description: "", isActive: true,
      });
    }
  }

  const positionRecords = await db.select().from(masterPositions);
  const positionByCode = new Map(positionRecords.map(p => [p.code, p.id]));
  console.log(`  📊 ${positionRecords.length} positions total\n`);

  // ── 5. Employees ──
  // Job title → position code mapping
  const jobToPosition: Record<string, string> = {
    "Director": "POS_DIRECTOR",
    "Board Secretary": "POS_MGR",
    "General Manager": "POS_GM",
  };
  function guessPositionCode(jobTitle: string): string {
    if (jobToPosition[jobTitle]) return jobToPosition[jobTitle];
    if (jobTitle.includes("Manager")) return "POS_MGR";
    if (jobTitle.includes("Supervisor")) return "POS_SPV";
    if (jobTitle.includes("Coordinator")) return "POS_COORD";
    if (jobTitle.includes("Leader")) return "POS_LEADER";
    if (jobTitle.includes("Engineer")) return "POS_ENGINEER";
    if (jobTitle.includes("Technician")) return "POS_TECHNICIAN";
    if (jobTitle.includes("Sr.") || jobTitle.includes("Senior")) return "POS_SR_STAFF";
    return "POS_STAFF";
  }

  let empCounter = 100;
  const employeeByName = new Map<string, number>(); // name → dbId

  for (const [name, email, deptKey, sectionKey, jobTitle, accessRole, siteId] of EMPLOYEE_SEEDS) {
    const existing = await db.select().from(employees).where(eq(employees.email, email));
    if (existing.length > 0) {
      employeeByName.set(name, existing[0].id);
      // Update department/section if needed
      const deptId = deptByCode.get(DEPT_MAP[deptKey as keyof typeof DEPT_MAP]) ?? null;
      const secCode = SECTION_MAP[sectionKey]?.code ?? null;
      const secId = secCode ? sectionByCode.get(secCode) ?? null : null;
      const posCode = guessPositionCode(jobTitle);
      const posId = positionByCode.get(posCode) ?? null;

      await db.update(employees).set({
        departmentId: deptId,
        sectionId: secId,
        positionId: posId,
        department: deptKey,
        section: sectionKey,
        jobTitle,
        role: accessRole,
        siteId,
        accessRole,
      }).where(eq(employees.id, existing[0].id));
      continue;
    }

    const deptId = deptByCode.get(DEPT_MAP[deptKey as keyof typeof DEPT_MAP]) ?? null;
    const secCode = SECTION_MAP[sectionKey]?.code ?? null;
    const secId = secCode ? sectionByCode.get(secCode) ?? null : null;
    const posCode = guessPositionCode(jobTitle);
    const posId = positionByCode.get(posCode) ?? null;

    const [emp] = await db.insert(employees).values({
      siteId,
      name,
      email,
      employeeSn: `EMP-${String(++empCounter).padStart(3, "0")}`,
      role: accessRole,
      department: deptKey,
      section: sectionKey,
      jobTitle,
      departmentId: deptId,
      sectionId: secId,
      positionId: posId,
      accessRole,
      joinYear: 2026,
      employmentStatus: "active",
      employeeStatusType: "Permanen | Staff",
      birthPlaceDate: "",
      domicile: "",
      phoneNumber: "",
      workLocation: "",
      levelName: "Rookie",
      totalPoints: 0,
      fitStatus: "fit",
      isActive: true,
    }).returning();
    employeeByName.set(name, emp.id);
  }

  const allEmps = await db.select().from(employees);
  // Also add existing employees to the map
  for (const e of allEmps) {
    if (!employeeByName.has(e.name)) {
      employeeByName.set(e.name, e.id);
    }
  }
  console.log(`  📊 ${employeeByName.size} employees (${allEmps.length} total in DB)\n`);

  // ── 6. Org Chart Structure ──
  // Delete existing "PT Chitra Paratama" structure
  await db.delete(orgChartStructures).where(eq(orgChartStructures.name, "PT Chitra Paratama Org Structure"));
  const [structure] = await db.insert(orgChartStructures).values({
    name: "PT Chitra Paratama Org Structure",
    scopeType: "custom",
    scopeValue: "",
    version: 1,
    effectiveFrom: new Date("2026-01-01"),
    effectiveTo: null,
    isDefault: true,
    description: "Organization Structure effective 1 January 2026",
    isActive: true,
  }).returning();
  console.log(`  ✅ Org Structure: ${structure.name} (id=${structure.id})\n`);

  // ── 7. Org Chart Nodes ──
  await db.delete(orgChartNodes).where(eq(orgChartNodes.structureId, structure.id));
  const nodeByLabel = new Map<string, number>(); // label → dbId
  let sortOrder = 0;

  for (const [label, sectionKey, parentLabel, employeeName] of ORG_NODES) {
    const secCode = SECTION_MAP[sectionKey]?.code ?? null;
    const secId = secCode ? sectionByCode.get(secCode) ?? null : null;
    const empId = employeeName ? employeeByName.get(employeeName) ?? null : null;
    const parentNodeId = parentLabel ? nodeByLabel.get(parentLabel) ?? null : null;

    // Get position from employee's job
    let posId: number | null = null;
    if (empId) {
      const empRecord = allEmps.find(e => e.id === empId);
      if (empRecord?.positionId) posId = empRecord.positionId;
    }

    const [node] = await db.insert(orgChartNodes).values({
      structureId: structure.id,
      parentNodeId,
      positionId: posId,
      employeeId: empId,
      nodeCode: `N${String(++sortOrder).padStart(3, "0")}`,
      nodeType: "position",
      approvalRole: "",
      canApprove: false,
      canDelegate: true,
      isEscalationTarget: false,
      slaHours: 24,
      label,
      sortOrder,
      isActive: true,
    }).returning();
    nodeByLabel.set(label, node.id);
  }
  console.log(`  ✅ ${nodeByLabel.size} org chart nodes created\n`);

  // ── 8. Org Node Assignments ──
  await db.delete(orgNodeAssignments).where(
    and(eq(orgNodeAssignments.nodeId, 0), isNull(orgNodeAssignments.id)) // placeholder
  );
  // Delete all for this structure's nodes
  const nodeIds = Array.from(nodeByLabel.values());
  for (const nid of nodeIds) {
    await db.delete(orgNodeAssignments).where(eq(orgNodeAssignments.nodeId, nid));
  }

  let assignCount = 0;
  for (const [label, , , employeeName] of ORG_NODES) {
    if (!employeeName) continue;
    const nodeId = nodeByLabel.get(label);
    const empId = employeeByName.get(employeeName);
    if (!nodeId || !empId) continue;

    await db.insert(orgNodeAssignments).values({
      nodeId,
      employeeId: empId,
      assignmentType: "primary",
      notes: "",
      effectiveFrom: new Date("2026-01-01"),
      effectiveTo: null,
      isActive: true,
    });
    assignCount++;
  }
  console.log(`  ✅ ${assignCount} node assignments created\n`);

  console.log("🎉 Seed complete! PT Chitra Paratama Org Chart ready.");
}

main().catch(err => { console.error("❌ Seed failed:", err); process.exit(1); }).finally(() => process.exit(0));
