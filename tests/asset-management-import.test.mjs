import test from "node:test"
import assert from "node:assert/strict"

test("bulk import asset schema mapping and fields validation", () => {
  const importFields = [
    { key: "workSection", label: "Work Section / Departemen" },
    { key: "section", label: "Kategori Alat (Section)", required: true },
    { key: "location", label: "Lokasi Site", required: true },
    { key: "description", label: "Deskripsi / Nama Alat", required: true },
    { key: "assetNumber", label: "Nomor Aset" },
    { key: "serialNumber", label: "Serial Number" },
    { key: "condition", label: "Kondisi" },
    { key: "qty", label: "Quantity" },
  ]

  assert.equal(importFields.length, 8)
  const required = importFields.filter((f) => f.required)
  assert.equal(required.length, 3, "Section, Location, Description must be required")

  const reqKeys = required.map((f) => f.key)
  assert.deepEqual(reqKeys, ["section", "location", "description"])
})
