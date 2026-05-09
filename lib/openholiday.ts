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

export async function fetchIndonesiaHolidays(year: number) {
  const params = new URLSearchParams({
    countryIsoCode: "ID",
    languageIsoCode: "ID",
    validFrom: `${year}-01-01`,
    validTo: `${year}-12-31`,
  });
  const response = await fetch(`https://openholidaysapi.org/PublicHolidays?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`OpenHoliday sync failed (${response.status})`);
  const data = await response.json();
  return normalizeOpenHolidayResponse(Array.isArray(data) ? data : []);
}
