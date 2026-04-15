const INDONESIAN_MONTH_MAP: Record<string, number> = {
  januari: 1,
  february: 2,
  februari: 2,
  march: 3,
  maret: 3,
  april: 4,
  may: 5,
  mei: 5,
  june: 6,
  juni: 6,
  july: 7,
  juli: 7,
  august: 8,
  agustus: 8,
  september: 9,
  october: 10,
  oktober: 10,
  november: 11,
  december: 12,
  desember: 12,
};

const birthDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function buildUtcDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function parseBirthDateValue(rawValue: string) {
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return null;
  }

  const value = trimmedValue.includes(",")
    ? trimmedValue.split(",").at(-1)?.trim() || trimmedValue
    : trimmedValue;

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return buildUtcDate(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3]),
    );
  }

  const localizedMatch = value.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (localizedMatch) {
    const month = INDONESIAN_MONTH_MAP[localizedMatch[2].toLowerCase()];

    if (month) {
      return buildUtcDate(
        Number(localizedMatch[3]),
        month,
        Number(localizedMatch[1]),
      );
    }
  }

  const slashMatch = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (slashMatch) {
    return buildUtcDate(
      Number(slashMatch[3]),
      Number(slashMatch[2]),
      Number(slashMatch[1]),
    );
  }

  const fallbackDate = new Date(value);
  if (Number.isNaN(fallbackDate.getTime())) {
    return null;
  }

  return buildUtcDate(
    fallbackDate.getUTCFullYear(),
    fallbackDate.getUTCMonth() + 1,
    fallbackDate.getUTCDate(),
  );
}

export function getBirthDateInputValue(rawValue: string) {
  const date = parseBirthDateValue(rawValue);

  if (!date) {
    return "";
  }

  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function normalizeBirthDateValue(rawValue: string) {
  const trimmedValue = rawValue.trim();

  if (!trimmedValue) {
    return "";
  }

  const date = parseBirthDateValue(trimmedValue);

  return date ? birthDateFormatter.format(date) : trimmedValue;
}
