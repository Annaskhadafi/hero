type SiteBoundaryInput = {
  geoLatitude?: string | null;
  geoLongitude?: string | null;
  geoRadiusMeters?: number | string | null;
};

export type BoundaryValidationResult = {
  status: "inside" | "outside" | "unconfigured" | "unknown";
  gpsValid: boolean;
  message: string;
  distanceMeters: number | null;
  radiusMeters: number | null;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function haversineDistanceMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
) {
  const earthRadius = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const latDelta = toRadians(toLatitude - fromLatitude);
  const lngDelta = toRadians(toLongitude - fromLongitude);
  const startLat = toRadians(fromLatitude);
  const endLat = toRadians(toLatitude);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function validateSiteBoundary(
  site: SiteBoundaryInput | null | undefined,
  latitude: number | null,
  longitude: number | null,
  fallbackRadiusMeters = 500,
): BoundaryValidationResult {
  if (latitude == null || longitude == null) {
    return {
      status: "unknown",
      gpsValid: false,
      message: "GPS belum terkunci. Pakai lokasi manual untuk fallback.",
      distanceMeters: null,
      radiusMeters: null,
    };
  }

  const siteLatitude = toNumber(site?.geoLatitude);
  const siteLongitude = toNumber(site?.geoLongitude);
  const radiusMeters = toNumber(site?.geoRadiusMeters) ?? fallbackRadiusMeters;

  if (siteLatitude == null || siteLongitude == null) {
    return {
      status: "unconfigured",
      gpsValid: false,
      message: "Boundary site belum dikonfigurasi admin. Aktivitas tetap bisa disimpan dengan review manual.",
      distanceMeters: null,
      radiusMeters,
    };
  }

  const distanceMeters = Math.round(
    haversineDistanceMeters(latitude, longitude, siteLatitude, siteLongitude),
  );

  if (distanceMeters <= radiusMeters) {
    return {
      status: "inside",
      gpsValid: true,
      message: `GPS valid dalam radius site (${distanceMeters}m dari pusat).`,
      distanceMeters,
      radiusMeters,
    };
  }

  return {
    status: "outside",
    gpsValid: false,
    message: `GPS di luar boundary site (${distanceMeters}m / batas ${radiusMeters}m).`,
    distanceMeters,
    radiusMeters,
  };
}
