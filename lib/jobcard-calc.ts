export interface MaterialSummaryItem {
  name: string;
  qty: string;
  uom: string;
}

export function parseInjuryRemarks(text: string): {
  countMayor: number;
  countMinor: number;
  isValidFormat: boolean;
  hasInput: boolean;
} {
  const trimmed = (text || '').trim().toLowerCase();
  if (!trimmed) {
    return { countMayor: 0, countMinor: 0, isValidFormat: true, hasInput: false };
  }

  let countMayor: number | null = null;
  let countMinor: number | null = null;

  const regex = /(\d+\s*x?\s*(?:mayor|major|minor)|(?:mayor|major|minor)\s*[:=\-x]?\s*\d+)/gi;
  const matches = trimmed.match(regex);

  if (matches) {
    matches.forEach((part) => {
      const p = part.trim();
      const numMatch = p.match(/\d+/);
      if (!numMatch) return;
      const num = parseInt(numMatch[0], 10);

      if (p.includes('mayor') || p.includes('major')) {
        countMayor = num;
      } else if (p.includes('minor')) {
        countMinor = num;
      }
    });
  }

  if (countMayor === null && countMinor === null) {
    return { countMayor: 0, countMinor: 0, isValidFormat: false, hasInput: true };
  }

  return {
    countMayor: countMayor ?? 0,
    countMinor: countMinor ?? 0,
    isValidFormat: true,
    hasInput: true,
  };
}

export function parseDurationToMinutes(hoursStr?: string | number | null): number {
  if (!hoursStr) return 0;
  const str = String(hoursStr).trim().toLowerCase();
  if (!str || str === '-' || str === '0') return 0;

  const val = parseFloat(str.replace(',', '.'));
  if (isNaN(val)) return 0;

  if (str.includes('min') || str.includes('m')) {
    return val;
  }
  if (str.includes('jam') || str.includes('hr') || str.includes('h')) {
    return val * 60;
  }
  // Default assuming decimal hours e.g. 1.5 -> 90 mins, 0.5 -> 30 mins
  if (val <= 24) {
    return Math.round(val * 60);
  }
  return val;
}

export function parseQtyAndUnit(qtyStr: string): { num: number; unit: string } {
  const raw = (qtyStr || '').trim();
  if (!raw) return { num: 0, unit: 'PC' };

  const match = raw.match(/^([\d.,]+)\s*(.*)$/);
  if (!match) return { num: 0, unit: raw.toUpperCase() || 'PC' };

  const numVal = parseFloat(match[1].replace(',', '.')) || 0;
  let rawUnit = (match[2] || '').trim().toUpperCase();

  if (!rawUnit) rawUnit = 'PC';
  if (rawUnit === 'GR' || rawUnit === 'GRAM' || rawUnit === 'G' || rawUnit === 'GRAMS') {
    rawUnit = 'gr';
  } else if (rawUnit === 'KG' || rawUnit === 'KILOGRAM') {
    rawUnit = 'kg';
  } else if (rawUnit === 'ML' || rawUnit === 'MILLILITER') {
    rawUnit = 'ml';
  } else if (rawUnit === 'PCS' || rawUnit === 'PC' || rawUnit === 'BUAH') {
    rawUnit = 'pcs';
  }

  return { num: numVal, unit: rawUnit };
}

export function computeMaterialSummary(injuries?: any[]): MaterialSummaryItem[] {
  if (!injuries || injuries.length === 0) return [];

  // Group by: `${processName} - ${materialName}`
  const map = new Map<
    string,
    {
      processName: string;
      materialName: string;
      grams: number;
      ml: number;
      pcs: number;
      otherNums: number[];
      otherUnit: string;
    }
  >();

  injuries.forEach((inj) => {
    inj.processes?.forEach((p: any) => {
      const matName = (p.materialUsed || '').trim();
      if (!matName || matName === '-' || matName === '0') return;

      const procName = (p.processName || '').trim();
      const groupKey = `${procName} - ${matName}`;

      const { num, unit } = parseQtyAndUnit(p.qty);

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          processName: procName,
          materialName: matName,
          grams: 0,
          ml: 0,
          pcs: 0,
          otherNums: [],
          otherUnit: '',
        });
      }

      const entry = map.get(groupKey)!;
      const u = unit.toLowerCase();

      if (u === 'gr' || u === 'gram' || u === 'g') {
        entry.grams += num;
      } else if (u === 'kg') {
        entry.grams += num * 1000;
      } else if (u === 'ml') {
        entry.ml += num;
      } else if (u === 'liter' || u === 'l') {
        entry.ml += num * 1000;
      } else if (u === 'pcs' || u === 'pc') {
        entry.pcs += num;
      } else {
        entry.otherNums.push(num);
        if (!entry.otherUnit) entry.otherUnit = unit;
      }
    });
  });

  const result: MaterialSummaryItem[] = [];

  map.forEach((entry, groupKey) => {
    if (entry.grams > 0) {
      const displayQty = entry.grams >= 1000 ? `${(entry.grams / 1000).toFixed(1)}` : `${entry.grams}`;
      const displayUom = entry.grams >= 1000 ? 'kg' : 'gr';
      result.push({
        name: groupKey,
        qty: displayQty,
        uom: displayUom,
      });
    } else if (entry.ml > 0) {
      const displayQty = entry.ml >= 1000 ? `${(entry.ml / 1000).toFixed(1)}` : `${entry.ml}`;
      const displayUom = entry.ml >= 1000 ? 'L' : 'ml';
      result.push({
        name: groupKey,
        qty: displayQty,
        uom: displayUom,
      });
    } else if (entry.pcs > 0) {
      result.push({
        name: groupKey,
        qty: `${entry.pcs}`,
        uom: 'pcs',
      });
    } else if (entry.otherNums.length > 0) {
      const totalNum = entry.otherNums.reduce((acc, n) => acc + n, 0);
      result.push({
        name: groupKey,
        qty: `${totalNum}`,
        uom: entry.otherUnit || 'PC',
      });
    }
  });

  return result;
}

export interface GroupedProcessRow {
  processName: string;
  injuriesLabel: string;
  materialUsed: string;
  qty: string;
  durationMin: number;
  manpower: string;
}

export function computeGroupedProcessRows(injuries?: any[]): GroupedProcessRow[] {
  if (!injuries || injuries.length === 0) return [];

  const DEFAULT_PROCESS_NAMES = [
    'Skiving',
    'Buffing',
    'Cementing',
    'Buffing Innerliner',
    'Install Patch',
    'Built Up',
    'Curing',
    'Finishing',
    'Painting',
  ];

  const map = new Map<
    string,
    {
      displayProcessName: string;
      injuriesSet: Set<string>;
      dimensionsList: string[];
      materialsMap: Map<string, { grams: number; ml: number; pcs: number; otherNums: number[]; otherUnit: string }>;
      totalMinutes: number;
      manpowerMap: Map<string, string>;
    }
  >();

  DEFAULT_PROCESS_NAMES.forEach((pName) => {
    map.set(pName.toLowerCase(), {
      displayProcessName: pName,
      injuriesSet: new Set(),
      dimensionsList: [],
      materialsMap: new Map(),
      totalMinutes: 0,
      manpowerMap: new Map(),
    });
  });

  injuries.forEach((inj) => {
    const injName = inj.injuryName || 'Injury';
    const injDimStr = (inj.dimensiLukaL || inj.dimensiLukaW || inj.dimensiLukaP || inj.dimensiLukaT)
      ? `L${inj.dimensiLukaL || '0'},W${inj.dimensiLukaW || '0'},P${inj.dimensiLukaP || '0'},T${inj.dimensiLukaT || '0'}`
      : '';

    (inj.processes || []).forEach((p: any) => {
      const pName = (p.processName || '').trim();
      if (!pName) return;

      const key = pName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          displayProcessName: pName,
          injuriesSet: new Set(),
          dimensionsList: [],
          materialsMap: new Map(),
          totalMinutes: 0,
          manpowerMap: new Map(),
        });
      }

      const item = map.get(key)!;
      item.injuriesSet.add(injName);
      if (injDimStr && !item.dimensionsList.includes(injDimStr)) {
        item.dimensionsList.push(injDimStr);
      }

      // Minutes
      const mins = parseDurationToMinutes(p.hours);
      item.totalMinutes += mins;

      // Material & Qty
      const matRaw = (p.materialUsed || '').trim();
      if (matRaw && matRaw !== '-' && matRaw !== '0') {
        const matTokens = matRaw.includes(',') ? matRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : [matRaw];

        matTokens.forEach((mat: string) => {
          const matKey = mat.toLowerCase();
          if (!item.materialsMap.has(matKey)) {
            item.materialsMap.set(matKey, { grams: 0, ml: 0, pcs: 0, otherNums: [], otherUnit: '' });
          }
          const mEntry = item.materialsMap.get(matKey)!;
          const { num, unit } = parseQtyAndUnit(p.qty);
          const u = unit.toLowerCase();

          if (u === 'gr' || u === 'gram' || u === 'g') {
            mEntry.grams += num;
          } else if (u === 'kg') {
            mEntry.grams += num * 1000;
          } else if (u === 'ml') {
            mEntry.ml += num;
          } else if (u === 'liter' || u === 'l') {
            mEntry.ml += num * 1000;
          } else if (u === 'pcs' || u === 'pc') {
            mEntry.pcs += num;
          } else {
            mEntry.otherNums.push(num);
            if (!mEntry.otherUnit) mEntry.otherUnit = unit;
          }
        });
      }

      // Manpower
      const rawByWhom = (p.byWhom || '').trim();
      if (rawByWhom && rawByWhom !== '-' && rawByWhom !== '0') {
        rawByWhom.split(/[,/&]+/).forEach((t: string) => {
          const cleaned = t.trim();
          if (cleaned && cleaned !== '-' && cleaned !== '0') {
            item.manpowerMap.set(cleaned.toLowerCase(), cleaned);
          }
        });
      }
    });
  });

  const result: GroupedProcessRow[] = [];

  map.forEach((item) => {
    let injuriesLabel = Array.from(item.injuriesSet).join(', ') || '-';
    if (item.dimensionsList.length > 0) {
      injuriesLabel += `: ${item.dimensionsList.join(' / ')}`;
    }

    const matParts: string[] = [];
    const qtyParts: string[] = [];

    item.materialsMap.forEach((mEntry, matKey) => {
      const displayMatName = matKey.toUpperCase();
      matParts.push(displayMatName);

      if (mEntry.grams > 0) {
        const displayQty = mEntry.grams >= 1000 ? `${(mEntry.grams / 1000).toFixed(1)}kg` : `${mEntry.grams}g`;
        qtyParts.push(displayQty);
      } else if (mEntry.ml > 0) {
        const displayQty = mEntry.ml >= 1000 ? `${(mEntry.ml / 1000).toFixed(1)}L` : `${mEntry.ml}ml`;
        qtyParts.push(displayQty);
      } else if (mEntry.pcs > 0) {
        qtyParts.push(`${mEntry.pcs} pcs`);
      } else if (mEntry.otherNums.length > 0) {
        const totalNum = mEntry.otherNums.reduce((a, b) => a + b, 0);
        qtyParts.push(`${totalNum} ${mEntry.otherUnit}`);
      }
    });

    const materialUsed = matParts.join(', ') || '-';
    const qty = qtyParts.join(', ') || '0';
    const manpower = Array.from(item.manpowerMap.values()).join(', ') || '-';

    result.push({
      processName: item.displayProcessName,
      injuriesLabel,
      materialUsed,
      qty,
      durationMin: item.totalMinutes,
      manpower,
    });
  });

  return result;
}

export function computeTotalJobcardMinutes(injuries?: any[]): number {
  if (!injuries || injuries.length === 0) return 0;
  let totalMinutes = 0;
  injuries.forEach((inj) => {
    inj.processes?.forEach((p: any) => {
      totalMinutes += parseDurationToMinutes(p.hours);
    });
  });
  return totalMinutes;
}

export function computeDeduplicatedManpower(injuries?: any[]): string {
  if (!injuries || injuries.length === 0) return '-';
  const nameMap = new Map<string, string>();

  injuries.forEach((inj) => {
    inj.processes?.forEach((p: any) => {
      const raw = (p.byWhom || '').trim();
      if (!raw || raw === '-' || raw === '0') return;

      const tokens = raw.split(/[,/&]+/);
      tokens.forEach((t: string) => {
        const cleaned = t.trim();
        if (!cleaned || cleaned === '-' || cleaned === '0') return;
        const key = cleaned.toLowerCase();
        if (!nameMap.has(key)) {
          nameMap.set(key, cleaned);
        }
      });
    });
  });

  if (nameMap.size === 0) return '-';
  return Array.from(nameMap.values()).join(', ');
}
