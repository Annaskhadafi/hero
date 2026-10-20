import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-session";
import { getMaestroServerSession } from "@/lib/maestro-session";
import { uploadFile } from "@/app/actions/upload";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    const maestroSession = !session?.user?.email ? await getMaestroServerSession() : null;

    if (!session?.user?.email && !maestroSession?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: "Berkas tidak ditemukan." }, { status: 400 });
    }

    const result = await uploadFile(formData);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[api/uploads/document] Upload error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Gagal mengunggah berkas." },
      { status: 500 }
    );
  }
}
