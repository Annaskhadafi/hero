export const PERMIT_TYPE_OPTIONS = [
  { value: 'Hot Work Permit', label: 'Hot Work Permit' },
  { value: 'Confined Space Permit', label: 'Confined Space Permit' },
  { value: 'Digging Permit', label: 'Digging Permit' },
  { value: 'Cold Permit', label: 'Cold Permit' },
  { value: 'Electrical/Mechanical', label: 'Electrical/Mechanical' },
]

export const EQUIPMENT_CHECKLIST_PER_TYPE: Record<
  string,
  {
    subTypes?: string[]
    subHeader: string
    items: Array<{ id: string; label: string }>
  }
> = {
  'Hot Work Permit': {
    subTypes: ['Welding', 'Cutting torch', 'Grinding', 'Brazing'],
    subHeader: 'Sebelum pekerjaan dilakukan terlebih dahulu menyiapkan peralatan tersebut di bawah ini.',
    items: [
      { id: 'hw_1', label: 'Daerah kerja bebas dari bahan yang mudah terbakar' },
      { id: 'hw_2', label: 'Tersedia APAR' },
      { id: 'hw_3', label: 'Apakah daerah kerja dilokalisir?' },
      { id: 'hw_4', label: 'Welding Glove' },
      { id: 'hw_5', label: 'Welding Cloth/Appron' },
      { id: 'hw_6', label: 'Face Shield' },
      { id: 'hw_7', label: 'Respirator' },
    ],
  },
  'Confined Space Permit': {
    subTypes: ['Pekerjaan Tangki', 'Chute', 'Sewer / Saluran air'],
    subHeader: 'Sebelum pekerjaan dilakukan terlebih dahulu menyiapkan peralatan tersebut di bawah ini.',
    items: [
      { id: 'cs_1', label: 'Breathing Set diperlukan ?' },
      { id: 'cs_2', label: 'Disposal Respirator' },
      { id: 'cs_3', label: 'Peralatan digunakan telah bebas dari percikan api' },
      { id: 'cs_4', label: 'Safety harnes & lifeline diperlukan ?' },
      { id: 'cs_5', label: 'Ventilasi telah memadai?' },
      { id: 'cs_6', label: 'Pemeriksaan O2 dilakukan ?' },
    ],
  },
  'Digging Permit': {
    subTypes: ['Penggalian parit', 'Pembuatan pondasi', 'Penggalian jalur kabel listrik/telepon', 'Penggalian jalur pipa air'],
    subHeader: 'Sebelum pekerjaan dilakukan terlebih dahulu menyiapkan peralatan tersebut di bawah ini.',
    items: [
      { id: 'dp_1', label: 'Peta / gambar tersedia ?' },
      { id: 'dp_2', label: 'Penggalian dilakukan dengan Alat?' },
      { id: 'dp_3', label: 'Penggalian dilakukan dengan manual?' },
      { id: 'dp_4', label: 'Tanda / baricade telah tersedia?' },
      { id: 'dp_5', label: 'Hand glove' },
    ],
  },
  'Cold Permit': {
    subTypes: ['Perbaikan Drainase', 'Pembuatan pondasi', 'Penggalian jalur kabel listrik/telepon', 'Penggalian jalur pipa air'],
    subHeader: 'Sebelum pekerjaan dilakukan terlebih dahulu menyiapkan peralatan tersebut di bawah ini.',
    items: [
      { id: 'cp_1', label: 'Peralatan dalam kondisi baik' },
      { id: 'cp_2', label: 'Penggunaan material yang sesuai' },
      { id: 'cp_3', label: 'Pekerjaan dilakukan dengan manual?' },
      { id: 'cp_4', label: 'Tanda / baricade telah tersedia?' },
      { id: 'cp_5', label: 'APD yang sesuai pekerjaan' },
    ],
  },
  'Electrical/Mechanical': {
    subTypes: ['Instalasi Kabel Instrumen Boiler'],
    subHeader: 'Sebelum pekerjaan dilakukan terlebih dahulu menyiapkan peralatan tersebut di bawah ini.',
    items: [
      { id: 'em_1', label: 'Apakah tersedia body Harnes untuk pekerjaaan ketinggian ?' },
      { id: 'em_2', label: 'Apakah tersedia alat potong kupas kabel yang layak?' },
      { id: 'em_3', label: 'Apakah tersedia tester yang layak?' },
      { id: 'em_4', label: 'Apakah tersedia apar di area kerja?' },
      { id: 'em_5', label: 'APD yang sesuai pekerjaan' },
    ],
  },
}

export const HIRADC_PRESETS = [
  {
    label: 'Pengelasan Rangka Dump Body / Hot Work',
    value: 'HW-01',
    permitType: 'Hot Work Permit',
    location: 'Tire Repair Bay',
    area: 'Welding Bay Sector Timur',
    riskLevel: 'High',
    description: 'Pekerjaan pengelasan struktur baja dan pemotongan plat logam menggunakan blender potong.',
    controlSteps: '1. APAR 2x6kg standby dalam jarak 3 meter.\n2. Fire blanket terpasang menutup area sekitar.\n3. Barricade safety line 10m radius.\n4. Gas test gas leak check sebelum penyalaan api.',
    ppe: ['Helmet', 'Safety Shoes', 'Face Shield', 'Welding Gloves', 'Safety Glasses'],
  },
  {
    label: 'Pembersihan Evaporator / Confined Space Silo',
    value: 'CS-01',
    permitType: 'Confined Space Permit',
    location: 'Silo Material Kering No. 3',
    area: 'Tire Repair Bay - Sector Utara',
    riskLevel: 'Critical',
    description: 'Mengeluarkan sisa material yang menggumpal di area corong silo bawah dan inspeksi manual keretakan dinding bagian dalam.',
    controlSteps: '1. Gas test O2, LEL, H2S, CO sebelum masuk.\n2. Blower aktif selama pekerjaan.\n3. Hole watcher standby.\n4. Full body harness dan rescue line wajib.\n5. LOTO area inlet dan outlet.',
    ppe: ['Helmet', 'Safety Shoes', 'Respirator', 'Full Body Harness'],
  },
  {
    label: 'Penggantian OTR Tyre 57 Inch / Cold & Lifting Work',
    value: 'LO-01',
    permitType: 'Cold Permit',
    location: 'Heavy Equipment Bay',
    area: 'Bay 4 Lifting Area',
    riskLevel: 'High',
    description: 'Operasi pengangkatan ban tyre raksasa menggunakan crane overhead 10 ton.',
    controlSteps: '1. Rigging gear check certificate.\n2. Rigger certified standby.\n3. Tag line terpasang.\n4. Radius ayunan crane steril dari pekerja non-terkait.',
    ppe: ['Helmet', 'Safety Shoes', 'Leather Gloves', 'Safety Glasses'],
  },
  {
    label: 'Maintenance Panel & Instalasi Listrik Workshop',
    value: 'EM-01',
    permitType: 'Electrical/Mechanical',
    location: 'Panel Utama Workshop Central',
    area: 'Substation Bay 1',
    riskLevel: 'High',
    description: 'Perbaikan jalur breaker listrik utama dan penggantian kabel grounding panel.',
    controlSteps: '1. LOTO terpasang pada saklar utama.\n2. Tes tegangan dengan multimeter terkalibrasi.\n3. Sarung tangan isolasi listrik wajib.',
    ppe: ['Helmet', 'Safety Shoes', 'Safety Glasses', 'Leather Gloves'],
  },
]

export function normalizePermitType(typeStr: string): string {
  if (!typeStr) return 'Cold Permit'
  const upper = typeStr.trim().toUpperCase()
  if (upper.includes('HOT') || upper.startsWith('HW-')) return 'Hot Work Permit'
  if (upper.includes('CONFINED') || upper.startsWith('CS-')) return 'Confined Space Permit'
  if (upper.includes('DIGGING') || upper.startsWith('DP-') || upper.startsWith('DG-')) return 'Digging Permit'
  if (upper.includes('COLD') || upper.startsWith('CP-')) return 'Cold Permit'
  if (upper.includes('ELECTRICAL') || upper.includes('MECHANICAL') || upper.startsWith('EM-')) return 'Electrical/Mechanical'
  return typeStr.trim()
}

export function normalizePermitTypes(typeStr: string): string {
  if (!typeStr) return 'Cold Permit'
  const rawParts = typeStr
    .split(/[,;\.]/)
    .map((s) => s.trim())
    .filter(Boolean)

  if (rawParts.length === 0) return 'Cold Permit'

  const normalized = rawParts.map(normalizePermitType)
  const unique = Array.from(new Set(normalized))
  return unique.join(', ')
}

export function getActivePermitTypeKeys(permitTypeStr: string): string[] {
  const normalizedStr = normalizePermitTypes(permitTypeStr)
  return normalizedStr.split(', ').map((t) => t.trim()).filter(Boolean)
}

export function getDefaultEquipmentItems(permitTypeStr: string): string[] {
  const keys = getActivePermitTypeKeys(permitTypeStr)
  const result: string[] = []
  for (const k of keys) {
    const data = EQUIPMENT_CHECKLIST_PER_TYPE[k]
    if (data && data.items) {
      for (const item of data.items) {
        result.push(item.label)
      }
    }
  }
  return Array.from(new Set(result))
}

export function extractCheckedEquipment(
  controlSteps?: string | null,
  checkedEquipment?: string[] | null,
  permitType?: string | null
): string[] {
  if (Array.isArray(checkedEquipment) && checkedEquipment.length > 0) {
    const isOnlyApd = checkedEquipment.every((item) =>
      [
        'Safety Helmet',
        'Helmet',
        'Safety Shoes',
        'Safety Glasses / Goggles',
        'Safety Glasses',
        'Ear Plug / Ear Muff',
        'Dust Mask / Respirator',
        'Reflective Vest',
        'Face Shield',
        'Full Body Harness',
        'Welding Gloves',
        'Leather Gloves',
        'Chemical Gloves',
        'Respirator',
      ].includes(item)
    )
    if (!isOnlyApd) {
      return checkedEquipment
    }
  }

  if (controlSteps && typeof controlSteps === 'string') {
    const lines = controlSteps
      .split('\n')
      .map((l) => l.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter((l) => l.length > 0 && !l.startsWith('[Referensi HIRADC:'))
    if (lines.length > 0) {
      return lines
    }
  }

  if (permitType) {
    return getDefaultEquipmentItems(permitType)
  }

  return []
}

export function isItemChecked(itemLabel: string, checkedList: string[]): boolean {
  if (!checkedList || checkedList.length === 0) return false

  // Direct match
  if (checkedList.includes(itemLabel)) return true

  // Strip leading numbering e.g., "1. " or "hw_1"
  const cleanLabel = itemLabel.replace(/^\d+\.\s*/, '').trim().toLowerCase()

  return checkedList.some((c) => {
    const cleanC = c.replace(/^\d+\.\s*/, '').trim().toLowerCase()
    return cleanC === cleanLabel || cleanC.includes(cleanLabel) || cleanLabel.includes(cleanC)
  })
}

export function getDefaultSubTypes(permitTypeStr?: string): Record<string, string[]> {
  const defaults: Record<string, string[]> = {}
  for (const [key, val] of Object.entries(EQUIPMENT_CHECKLIST_PER_TYPE)) {
    defaults[key] = [...(val.subTypes || [])]
  }
  return defaults
}

export function getPermitSubTypes(
  permitType: string,
  customSubTypes?: Record<string, string[]> | string[] | null
): string[] {
  const normKey = normalizePermitType(permitType)
  if (customSubTypes) {
    if (!Array.isArray(customSubTypes) && typeof customSubTypes === 'object') {
      if (Array.isArray(customSubTypes[normKey]) && customSubTypes[normKey].length > 0) {
        return customSubTypes[normKey]
      }
      if (Array.isArray(customSubTypes[permitType]) && customSubTypes[permitType].length > 0) {
        return customSubTypes[permitType]
      }
    } else if (Array.isArray(customSubTypes) && customSubTypes.length > 0) {
      return customSubTypes
    }
  }
  return EQUIPMENT_CHECKLIST_PER_TYPE[normKey]?.subTypes || EQUIPMENT_CHECKLIST_PER_TYPE[permitType]?.subTypes || []
}

export type ParsedApplicant = {
  name: string
  email: string
  company?: string
  isExternalVendor: boolean
  displayLabel: string
}

export function parseApplicantEntry(raw: string): ParsedApplicant {
  const trimmed = (raw || '').trim()
  if (!trimmed) {
    return { name: '', email: '', isExternalVendor: false, displayLabel: '' }
  }

  // Format 1: "Name <email@example.com>"
  const angleMatch = trimmed.match(/^([^<]+)<([^>]+)>$/)
  if (angleMatch) {
    const name = angleMatch[1].trim()
    const email = angleMatch[2].trim()
    return {
      name,
      email,
      isExternalVendor: true,
      displayLabel: `${name} (${email})`,
    }
  }

  // Format 2: "Name (Vendor: company - email@example.com)" or "Name (Vendor: email@example.com)" or "Name (email@example.com)"
  const parenMatch = trimmed.match(/^([^(]+)\(([^)]+)\)$/)
  if (parenMatch) {
    const name = parenMatch[1].trim()
    const inner = parenMatch[2].trim()
    const emailMatch = inner.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
    if (emailMatch) {
      const email = emailMatch[1]
      const company = inner.replace(email, '').replace(/^vendor:?/i, '').replace(/[-:]/g, '').trim()
      return {
        name,
        email,
        company: company || undefined,
        isExternalVendor: true,
        displayLabel: company ? `${name} [${company}] (${email})` : `${name} (${email})`,
      }
    }
  }

  // Format 3: "Name [Vendor: email@example.com]"
  const bracketMatch = trimmed.match(/^([^[]+)\[([^\]]+)\]$/)
  if (bracketMatch) {
    const name = bracketMatch[1].trim()
    const inner = bracketMatch[2].trim()
    const emailMatch = inner.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
    if (emailMatch) {
      const email = emailMatch[1]
      const company = inner.replace(email, '').replace(/^vendor:?/i, '').replace(/[-:]/g, '').trim()
      return {
        name,
        email,
        company: company || undefined,
        isExternalVendor: true,
        displayLabel: company ? `${name} [${company}] (${email})` : `${name} (${email})`,
      }
    }
  }

  // Format 4: Check if string has email anywhere e.g. "Name - email@gmail.com"
  const genericEmailMatch = trimmed.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
  if (genericEmailMatch) {
    const email = genericEmailMatch[1]
    const name = trimmed.replace(email, '').replace(/[-—()<>\[\]]/g, '').trim()
    return {
      name: name || email,
      email,
      isExternalVendor: true,
      displayLabel: `${name || email} (${email})`,
    }
  }

  // Otherwise, standard internal employee name
  const cleanName = trimmed.includes(' — ') ? trimmed.split(' — ')[0].trim() : trimmed
  return {
    name: cleanName,
    email: '',
    isExternalVendor: false,
    displayLabel: cleanName,
  }
}

export function formatVendorApplicantEntry(name: string, email: string, company?: string): string {
  const cleanName = name.trim()
  const cleanEmail = email.trim()
  const cleanCompany = company?.trim()
  if (cleanCompany) {
    return `${cleanName} (Vendor: ${cleanCompany} - ${cleanEmail})`
  }
  return `${cleanName} (Vendor: ${cleanEmail})`
}

export function cleanPtwDescription(description?: string | null): string {
  if (!description) return ''
  return description.replace(/\[Referensi HIRADC:[^\]]+\]\s*/g, '').trim()
}


