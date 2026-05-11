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

export async function fetchIndonesiaHolidays(year: number) {
  const params = new URLSearchParams({ year: String(year) });
  const url = `https://api-hari-libur.vercel.app/api?${params.toString()}`;
  let response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    await generateApiHariLiburYear(year);
    response = await fetch(url, { cache: "no-store" });
  }

  if (!response.ok) throw new Error(`Hari libur sync failed (${response.status})`);
  const data = await response.json();
  const holidays = normalizeApiHariLiburResponse(data);

  if (holidays.length === 0) {
    await generateApiHariLiburYear(year);
    const generatedResponse = await fetch(url, { cache: "no-store" });
    if (generatedResponse.ok) return normalizeApiHariLiburResponse(await generatedResponse.json());
  }

  return holidays;
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
