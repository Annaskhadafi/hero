import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  autoMapTrainingRecordHeaders,
  parseTrainingRecordCsv,
  getTrainingRecordImportValue,
  TRAINING_RECORD_EXAMPLE_CSV,
  TRAINING_RECORD_IMPORT_FIELDS,
} from "@/lib/training-record-import";
import { trainingRecords } from "@/db/schema/hero";

describe("Training Record Tanggal & Bulan Feature", () => {
  it("should have completedDate and completedMonth in schema", () => {
    assert.ok(trainingRecords.completedDate, "completedDate exists in schema");
    assert.ok(trainingRecords.completedMonth, "completedMonth exists in schema");
    assert.ok(trainingRecords.completedYear, "completedYear exists in schema");
  });

  it("should have completedDate and completedMonth in TRAINING_RECORD_IMPORT_FIELDS", () => {
    const dateField = TRAINING_RECORD_IMPORT_FIELDS.find((f) => f.key === "completedDate");
    const monthField = TRAINING_RECORD_IMPORT_FIELDS.find((f) => f.key === "completedMonth");

    assert.ok(dateField, "dateField found");
    assert.equal(dateField?.label, "Tanggal");
    assert.ok(dateField?.aliases.includes("tanggal"));
    assert.ok(dateField?.aliases.includes("training date"));

    assert.ok(monthField, "monthField found");
    assert.equal(monthField?.label, "Bulan");
    assert.ok(monthField?.aliases.includes("bulan"));
    assert.ok(monthField?.aliases.includes("month"));
  });

  it("should auto-map standard and Indonesian aliases for Tanggal and Bulan", () => {
    const headers = [
      "No",
      "Nama Karyawan",
      "Department",
      "Training / Program",
      "Provider / Vendor",
      "Tanggal",
      "Bulan",
      "Tahun",
      "Expired At",
      "Status",
    ];

    const mapping = autoMapTrainingRecordHeaders(headers);

    assert.equal(mapping.trainingName, "Training / Program");
    assert.equal(mapping.provider, "Provider / Vendor");
    assert.equal(mapping.completedDate, "Tanggal");
    assert.equal(mapping.completedMonth, "Bulan");
    assert.equal(mapping.completedYear, "Tahun");
  });

  it("should parse TRAINING_RECORD_EXAMPLE_CSV and extract Tanggal and Bulan correctly", () => {
    const parsed = parseTrainingRecordCsv(TRAINING_RECORD_EXAMPLE_CSV);
    assert.equal(parsed.records.length, 2);

    const mapping = autoMapTrainingRecordHeaders(parsed.headers);
    assert.equal(mapping.completedDate, "Tanggal");
    assert.equal(mapping.completedMonth, "Bulan");

    const row1 = parsed.records[0];
    assert.equal(getTrainingRecordImportValue(row1, mapping, "trainingName"), "Basic Safety");
    assert.equal(getTrainingRecordImportValue(row1, mapping, "completedDate"), "15");
    assert.equal(getTrainingRecordImportValue(row1, mapping, "completedMonth"), "Januari");
    assert.equal(getTrainingRecordImportValue(row1, mapping, "completedYear"), "2024");

    const row2 = parsed.records[1];
    assert.equal(getTrainingRecordImportValue(row2, mapping, "trainingName"), "Rigging & Slinging");
    assert.equal(getTrainingRecordImportValue(row2, mapping, "completedDate"), "20");
    assert.equal(getTrainingRecordImportValue(row2, mapping, "completedMonth"), "Februari");
    assert.equal(getTrainingRecordImportValue(row2, mapping, "completedYear"), "2025");
  });

  it("should support custom mapping override for non-standard column names", () => {
    const customCsv = [
      "ID,Peserta,Nama Kursus,Lembaga,Tgl Pelaksanaan,Bln Pelaksanaan,Thn Pelaksanaan",
      '"001","Andi","K3 Umum","Megatrain","10-03-2024","Maret","2024"',
    ].join("\n");

    const parsed = parseTrainingRecordCsv(customCsv);
    const baseMapping = autoMapTrainingRecordHeaders(parsed.headers);

    // User custom mapping from UI dropdowns
    const userMapping = {
      employeeName: "Peserta",
      trainingName: "Nama Kursus",
      provider: "Lembaga",
      completedDate: "Tgl Pelaksanaan",
      completedMonth: "Bln Pelaksanaan",
      completedYear: "Thn Pelaksanaan",
    };

    const finalMapping = { ...baseMapping, ...userMapping };

    const row = parsed.records[0];
    assert.equal(getTrainingRecordImportValue(row, finalMapping, "employeeName"), "Andi");
    assert.equal(getTrainingRecordImportValue(row, finalMapping, "trainingName"), "K3 Umum");
    assert.equal(getTrainingRecordImportValue(row, finalMapping, "provider"), "Megatrain");
    assert.equal(getTrainingRecordImportValue(row, finalMapping, "completedDate"), "10-03-2024");
    assert.equal(getTrainingRecordImportValue(row, finalMapping, "completedMonth"), "Maret");
    assert.equal(getTrainingRecordImportValue(row, finalMapping, "completedYear"), "2024");
  });
});
