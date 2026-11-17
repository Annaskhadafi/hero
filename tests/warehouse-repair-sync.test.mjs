import test from "node:test"
import assert from "node:assert/strict"
import { DEFAULT_REPAIR_SITES } from "../lib/repair-master.ts"

test("14 official site repair codes match the SLoc cheatsheet exactly", () => {
  assert.equal(DEFAULT_REPAIR_SITES.length, 14, "Must have exactly 14 site repair codes")

  const expectedCodes = [
    "0201",
    "0202",
    "0203",
    "0204",
    "0205",
    "0206",
    "CONS",
    "RS01",
    "RS02",
    "RS03",
    "RS04",
    "RS07",
    "RS08",
    "RS14",
  ]

  const actualCodes = DEFAULT_REPAIR_SITES.map((s) => s.siteCode)
  assert.deepEqual(actualCodes, expectedCodes)

  const rs02 = DEFAULT_REPAIR_SITES.find((s) => s.siteCode === "RS02")
  assert.equal(rs02?.siteName, "CP Sangatta", "RS02 must be CP Sangatta")

  const rs01 = DEFAULT_REPAIR_SITES.find((s) => s.siteCode === "RS01")
  assert.equal(rs01?.siteName, "CP Balikpapan", "RS01 must be CP Balikpapan")

  const c0201 = DEFAULT_REPAIR_SITES.find((s) => s.siteCode === "0201")
  assert.equal(c0201?.siteName, "CP BUMA TANJUNG")
})
