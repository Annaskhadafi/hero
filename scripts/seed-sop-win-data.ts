import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

const INITIAL_DOCS = [
  {
    documentNumber: "WIN.SVC_.SEM-022.02",
    title: "Penggunaan dan Pemeliharaan Impact Wrench",
    documentType: "WIN",
    departmentCode: "SERVICE",
    currentRevision: "02",
    pdfFileUrl: "https://vision.chitraparatama.com/api/v1/uploads/b973fc3d25_WIN.SVC_.SEM-022.02-Impact-Wrench.pdf",
    ragDocumentId: "24d3ca4c-494c-41f9-95c5-a9114de05b7a",
    summary: "Instruksi kerja standar pengoperasian, keselamatan, dan perawatan impact wrench pada unit kendaraan operasional.",
    effectiveDate: "2025-06-11",
    changeDescription: "Pembaruan standar torsi dan APD wajib saat pengoperasian impact wrench.",
  },
  {
    documentNumber: "WIN.SVC_.SEM-021.02",
    title: "Prosedur Penggunaan Hydraulic Jack Stand EDMO",
    documentType: "WIN",
    departmentCode: "SERVICE",
    currentRevision: "02",
    pdfFileUrl: "https://vision.chitraparatama.com/api/v1/uploads/90e29b3eac_WIN.SVC_.SEM-021.02-Hydraulic-Jack-Stand-EDMO.pdf",
    ragDocumentId: "c7bc5ca5-dea3-4fbc-b39f-734048ca37ba",
    summary: "Instruksi kerja penempatan, penguncian pin, dan kapasitas beban hydraulic jack stand EDMO.",
    effectiveDate: "2025-06-11",
    changeDescription: "Revisi prosedur inspeksi berkala silinder hidrolik dan sertifikasi tahunan.",
  },
  {
    documentNumber: "WIN.SVC_.SEM-020.02",
    title: "Prosedur Pengoperasian Hydraulic Jack",
    documentType: "WIN",
    departmentCode: "SERVICE",
    currentRevision: "02",
    pdfFileUrl: "https://vision.chitraparatama.com/api/v1/uploads/7da62a9f24_WIN.SVC_.SEM-020.02-Hydraulic-Jack.pdf",
    ragDocumentId: "c2464ce6-922d-439f-bb0e-ff8a249ec2f0",
    summary: "Instruksi kerja langkah demi langkah pengangkatan unit dump truck menggunakan hydraulic jack dengan aman.",
    effectiveDate: "2025-06-11",
    changeDescription: "Penyempurnaan titik tumpu jacking point pada unit HD785 dan 777D.",
  },
  {
    documentNumber: "SOP.SVC_.MAT-002.00",
    title: "Standar Prosedur Permintaan Material dan Alat Service",
    documentType: "SOP",
    departmentCode: "FAM",
    currentRevision: "00",
    pdfFileUrl: "https://vision.chitraparatama.com/api/v1/uploads/2ca6255cd9_SOP.SVC_.MAT-002.00-Permintaan-Material-dan-alat-SignedHR-11Jun25.pdf",
    ragDocumentId: "8a3679aa-3730-42e3-8a96-abc64d78894a",
    summary: "Alur pengajuan material, suku cadang, dan peminjaman alat khusus service ke bagian logistik / gudang.",
    effectiveDate: "2025-06-11",
    changeDescription: "Rilis perdana SOP Permintaan Material & Alat Service.",
  },
  {
    documentNumber: "SOP.OPS.TBR-001.00",
    title: "SOP Pekerjaan Ban Truck dan Bus (TBR)",
    documentType: "SOP",
    departmentCode: "RETREAD",
    currentRevision: "00",
    pdfFileUrl: "https://vision.chitraparatama.com/api/v1/uploads/7d24205518_SOP-pekerjaan-Ban-truck-and-Bus-SignedHR-11Aug25.pdf",
    ragDocumentId: "479ca321-d364-43a9-9faf-b143485202bf",
    summary: "Prosedur standar operasional pembongkaran, inspeksi karkas, perbaikan, dan pemasangan ban Truck and Bus.",
    effectiveDate: "2025-08-11",
    changeDescription: "Rilis dokumen standar teknis penanganan ban TBR.",
  },
  {
    documentNumber: "SOP.OPS.OTR-001.00",
    title: "SOP Pekerjaan Ban Earthmover (OTR / OTR Mining)",
    documentType: "SOP",
    departmentCode: "RETREAD",
    currentRevision: "00",
    pdfFileUrl: "https://vision.chitraparatama.com/api/v1/uploads/ec92ace51d_SOP-Pekerjaan-ban-Earthmover-SignedHR-11Aug25.pdf",
    ragDocumentId: "463fc728-db70-40ca-ad7e-4a70237fd146",
    summary: "Prosedur keselamatan dan operasional penanganan ban raksasa Earthmover di area workshop dan pit tambang.",
    effectiveDate: "2025-08-11",
    changeDescription: "Rilis standar operasional OTR Mining.",
  },
  {
    documentNumber: "POL.TC.MIC-001.00",
    title: "Data Teknis Resmi Michelin Earthmover Tires & Operational Guidelines",
    documentType: "POL",
    departmentCode: "TC",
    currentRevision: "00",
    pdfFileUrl: "https://vision.chitraparatama.com/api/v1/uploads/a59c97112a_2025-04MICHELIN-TechnicalDataEarthmoverTires-Original.pdf",
    ragDocumentId: "3ee8dab5-02d0-491a-ba2d-49a5df4d8639",
    summary: "Panduan dan kebijakan teknis operasional beban, TKPH, tekanan angin, dan spesifikasi model ban Michelin.",
    effectiveDate: "2025-04-01",
    changeDescription: "Rilis buku panduan dan kebijakan teknis Michelin Earthmover.",
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log("Checking existing SOP/WIN documents...");
    const existing = await client.query("SELECT COUNT(*) FROM hero_sop_win_documents");
    if (parseInt(existing.rows[0].count, 10) > 0) {
      console.log(`Already have ${existing.rows[0].count} documents in DB. Skipping seed.`);
      return;
    }

    // Get an employee id for owner
    const empRes = await client.query("SELECT id FROM hero_employees ORDER BY id ASC LIMIT 1");
    const ownerId = empRes.rows.length > 0 ? empRes.rows[0].id : null;

    for (const doc of INITIAL_DOCS) {
      const insertDoc = await client.query(
        `INSERT INTO hero_sop_win_documents (
          document_number, title, document_type, department_code, owner_employee_id,
          current_revision, status, pdf_file_url, rag_document_id, summary, effective_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()) RETURNING id`,
        [
          doc.documentNumber,
          doc.title,
          doc.documentType,
          doc.departmentCode,
          ownerId,
          doc.currentRevision,
          "active",
          doc.pdfFileUrl,
          doc.ragDocumentId,
          doc.summary,
          doc.effectiveDate,
        ]
      );

      const newId = insertDoc.rows[0].id;

      // Insert revision 00
      await client.query(
        `INSERT INTO hero_sop_win_revisions (
          document_id, revision_number, effective_date, change_description, pdf_file_url, rag_document_id, revised_by_employee_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          newId,
          doc.currentRevision,
          doc.effectiveDate,
          doc.changeDescription,
          doc.pdfFileUrl,
          doc.ragDocumentId,
          ownerId,
        ]
      );
    }

    console.log(`Seeded ${INITIAL_DOCS.length} initial SOP/WIN documents successfully!`);
  } catch (err) {
    console.error("Seed error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
