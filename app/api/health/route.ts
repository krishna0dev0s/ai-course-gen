import { NextResponse } from "next/server";
import { db } from "@/config/database";
import { sql } from "drizzle-orm";
import { checkRequiredEnv } from "@/lib/env";

type HealthStatus = "ok" | "degraded";

export async function GET() {
  const startedAt = Date.now();
  const env = checkRequiredEnv();

  let dbReachable = false;
  let dbLatencyMs: number | null = null;

  try {
    const pingStart = Date.now();
    await db.execute(sql`select 1`);
    dbReachable = true;
    dbLatencyMs = Date.now() - pingStart;
  } catch {
    dbReachable = false;
  }

  const status: HealthStatus = env.ok && dbReachable ? "ok" : "degraded";

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      uptimeSec: Math.floor(process.uptime()),
      checks: {
        env: {
          ok: env.ok,
          missing: env.missing,
          optionalMissing: env.optionalMissing,
        },
        database: {
          ok: dbReachable,
          latencyMs: dbLatencyMs,
        },
      },
      responseTimeMs: Date.now() - startedAt,
    },
    {
      status: status === "ok" ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
