import { NextResponse } from "next/server";

export async function POST() {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }
    
    // Fallback: If temporary token API is unavailable (e.g. Free Tier limitations), 
    // we return the API Key to be used as the token.
    return NextResponse.json({ token: apiKey });
  } catch (error) {
    console.error("AssemblyAI token route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
