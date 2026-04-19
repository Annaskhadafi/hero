import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import { getMobileReports } from "@/lib/mobile-data";

export async function GET() {
  const session = await getServerSession();
  const email = session?.user?.email?.trim();

  if (!email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const data = await getMobileReports(email);
  if (!data) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
