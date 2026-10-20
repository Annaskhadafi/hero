import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateActivityGrouping,
  normalizeGroupName,
  cleanUnitNumber,
} from '../lib/ewh/calculate-activity-grouping'

test('normalizeGroupName trims and falls back to Lainnya', () => {
  assert.equal(normalizeGroupName('Tyre Service'), 'Tyre Service')
  assert.equal(normalizeGroupName('   '), 'Lainnya')
  assert.equal(normalizeGroupName(null), 'Lainnya')
  assert.equal(normalizeGroupName(undefined), 'Lainnya')
})

test('cleanUnitNumber trims and returns uppercase non-empty string or null', () => {
  assert.equal(cleanUnitNumber('dt-001'), 'DT-001')
  assert.equal(cleanUnitNumber('  ex200  '), 'EX200')
  assert.equal(cleanUnitNumber(''), null)
  assert.equal(cleanUnitNumber('   '), null)
  assert.equal(cleanUnitNumber(null), null)
})

test('calculateActivityGrouping correctly aggregates tire and unit counts', () => {
  const sampleItems = [
    {
      sessionId: 1,
      snapshotGroupName: 'Tyre Service',
      snapshotLabel: 'R&I Wheel',
      tireCount: 4,
      unitNumber: 'DT01',
    },
    {
      sessionId: 1,
      snapshotGroupName: 'Tyre Service',
      snapshotLabel: 'R&I Wheel',
      tireCount: 2,
      unitNumber: 'DT02',
    },
    {
      sessionId: 2,
      snapshotGroupName: 'Tyre Service',
      snapshotLabel: 'Tyre Pressure Check',
      tireCount: 6,
      unitNumber: 'DT01',
    },
    {
      sessionId: 2,
      snapshotGroupName: 'Inspection',
      snapshotLabel: 'Visual Check',
      tireCount: 0,
      unitNumber: 'EX05',
    },
    {
      sessionId: 3,
      snapshotGroupName: null, // should fallback to 'Lainnya'
      snapshotLabel: 'General Briefing',
      tireCount: 0,
      unitNumber: '', // no unit
    },
  ]

  const result = calculateActivityGrouping(sampleItems)

  // Overall check
  assert.equal(result.overall.totalGroups, 3) // 'Tyre Service', 'Inspection', 'Lainnya'
  assert.equal(result.overall.totalTireCount, 12) // 4 + 2 + 6 + 0 + 0
  assert.equal(result.overall.totalUnitCount, 3) // 'DT01', 'DT02', 'EX05'
  assert.equal(result.overall.totalItems, 5)
  assert.deepEqual(result.overall.allUnits, ['DT01', 'DT02', 'EX05'])

  // Tyre Service group check
  const tyreGroup = result.groups.find((g) => g.groupName === 'Tyre Service')
  assert.ok(tyreGroup)
  assert.equal(tyreGroup.totalTireCount, 12)
  assert.equal(tyreGroup.totalUnitCount, 2) // DT01 and DT02
  assert.equal(tyreGroup.itemCount, 3)
  assert.deepEqual(tyreGroup.units, ['DT01', 'DT02'])

  // Activities within Tyre Service
  assert.equal(tyreGroup.activities.length, 2)
  const riWheel = tyreGroup.activities.find((a) => a.activityLabel === 'R&I Wheel')
  assert.ok(riWheel)
  assert.equal(riWheel.tireCount, 6) // 4 + 2
  assert.equal(riWheel.unitCount, 2) // DT01, DT02
  assert.equal(riWheel.itemCount, 2)

  const pressureCheck = tyreGroup.activities.find((a) => a.activityLabel === 'Tyre Pressure Check')
  assert.ok(pressureCheck)
  assert.equal(pressureCheck.tireCount, 6)
  assert.equal(pressureCheck.unitCount, 1) // DT01
  assert.equal(pressureCheck.itemCount, 1)

  // Lainnya group check
  const lainnyaGroup = result.groups.find((g) => g.groupName === 'Lainnya')
  assert.ok(lainnyaGroup)
  assert.equal(lainnyaGroup.totalTireCount, 0)
  assert.equal(lainnyaGroup.totalUnitCount, 0)
  assert.equal(lainnyaGroup.itemCount, 1)
})

test('calculateActivityGrouping handles empty items gracefully', () => {
  const result = calculateActivityGrouping([])
  assert.equal(result.groups.length, 0)
  assert.equal(result.overall.totalGroups, 0)
  assert.equal(result.overall.totalTireCount, 0)
  assert.equal(result.overall.totalUnitCount, 0)
  assert.equal(result.overall.totalItems, 0)
  assert.deepEqual(result.overall.allUnits, [])
})
