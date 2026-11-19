export type IndonesiaHoliday = {
  date: string;
  name: string;
  localName: string;
  sourceId: string | null;
  types: unknown;
  nationwide: boolean;
  rawPayload: unknown;
};

type OpenHolidayName = { language?: string; text?: string };
type OpenHolidayItem = {
  id?: string;
  startDate?: string;
  endDate?: string;
  name?: OpenHolidayName[];
  nationwide?: boolean;
  subdivisions?: unknown[];
  types?: unknown;
  type?: unknown;
};
type ApiHariLiburItem = {
  date?: string;
  description?: string;
  name?: string;
};
type ApiHariLiburResponse = {
  data?: ApiHariLiburItem[];
};

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function pickName(names: OpenHolidayName[] | undefined, language: string) {
  return names?.find((item) => item.language?.toLowerCase() === language.toLowerCase())?.text ?? names?.[0]?.text ?? "Hari Libur Nasional";
}

export function normalizeOpenHolidayResponse(items: OpenHolidayItem[]): IndonesiaHoliday[] {
  return items.flatMap((item) => {
    const startDate = item.startDate;
    if (!startDate) return [];
    const endDate = item.endDate ?? startDate;
    const localName = pickName(item.name, "ID");
    const name = pickName(item.name, "EN") || localName;
    const days: IndonesiaHoliday[] = [];
    let cursor = startDate;

    while (cursor <= endDate) {
      days.push({
        date: cursor,
        name,
        localName,
        sourceId: item.id ?? null,
        types: item.types ?? item.type ?? [],
        nationwide: item.nationwide ?? !item.subdivisions?.length,
        rawPayload: item,
      });
      cursor = addDays(cursor, 1);
    }

    return days;
  });
}

export function normalizeApiHariLiburResponse(input: ApiHariLiburItem[] | ApiHariLiburResponse): IndonesiaHoliday[] {
  const items = Array.isArray(input) ? input : Array.isArray(input.data) ? input.data : [];

  return items.flatMap((item) => {
    if (!item.date) return [];
    const localName = (item.description || item.name || "Hari Libur Nasional").trim();
    if (localName.toLowerCase().includes("cuti bersama")) return [];

    return [{
      date: item.date,
      name: localName,
      localName,
      sourceId: item.date,
      types: [],
      nationwide: true,
      rawPayload: item,
    }];
  });
}

export function getKnownFixedIndonesiaHolidays(year: number): IndonesiaHoliday[] {
  return [
    { date: `${year}-01-01`, name: 'Tahun Baru Masehi', localName: 'Tahun Baru Masehi', sourceId: `${year}-01-01`, types: [], nationwide: true, rawPayload: null },
    { date: `${year}-05-01`, name: 'Hari Buruh Internasional', localName: 'Hari Buruh Internasional', sourceId: `${year}-05-01`, types: [], nationwide: true, rawPayload: null },
    { date: `${year}-06-01`, name: 'Hari Lahir Pancasila', localName: 'Hari Lahir Pancasila', sourceId: `${year}-06-01`, types: [], nationwide: true, rawPayload: null },
    { date: `${year}-08-17`, name: 'Hari Kemerdekaan RI', localName: 'Hari Kemerdekaan RI', sourceId: `${year}-08-17`, types: [], nationwide: true, rawPayload: null },
    { date: `${year}-12-25`, name: 'Hari Raya Natal', localName: 'Hari Raya Natal', sourceId: `${year}-12-25`, types: [], nationwide: true, rawPayload: null },
  ];
}

export async function fetchIndonesiaHolidays(year: number): Promise<IndonesiaHoliday[]> {
  // 1. Primary: api-hari-libur
  try {
    const params = new URLSearchParams({ year: String(year) });
    const url = `https://api-hari-libur.vercel.app/api?${params.toString()}`;
    let response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });

    if (!response.ok && response.status !== 402 && response.status !== 404) {
      await generateApiHariLiburYear(year);
      response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    }

    if (response.ok) {
      const data = await response.json();
      const holidays = normalizeApiHariLiburResponse(data);
      if (holidays.length > 0) return holidays;
    }
  } catch (error) {
    console.warn('[fetchIndonesiaHolidays] api-hari-libur unavailable, falling back:', error instanceof Error ? error.message : error);
  }

  // 2. Secondary fallback: Nager.Date API
  try {
    const nagerUrl = `https://date.nager.at/api/v3/PublicHolidays/${year}/ID`;
    const response = await fetch(nagerUrl, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => {
          const localName = (item.localName || item.name || 'Hari Libur Nasional').trim();
          return {
            date: item.date,
            name: (item.name || localName).trim(),
            localName,
            sourceId: item.date,
            types: item.types || [],
            nationwide: item.global ?? true,
            rawPayload: item,
          };
        });
      }
    }
  } catch (error) {
    console.warn('[fetchIndonesiaHolidays] Nager.Date fallback unavailable:', error instanceof Error ? error.message : error);
  }

  // 3. Fallback: Known fixed annual Indonesian holidays
  return getKnownFixedIndonesiaHolidays(year);
}

async function generateApiHariLiburYear(year: number) {
  try {
    await fetch("https://api-hari-libur.vercel.app/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year }),
      cache: "no-store",
    });
  } catch {
  }
}
