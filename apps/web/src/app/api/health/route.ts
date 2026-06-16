/**
 * GET /api/health
 * Health check endpoint — verifies PostgreSQL and Redis connectivity.
 * Used by docker-compose healthchecks and monitoring systems.
 */
import { Redis } from "ioredis";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface HealthStatus {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  services: {
    postgres: "ok" | "error";
    redis: "ok" | "error";
  };
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const timestamp = new Date().toISOString();
  const services: HealthStatus["services"] = {
    postgres: "error",
    redis: "error",
  };

  // ── Check PostgreSQL ───────────────────────────────────────────────────────
  try {
    const { prisma } = await import("@timsan/db");
    await prisma.$queryRaw`SELECT 1`;
    services.postgres = "ok";
  } catch {
    // postgres remains "error"
  }

  // ── Check Redis ────────────────────────────────────────────────────────────
  try {
    const redis = new Redis(process.env["REDIS_URL"] ?? "redis://localhost:6379", {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
    await redis.ping();
    await redis.quit();
    services.redis = "ok";
  } catch {
    // redis remains "error"
  }

  const allOk = services.postgres === "ok" && services.redis === "ok";
  const anyOk = services.postgres === "ok" || services.redis === "ok";

  const status: HealthStatus["status"] = allOk ? "ok" : anyOk ? "degraded" : "error";

  const httpStatus = allOk ? 200 : anyOk ? 207 : 503;

  return NextResponse.json({ status, timestamp, services }, { status: httpStatus });
}
