import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const { db } = await import("@/db");
        await db.execute(sql`select 1`);

        return Response.json({
            status: "ok",
            database: "connected",
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Health check failed", error);

        return Response.json(
            {
                status: "degraded",
                database: "unreachable",
                timestamp: new Date().toISOString(),
            },
        );
    }
}
