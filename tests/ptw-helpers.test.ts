import assert from 'node:assert/strict'
import {
  normalizePermitType,
  normalizePermitTypes,
  getActivePermitTypeKeys,
  getDefaultEquipmentItems,
  isItemChecked,
  HIRADC_PRESETS,
  PERMIT_TYPE_OPTIONS,
  EQUIPMENT_CHECKLIST_PER_TYPE,
  getDefaultSubTypes,
  getPermitSubTypes,
} from '../lib/ptw-helpers.ts'

test('PTW Helpers - normalizePermitType', () => {
  assert.equal(normalizePermitType('Hot Work'), 'Hot Work Permit')
  assert.equal(normalizePermitType('Confined Space'), 'Confined Space Permit')
  assert.equal(normalizePermitType('HW-01'), 'Hot Work Permit')
  assert.equal(normalizePermitType('CS-01'), 'Confined Space Permit')
  assert.equal(normalizePermitType('Electrical/Mechanical'), 'Electrical/Mechanical')
  assert.equal(normalizePermitType('Cold Permit'), 'Cold Permit')
})

test('PTW Helpers - normalizePermitTypes (Multi-select)', () => {
  assert.equal(normalizePermitTypes('Hot Work, Confined Space'), 'Hot Work Permit, Confined Space Permit')
  assert.equal(normalizePermitTypes('HW-01, CS-01'), 'Hot Work Permit, Confined Space Permit')
  assert.equal(normalizePermitTypes('Digging Permit'), 'Digging Permit')
})

test('PTW Helpers - getActivePermitTypeKeys', () => {
  const keys = getActivePermitTypeKeys('Hot Work, Confined Space')
  assert.deepEqual(keys, ['Hot Work Permit', 'Confined Space Permit'])
})

test('PTW Helpers - getDefaultEquipmentItems', () => {
  const items = getDefaultEquipmentItems('Hot Work Permit')
  assert.ok(items.length > 0)
  assert.ok(items.includes('Tersedia APAR'))
})

test('PTW Helpers - isItemChecked (Number Prefix Stripping & Matching)', () => {
  const checkedEquipment = ['Tersedia APAR', 'Breathing Set diperlukan ?', 'Hand glove']

  // Unprefixed vs Prefixed matching
  assert.equal(isItemChecked('2. Tersedia APAR', checkedEquipment), true)
  assert.equal(isItemChecked('Tersedia APAR', checkedEquipment), true)
  assert.equal(isItemChecked('1. Breathing Set diperlukan ?', checkedEquipment), true)
  assert.equal(isItemChecked('5. Hand glove', checkedEquipment), true)
  assert.equal(isItemChecked('Respirator', checkedEquipment), false)
  assert.equal(isItemChecked('7. Respirator', checkedEquipment), false)
})

test('PTW Helpers - subTypes defaults and custom overrides', () => {
  const defaults = getDefaultSubTypes()
  assert.ok(defaults['Hot Work Permit'].includes('Welding'))
  assert.ok(defaults['Hot Work Permit'].includes('Cutting torch'))
  assert.ok(defaults['Hot Work Permit'].includes('Grinding'))
  assert.ok(defaults['Hot Work Permit'].includes('Brazing'))
  assert.ok(defaults['Confined Space Permit'].includes('Pekerjaan Tangki'))
  assert.ok(defaults['Confined Space Permit'].includes('Chute'))
  assert.ok(defaults['Confined Space Permit'].includes('Sewer / Saluran air'))
  assert.ok(defaults['Digging Permit'].includes('Penggalian parit'))
  assert.ok(defaults['Digging Permit'].includes('Pembuatan pondasi'))

  // Custom subTypes overrides
  const custom = {
    'Hot Work Permit': ['Welding Pipa 4 inch', 'Custom Grinding'],
  }
  const hwSubTypes = getPermitSubTypes('Hot Work Permit', custom)
  assert.deepEqual(hwSubTypes, ['Welding Pipa 4 inch', 'Custom Grinding'])

  // Fallback to default when not in custom
  const csSubTypes = getPermitSubTypes('Confined Space Permit', custom)
  assert.ok(csSubTypes.includes('Pekerjaan Tangki'))
})

test('PTW Helpers - HIRADC Presets Have Normalized Permit Types', () => {
  for (const preset of HIRADC_PRESETS) {
    const activeKeys = getActivePermitTypeKeys(preset.permitType)
    assert.ok(activeKeys.length > 0, `Preset ${preset.value} must resolve to valid permit types`)
    for (const key of activeKeys) {
      assert.ok(EQUIPMENT_CHECKLIST_PER_TYPE[key], `Permit type ${key} must exist in EQUIPMENT_CHECKLIST_PER_TYPE`)
    }
  }
})

