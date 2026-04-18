import { NextRequest, NextResponse } from "next/server";

const EMSIFA_BASE_URL = "https://www.emsifa.com/api-wilayah-indonesia/api";

type RegionLevel = "provinces" | "regencies" | "districts" | "villages";

type RegionOption = {
  id: string;
  name: string;
};

function buildEndpoint(level: RegionLevel, searchParams: URLSearchParams) {
  switch (level) {
    case "provinces":
      return `${EMSIFA_BASE_URL}/provinces.json`;
    case "regencies": {
      const provinceId = searchParams.get("provinceId");
      if (!provinceId) {
        throw new Error("provinceId is required");
      }
      return `${EMSIFA_BASE_URL}/regencies/${provinceId}.json`;
    }
    case "districts": {
      const regencyId = searchParams.get("regencyId");
      if (!regencyId) {
        throw new Error("regencyId is required");
      }
      return `${EMSIFA_BASE_URL}/districts/${regencyId}.json`;
    }
    case "villages": {
      const districtId = searchParams.get("districtId");
      if (!districtId) {
        throw new Error("districtId is required");
      }
      return `${EMSIFA_BASE_URL}/villages/${districtId}.json`;
    }
    default:
      throw new Error("Unsupported level");
  }
}

function normalizeOptions(payload: unknown): RegionOption[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const candidate = item as Record<string, unknown>;
    const id = candidate.id;
    const name = candidate.name;

    if ((typeof id !== "string" && typeof id !== "number") || typeof name !== "string") {
      return [];
    }

    return [{ id: String(id), name }];
  });
}

export async function GET(request: NextRequest) {
  const level = request.nextUrl.searchParams.get("level") as RegionLevel | null;

  if (!level || !["provinces", "regencies", "districts", "villages"].includes(level)) {
    return NextResponse.json({ message: "Invalid region level" }, { status: 400 });
  }

  try {
    const endpoint = buildEndpoint(level, request.nextUrl.searchParams);
    const response = await fetch(endpoint, {
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: "Failed to fetch Indonesia regions" },
        { status: response.status },
      );
    }

    const payload = await response.json();
    return NextResponse.json({ options: normalizeOptions(payload) });
  } catch (error) {
    console.error("Indonesia region proxy error:", error);
    return NextResponse.json(
      { message: "Unable to load Indonesia region options" },
      { status: 500 },
    );
  }
}
