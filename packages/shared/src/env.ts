/**
 * Typed environment variable validation via @t3-oss/env-nextjs.
 * Server-only vars go in `server`, public vars (NEXT_PUBLIC_*) go in `client`.
 *
 * Usage:
 *   import { env } from "@timsan/shared";
 *   env.DATABASE_URL  // typed, validated at startup
 */

import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Server-side environment variables.
   * These are never exposed to the browser.
   */
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // === Database ===
    DATABASE_URL: z.string().url(),

    // === Redis ===
    REDIS_URL: z.string().url(),

    // === Auth ===
    NEXTAUTH_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(1),
    SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),

    // === S3 / MinIO ===
    S3_ENDPOINT: z.string().url(),
    S3_REGION: z.string().min(1),
    S3_BUCKET: z.string().min(1),
    S3_ACCESS_KEY: z.string().min(1),
    S3_SECRET_KEY: z.string().min(1),
    S3_PUBLIC_URL: z.string().url(),

    // === Meilisearch ===
    MEILI_HOST: z.string().url(),
    MEILI_MASTER_KEY: z.string().min(1),

    // === SMTP / Email ===
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    SMTP_USER: z.string().default(""),
    SMTP_PASS: z.string().default(""),
    SMTP_FROM: z.string().min(1),

    // === SMS ===
    SMS_PROVIDER: z.string().default("mobizon"),
    SMS_API_KEY: z.string().default(""),

    // === Shop contacts ===
    SHOP_PHONE: z.string().min(1),
    SHOP_EMAIL: z.string().email(),
    SHOP_INSTAGRAM: z.string().default(""),
    SHOP_LEGAL_NAME: z.string().default(""),
    SHOP_BIN: z.string().default(""),
    SHOP_REQUISITES_TEXT: z.string().default(""),

    // === Owner notifications ===
    OWNER_EMAILS: z.string().min(1),
    TELEGRAM_BOT_TOKEN: z.string().default(""),
    TELEGRAM_CHAT_IDS: z.string().default(""),
    SMS_NOTIFY_ENABLED: z
      .string()
      .transform((v) => v === "true")
      .default("false"),
    SMS_NOTIFY_THRESHOLD_KZT: z.coerce.number().int().nonnegative().default(200000),

    // === Kaspi catalog import ===
    KASPI_CATALOG_FEED_URL: z.string().default(""),
    KASPI_CATALOG_AUTH_HEADER: z.string().default(""),
    KASPI_CATALOG_SYNC_CRON: z.string().default("0 */6 * * *"),

    // === Observability ===
    SENTRY_DSN: z.string().default(""),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default(""),

    // === Rate limiting ===
    RATE_LIMIT_LOGIN: z.string().default("10/min"),
    RATE_LIMIT_WEBHOOK: z.string().default("120/min"),
  },

  /**
   * Client-side environment variables.
   * Must be prefixed with NEXT_PUBLIC_.
   */
  client: {
    NEXT_PUBLIC_SITE_URL: z.string().url(),
    NEXT_PUBLIC_SITE_NAME: z.string().min(1),
  },

  /**
   * Destructure all variables from process.env to make them available.
   * This is required by @t3-oss/env-nextjs.
   */
  runtimeEnv: {
    NODE_ENV: process.env["NODE_ENV"],
    NEXT_PUBLIC_SITE_URL: process.env["NEXT_PUBLIC_SITE_URL"],
    NEXT_PUBLIC_SITE_NAME: process.env["NEXT_PUBLIC_SITE_NAME"],
    DATABASE_URL: process.env["DATABASE_URL"],
    REDIS_URL: process.env["REDIS_URL"],
    NEXTAUTH_URL: process.env["NEXTAUTH_URL"],
    NEXTAUTH_SECRET: process.env["NEXTAUTH_SECRET"],
    SESSION_TTL_DAYS: process.env["SESSION_TTL_DAYS"],
    S3_ENDPOINT: process.env["S3_ENDPOINT"],
    S3_REGION: process.env["S3_REGION"],
    S3_BUCKET: process.env["S3_BUCKET"],
    S3_ACCESS_KEY: process.env["S3_ACCESS_KEY"],
    S3_SECRET_KEY: process.env["S3_SECRET_KEY"],
    S3_PUBLIC_URL: process.env["S3_PUBLIC_URL"],
    MEILI_HOST: process.env["MEILI_HOST"],
    MEILI_MASTER_KEY: process.env["MEILI_MASTER_KEY"],
    SMTP_HOST: process.env["SMTP_HOST"],
    SMTP_PORT: process.env["SMTP_PORT"],
    SMTP_USER: process.env["SMTP_USER"],
    SMTP_PASS: process.env["SMTP_PASS"],
    SMTP_FROM: process.env["SMTP_FROM"],
    SMS_PROVIDER: process.env["SMS_PROVIDER"],
    SMS_API_KEY: process.env["SMS_API_KEY"],
    SHOP_PHONE: process.env["SHOP_PHONE"],
    SHOP_EMAIL: process.env["SHOP_EMAIL"],
    SHOP_INSTAGRAM: process.env["SHOP_INSTAGRAM"],
    SHOP_LEGAL_NAME: process.env["SHOP_LEGAL_NAME"],
    SHOP_BIN: process.env["SHOP_BIN"],
    SHOP_REQUISITES_TEXT: process.env["SHOP_REQUISITES_TEXT"],
    OWNER_EMAILS: process.env["OWNER_EMAILS"],
    TELEGRAM_BOT_TOKEN: process.env["TELEGRAM_BOT_TOKEN"],
    TELEGRAM_CHAT_IDS: process.env["TELEGRAM_CHAT_IDS"],
    SMS_NOTIFY_ENABLED: process.env["SMS_NOTIFY_ENABLED"],
    SMS_NOTIFY_THRESHOLD_KZT: process.env["SMS_NOTIFY_THRESHOLD_KZT"],
    KASPI_CATALOG_FEED_URL: process.env["KASPI_CATALOG_FEED_URL"],
    KASPI_CATALOG_AUTH_HEADER: process.env["KASPI_CATALOG_AUTH_HEADER"],
    KASPI_CATALOG_SYNC_CRON: process.env["KASPI_CATALOG_SYNC_CRON"],
    SENTRY_DSN: process.env["SENTRY_DSN"],
    OTEL_EXPORTER_OTLP_ENDPOINT: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
    RATE_LIMIT_LOGIN: process.env["RATE_LIMIT_LOGIN"],
    RATE_LIMIT_WEBHOOK: process.env["RATE_LIMIT_WEBHOOK"],
  },

  /**
   * Skip validation in test environments or when explicitly disabled.
   */
  skipValidation:
    process.env["SKIP_ENV_VALIDATION"] === "true" ||
    process.env["NODE_ENV"] === "test",
});
